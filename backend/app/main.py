import os
import sys
from pathlib import Path

# Ensure backend directory is in sys.path when invoked by Vercel or from monorepo root
_backend_dir = str(Path(__file__).resolve().parent.parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

import asyncio
from datetime import date, datetime, timedelta, timezone
from typing import Dict, List, Optional
import logging
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from dateutil import parser as dt_parser

from app.core.config import settings
from app.models.schemas import (
    DataQualitySummary,
    HealthResponse,
    InsightsResponse,
    IntervalRecord,
    RecordsResponse,
    SummaryMetrics,
    SummaryResponse,
    TimeseriesPoint,
    TimeseriesResponse,
    VintageInspectionResponse,
    VintageRecord,
)
from app.services.accuracy_engine import AccuracyEngine
from app.services.elexon_client import elexon_client
from app.services.insights_engine import InsightsEngine

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("windsight")

app = FastAPI(
    title=f"{settings.APP_NAME} API",
    description=(
        f"**{settings.PRODUCT_DESCRIPTOR}**\n\n"
        f"*{settings.TAGLINE}*\n\n"
        "Analytical decision-support API for UK day-ahead wind power purchasing intelligence. "
        "Evaluates Elexon WINDFOR forecasts against actual generation from FUELHH."
    ),
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory memoization cache for pipeline runs to guarantee sub-millisecond response times
_ANALYSIS_CACHE: Dict[str, dict] = {}
_PIPELINE_LOCK = None

def get_pipeline_lock():
    global _PIPELINE_LOCK
    if _PIPELINE_LOCK is None:
        _PIPELINE_LOCK = asyncio.Lock()
    return _PIPELINE_LOCK

@app.on_event("startup")
async def startup_prewarm():
    """Pre-warms Elexon data and runs initial analysis in memory for instant responses."""
    try:
        logger.info("Pre-warming WindSight analysis pipeline for January 2026...")
        await run_pipeline(
            settings.DEFAULT_DECISION_START,
            settings.DEFAULT_DECISION_END,
            settings.DEFAULT_CUTOFF_TIME,
            settings.DEFAULT_MAPPING_POLICY
        )
        logger.info("Pipeline pre-warmed successfully. Sub-millisecond latency ready.")
    except Exception as e:
        logger.warning(f"Startup pre-warming non-critical error: {e}")

def get_cache_key(d_from: str, d_to: str, cutoff: str, policy: str) -> str:
    return f"{d_from}|{d_to}|{cutoff}|{policy}"

async def run_pipeline(
    d_from_str: str,
    d_to_str: str,
    cutoff_time: str,
    mapping_policy: str,
    force_live: bool = False
):
    key = get_cache_key(d_from_str, d_to_str, cutoff_time, mapping_policy)
    if not force_live and key in _ANALYSIS_CACHE:
        return _ANALYSIS_CACHE[key]

    lock = get_pipeline_lock()
    async with lock:
        # Check again under lock in case another request already calculated it
        if not force_live and key in _ANALYSIS_CACHE:
            return _ANALYSIS_CACHE[key]

    try:
        d_from = dt_parser.parse(d_from_str).date()
        d_to = dt_parser.parse(d_to_str).date()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {e}")

    if d_from > d_to:
        raise HTTPException(status_code=400, detail="decision_date_from must be <= decision_date_to")

    # Target delivery starts at d_from + 1 day and ends at d_to + 1 day
    deliv_from = d_from + timedelta(days=1)
    deliv_to = d_to + timedelta(days=1)

    # 1. Fetch FUELHH WIND actuals
    fuel_records, fuel_status = await elexon_client.fetch_fuelhh_wind(
        settlement_date_from=deliv_from.isoformat(),
        settlement_date_to=(deliv_to + timedelta(days=1)).isoformat(),
        force_live=force_live
    )

    # 2. Fetch WINDFOR forecasts
    # Forecasts can be published prior to d_from, so buffer by 2 days
    fc_pub_from = (d_from - timedelta(days=2)).isoformat() + "T00:00:00Z"
    fc_pub_to = (d_to + timedelta(days=1)).isoformat() + "T23:59:59Z"
    windfor_records, windfor_status = await elexon_client.fetch_windfor(
        publish_time_from=fc_pub_from,
        publish_time_to=fc_pub_to,
        force_live=force_live
    )

    data_source_status = "live" if (fuel_status == "live" and windfor_status == "live") else "cached"

    # 3. Run Accuracy Engine
    engine = AccuracyEngine(cutoff_time=cutoff_time, mapping_policy=mapping_policy)
    records, summary, data_quality, vintages_map = engine.run_analysis(
        decision_date_start=d_from,
        decision_date_end=d_to,
        raw_fuels=fuel_records,
        raw_forecasts=windfor_records,
        data_source_status=data_source_status,
        retrieval_timestamp=elexon_client.last_retrieval_timestamp
    )

    # 4. Generate Insights
    insights = InsightsEngine.generate_insights(records, summary)

    result = {
        "records": records,
        "summary": summary,
        "data_quality": data_quality,
        "insights": insights,
        "vintages_map": vintages_map,
        "d_from": d_from_str,
        "d_to": d_to_str,
        "deliv_from": deliv_from.isoformat(),
        "deliv_to": deliv_to.isoformat(),
        "cutoff_time": cutoff_time,
        "mapping_policy": mapping_policy,
        "data_source_status": data_source_status,
        "retrieval_timestamp": elexon_client.last_retrieval_timestamp
    }
    _ANALYSIS_CACHE[key] = result
    return result

@app.get("/api/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Returns application health status and Elexon integration diagnostic status."""
    has_fuel_cache = elexon_client.fuelhh_cache_file.exists()
    has_wind_cache = elexon_client.windfor_cache_file.exists()
    return HealthResponse(
        status="healthy",
        appName=settings.APP_NAME,
        version=settings.VERSION,
        dataSourceStatus=elexon_client.last_fetch_status,
        cachedRecordsAvailable=(has_fuel_cache and has_wind_cache),
        elexonEndpointConfigured=settings.ELEXON_BASE_URL
    )

@app.get("/api/analysis/summary", response_model=SummaryResponse, tags=["Analysis"])
async def get_analysis_summary(
    decision_date_from: str = Query(settings.DEFAULT_DECISION_START, description="Purchasing decision start date (YYYY-MM-DD)"),
    decision_date_to: str = Query(settings.DEFAULT_DECISION_END, description="Purchasing decision end date (YYYY-MM-DD)"),
    cutoff_time: str = Query(settings.DEFAULT_CUTOFF_TIME, description="Day-ahead cutoff time in UTC (HH:MM:SS)"),
    mapping_policy: str = Query(settings.DEFAULT_MAPPING_POLICY, description="'hourly_block' or 'exact'")
):
    """
    Returns high-level summary KPIs (MAE, MAPE, Forecast Bias, RMSE, Match Rate)
    and data quality indicators for the specified decision period.
    """
    pipeline = await run_pipeline(decision_date_from, decision_date_to, cutoff_time, mapping_policy)
    return SummaryResponse(
        analysisPeriod=f"Decisions {pipeline['d_from']} to {pipeline['d_to']} (Delivery {pipeline['deliv_from']} to {pipeline['deliv_to']})",
        decisionDateRange={"from": pipeline['d_from'], "to": pipeline['d_to']},
        deliveryDateRange={"from": pipeline['deliv_from'], "to": pipeline['deliv_to']},
        cutoffTimeUtc=pipeline['cutoff_time'],
        mappingPolicy=pipeline['mapping_policy'],
        metrics=pipeline["summary"],
        dataQuality=pipeline["data_quality"]
    )

@app.get("/api/analysis/timeseries", response_model=TimeseriesResponse, tags=["Analysis"])
async def get_analysis_timeseries(
    decision_date_from: str = Query(settings.DEFAULT_DECISION_START),
    decision_date_to: str = Query(settings.DEFAULT_DECISION_END),
    cutoff_time: str = Query(settings.DEFAULT_CUTOFF_TIME),
    mapping_policy: str = Query(settings.DEFAULT_MAPPING_POLICY)
):
    """
    Returns time-series intervals for charting forecast vs actual generation,
    signed error, and percentage error over time.
    """
    pipeline = await run_pipeline(decision_date_from, decision_date_to, cutoff_time, mapping_policy)
    points = [
        TimeseriesPoint(
            targetStartTime=r.targetStartTime,
            targetEndTime=r.targetEndTime,
            settlementDate=r.settlementDate,
            settlementPeriod=r.settlementPeriod,
            decisionDate=r.decisionDate,
            actualGeneration=r.actualGeneration,
            forecastGeneration=r.forecastGeneration,
            signedError=r.signedError,
            absoluteError=r.absoluteError,
            absolutePercentageError=r.absolutePercentageError,
            matchStatus=r.matchStatus
        )
        for r in pipeline["records"]
    ]
    return TimeseriesResponse(
        analysisPeriod=f"Decisions {pipeline['d_from']} to {pipeline['d_to']}",
        decisionDateRange={"from": pipeline['d_from'], "to": pipeline['d_to']},
        deliveryDateRange={"from": pipeline['deliv_from'], "to": pipeline['deliv_to']},
        cutoffTimeUtc=pipeline['cutoff_time'],
        mappingPolicy=pipeline['mapping_policy'],
        points=points
    )

@app.get("/api/analysis/records", response_model=RecordsResponse, tags=["Analysis"])
async def get_analysis_records(
    decision_date_from: str = Query(settings.DEFAULT_DECISION_START),
    decision_date_to: str = Query(settings.DEFAULT_DECISION_END),
    cutoff_time: str = Query(settings.DEFAULT_CUTOFF_TIME),
    mapping_policy: str = Query(settings.DEFAULT_MAPPING_POLICY),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    sort_by: str = Query("targetStartTime"),
    sort_order: str = Query("asc"),
    status: Optional[str] = Query(None)
):
    """
    Returns paginated, filterable, and sortable interval records with forecast selection rationale.
    """
    pipeline = await run_pipeline(decision_date_from, decision_date_to, cutoff_time, mapping_policy)
    records: List[IntervalRecord] = pipeline["records"]

    if status:
        records = [r for r in records if r.matchStatus == status]

    reverse = (sort_order.lower() == "desc")
    def get_sort_val(r: IntervalRecord):
        v = getattr(r, sort_by, None)
        return v if v is not None else -999999

    try:
        records.sort(key=get_sort_val, reverse=reverse)
    except Exception:
        pass

    total = len(records)
    total_pages = max(1, (total + page_size - 1) // page_size)
    start_idx = (page - 1) * page_size
    page_records = records[start_idx : start_idx + page_size]

    return RecordsResponse(
        total=total,
        page=page,
        pageSize=page_size,
        totalPages=total_pages,
        records=page_records
    )

@app.get("/api/analysis/insights", response_model=InsightsResponse, tags=["Analysis"])
async def get_analysis_insights(
    decision_date_from: str = Query(settings.DEFAULT_DECISION_START),
    decision_date_to: str = Query(settings.DEFAULT_DECISION_END),
    cutoff_time: str = Query(settings.DEFAULT_CUTOFF_TIME),
    mapping_policy: str = Query(settings.DEFAULT_MAPPING_POLICY)
):
    """
    Returns derived analytical insights from processed data (bias tendency, peak error events, diurnal profile).
    """
    pipeline = await run_pipeline(decision_date_from, decision_date_to, cutoff_time, mapping_policy)
    return pipeline["insights"]

@app.get("/api/analysis/data-quality", response_model=DataQualitySummary, tags=["Analysis"])
async def get_data_quality(
    decision_date_from: str = Query(settings.DEFAULT_DECISION_START),
    decision_date_to: str = Query(settings.DEFAULT_DECISION_END),
    cutoff_time: str = Query(settings.DEFAULT_CUTOFF_TIME),
    mapping_policy: str = Query(settings.DEFAULT_MAPPING_POLICY)
):
    """
    Returns detailed data quality diagnostics (records retrieved, missing counts, duplicate handling, match rate).
    """
    pipeline = await run_pipeline(decision_date_from, decision_date_to, cutoff_time, mapping_policy)
    return pipeline["data_quality"]

@app.get("/api/analysis/vintages", response_model=VintageInspectionResponse, tags=["Audit"])
async def inspect_vintages(
    target_start_time: str = Query(..., description="Target delivery interval start time (ISO 8601 UTC)"),
    decision_date_from: str = Query(settings.DEFAULT_DECISION_START),
    decision_date_to: str = Query(settings.DEFAULT_DECISION_END),
    cutoff_time: str = Query(settings.DEFAULT_CUTOFF_TIME),
    mapping_policy: str = Query(settings.DEFAULT_MAPPING_POLICY)
):
    """
    Audits all candidate forecast vintages for a specific delivery interval.
    Shows which vintage was selected, which were rejected, and why.
    """
    pipeline = await run_pipeline(decision_date_from, decision_date_to, cutoff_time, mapping_policy)
    vintages_map = pipeline["vintages_map"]
    all_vintages = vintages_map.get(target_start_time, [])

    selected = next((v for v in all_vintages if v.get("isSelected")), None)
    selected_record = VintageRecord(**selected) if selected else None
    vintage_records = [VintageRecord(**v) for v in all_vintages]

    # Find interval record for decision date
    rec = next((r for r in pipeline["records"] if r.targetStartTime == target_start_time), None)
    d_date = rec.decisionDate if rec else "Unknown"
    rationale = rec.selectionRationale if rec else "Target interval not found in current analysis"

    return VintageInspectionResponse(
        decisionDate=d_date,
        targetStartTime=target_start_time,
        cutoffTimeUtc=cutoff_time,
        selectedVintage=selected_record,
        allVintages=vintage_records,
        rationale=rationale
    )

@app.post("/api/analysis/refresh", tags=["Admin"])
async def refresh_live_data():
    """Forces a live re-fetch of FUELHH and WINDFOR data from Elexon BMRS API and clears in-memory cache."""
    _ANALYSIS_CACHE.clear()
    fuel_records, f_status = await elexon_client.fetch_fuelhh_wind(force_live=True)
    wind_records, w_status = await elexon_client.fetch_windfor(force_live=True)
    return {
        "status": "refreshed",
        "fuelhhStatus": f_status,
        "windforStatus": w_status,
        "fuelhhCount": len(fuel_records),
        "windforCount": len(wind_records),
        "timestamp": elexon_client.last_retrieval_timestamp
    }
