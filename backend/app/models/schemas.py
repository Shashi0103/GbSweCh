from typing import List, Optional
from pydantic import BaseModel, Field

class VintageRecord(BaseModel):
    publishTime: str
    generation: float
    isEligible: bool
    rejectionReason: Optional[str] = None
    isSelected: bool = False

class VintageInspectionResponse(BaseModel):
    decisionDate: str
    targetStartTime: str
    cutoffTimeUtc: str
    selectedVintage: Optional[VintageRecord] = None
    allVintages: List[VintageRecord] = []
    rationale: str

class IntervalRecord(BaseModel):
    decisionDate: str = Field(..., description="Day-ahead purchasing decision date (YYYY-MM-DD)")
    targetStartTime: str = Field(..., description="Delivery interval start time (ISO 8601 UTC)")
    targetEndTime: str = Field(..., description="Delivery interval end time (ISO 8601 UTC)")
    settlementDate: str = Field(..., description="Settlement date for delivery (YYYY-MM-DD)")
    settlementPeriod: int = Field(..., description="UK settlement period (1 to 48)")
    forecastPublishTime: Optional[str] = Field(None, description="Publish time of selected forecast (ISO 8601 UTC)")
    forecastGeneration: Optional[float] = Field(None, description="Selected forecast generation in MW")
    actualGeneration: Optional[float] = Field(None, description="Actual wind generation from FUELHH in MW")
    signedError: Optional[float] = Field(None, description="Actual minus Forecast generation (MW). Negative indicates overforecasting, positive indicates underforecasting.")
    absoluteError: Optional[float] = Field(None, description="Absolute difference |Actual - Forecast| (MW)")
    absolutePercentageError: Optional[float] = Field(None, description="Absolute percentage error: 100 * |Actual - Forecast| / Actual. Null if actual is zero or missing.")
    biasContribution: Optional[float] = Field(None, description="Forecast minus Actual generation (MW). Positive indicates overforecasting, negative indicates underforecasting.")
    matchStatus: str = Field(..., description="'matched', 'missing_forecast', 'missing_actual', or 'invalid'")
    selectionRationale: str = Field(..., description="Auditable reasoning for forecast vintage selection or rejection")

class SummaryMetrics(BaseModel):
    totalTargetIntervals: int = Field(..., description="Total target delivery intervals in the evaluated period")
    matchedIntervals: int = Field(..., description="Number of intervals with both valid actual and eligible forecast")
    missingForecastIntervals: int = Field(..., description="Intervals without an eligible forecast published prior to cutoff")
    missingActualIntervals: int = Field(..., description="Intervals without valid actual wind generation")
    matchRatePercent: float = Field(..., description="Matched intervals divided by total expected intervals (%)")
    mae: Optional[float] = Field(None, description="Mean Absolute Error in MW: mean(|Actual - Forecast|)")
    mape: Optional[float] = Field(None, description="Mean Absolute Percentage Error (%): mean(100 * |Actual - Forecast| / Actual) across non-zero actuals")
    zeroActualExclusions: int = Field(..., description="Number of matched intervals excluded from MAPE due to zero actual generation")
    bias: Optional[float] = Field(None, description="Forecast Bias in MW: mean(Forecast - Actual). Positive means overforecasting, negative means underforecasting.")
    rmse: Optional[float] = Field(None, description="Root Mean Square Error in MW: sqrt(mean((Actual - Forecast)^2))")
    meanActualGeneration: Optional[float] = Field(None, description="Mean actual wind generation in MW across matched intervals")
    meanForecastGeneration: Optional[float] = Field(None, description="Mean forecast generation in MW across matched intervals")
    unit: str = Field("MW", description="Generation unit (Megawatts)")

class TimeseriesPoint(BaseModel):
    targetStartTime: str
    targetEndTime: str
    settlementDate: str
    settlementPeriod: int
    decisionDate: str
    actualGeneration: Optional[float] = None
    forecastGeneration: Optional[float] = None
    signedError: Optional[float] = None
    absoluteError: Optional[float] = None
    absolutePercentageError: Optional[float] = None
    matchStatus: str

class TimeseriesResponse(BaseModel):
    analysisPeriod: str
    decisionDateRange: dict
    deliveryDateRange: dict
    cutoffTimeUtc: str
    mappingPolicy: str
    points: List[TimeseriesPoint]

class DataQualitySummary(BaseModel):
    actualRecordsRetrieved: int = Field(..., description="Total FUELHH wind records retrieved from Elexon")
    forecastRecordsRetrieved: int = Field(..., description="Total WINDFOR forecast records retrieved from Elexon")
    matchedIntervals: int = Field(..., description="Target delivery intervals successfully matched with both actual and eligible forecast")
    missingActualObservations: int = Field(..., description="Intervals missing actual generation")
    intervalsWithoutEligibleForecasts: int = Field(..., description="Intervals with no forecast published prior to decision cutoff")
    duplicateRecordsHandled: int = Field(..., description="Number of duplicate records deduplicated deterministically")
    invalidRecordsHandled: int = Field(..., description="Number of records discarded due to invalid/corrupt data")
    matchRate: float = Field(..., description="Percentage of target intervals matched (%)")
    denominator: str = Field(..., description="Explanation of the match rate denominator")
    dataRetrievalStatus: str = Field(..., description="'live' or 'cached'")
    retrievalTimestamp: str = Field(..., description="Timestamp of data acquisition (ISO 8601 UTC)")
    cutoffTimeUtc: str = Field(..., description="Day-ahead decision cutoff time (UTC)")
    mappingPolicy: str = Field(..., description="Forecast resolution mapping policy ('hourly_block' or 'exact')")

class InsightItem(BaseModel):
    type: str = Field(..., description="'bias', 'peak_error', 'diurnal', or 'coverage'")
    title: str = Field(..., description="Clear insight heading")
    summary: str = Field(..., description="Derived analytical insight based on verified data")
    severity: str = Field("info", description="'info', 'warning', or 'positive'")
    detail: Optional[str] = None

class InsightsResponse(BaseModel):
    insights: List[InsightItem]
    peakErrorDays: List[dict]
    diurnalProfile: List[dict]

class RecordsResponse(BaseModel):
    total: int
    page: int
    pageSize: int
    totalPages: int
    records: List[IntervalRecord]

class SummaryResponse(BaseModel):
    analysisPeriod: str
    decisionDateRange: dict
    deliveryDateRange: dict
    cutoffTimeUtc: str
    mappingPolicy: str
    metrics: SummaryMetrics
    dataQuality: DataQualitySummary

class HealthResponse(BaseModel):
    status: str
    appName: str
    version: str
    dataSourceStatus: str
    cachedRecordsAvailable: bool
    elexonEndpointConfigured: str
