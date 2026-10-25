import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["appName"] == "WindSight"
    assert "elexonEndpointConfigured" in data

def test_analysis_summary_january_2026():
    resp = client.get("/api/analysis/summary?decision_date_from=2026-01-01&decision_date_to=2026-01-05")
    assert resp.status_code == 200
    data = resp.json()
    assert "metrics" in data
    assert "dataQuality" in data
    metrics = data["metrics"]
    assert metrics["matchedIntervals"] > 0
    assert metrics["mae"] is not None
    assert metrics["mape"] is not None
    assert metrics["unit"] == "MW"
    assert data["dataQuality"]["matchRate"] > 0

def test_timeseries_endpoint():
    resp = client.get("/api/analysis/timeseries?decision_date_from=2026-01-01&decision_date_to=2026-01-02")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["points"]) == 96  # 2 days x 48 settlement periods
    p0 = data["points"][0]
    assert "targetStartTime" in p0
    assert "actualGeneration" in p0
    assert "forecastGeneration" in p0

def test_records_pagination_and_sorting():
    resp = client.get("/api/analysis/records?decision_date_from=2026-01-01&decision_date_to=2026-01-02&page=1&page_size=10&sort_by=actualGeneration&sort_order=desc")
    assert resp.status_code == 200
    data = resp.json()
    assert data["page"] == 1
    assert data["pageSize"] == 10
    assert len(data["records"]) == 10
    # Ensure descending order
    gens = [r["actualGeneration"] for r in data["records"] if r["actualGeneration"] is not None]
    assert gens == sorted(gens, reverse=True)

def test_insights_endpoint():
    resp = client.get("/api/analysis/insights?decision_date_from=2026-01-01&decision_date_to=2026-01-07")
    assert resp.status_code == 200
    data = resp.json()
    assert "insights" in data
    assert len(data["insights"]) > 0
    assert "peakErrorDays" in data
    assert "diurnalProfile" in data

def test_data_quality_endpoint():
    resp = client.get("/api/analysis/data-quality?decision_date_from=2026-01-01&decision_date_to=2026-01-03")
    assert resp.status_code == 200
    data = resp.json()
    assert data["actualRecordsRetrieved"] > 0
    assert data["forecastRecordsRetrieved"] > 0
    assert "denominator" in data

def test_vintage_audit_inspection():
    target = "2026-01-02T12:00:00Z"
    resp = client.get(f"/api/analysis/vintages?target_start_time={target}&decision_date_from=2026-01-01&decision_date_to=2026-01-03")
    assert resp.status_code == 200
    data = resp.json()
    assert data["targetStartTime"] == target
    assert data["decisionDate"] == "2026-01-01"
    assert "allVintages" in data
    assert len(data["allVintages"]) > 0
    assert data["selectedVintage"] is not None

def test_invalid_date_range_validation():
    # from > to should return 400
    resp = client.get("/api/analysis/summary?decision_date_from=2026-01-10&decision_date_to=2026-01-05")
    assert resp.status_code == 400
