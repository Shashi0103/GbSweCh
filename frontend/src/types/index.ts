export interface SummaryMetrics {
  totalTargetIntervals: number;
  matchedIntervals: number;
  missingForecastIntervals: number;
  missingActualIntervals: number;
  matchRatePercent: number;
  mae: number | null;
  mape: number | null;
  zeroActualExclusions: number;
  bias: number | null;
  rmse: number | null;
  meanActualGeneration: number | null;
  meanForecastGeneration: number | null;
  unit: string;
}

export interface DataQualitySummary {
  actualRecordsRetrieved: number;
  forecastRecordsRetrieved: number;
  matchedIntervals: number;
  missingActualObservations: number;
  intervalsWithoutEligibleForecasts: number;
  duplicateRecordsHandled: number;
  invalidRecordsHandled: number;
  matchRate: number;
  denominator: string;
  dataRetrievalStatus: string;
  retrievalTimestamp: string;
  cutoffTimeUtc: string;
  mappingPolicy: string;
}

export interface SummaryResponse {
  analysisPeriod: string;
  decisionDateRange: { from: string; to: string };
  deliveryDateRange: { from: string; to: string };
  cutoffTimeUtc: string;
  mappingPolicy: string;
  metrics: SummaryMetrics;
  dataQuality: DataQualitySummary;
}

export interface TimeseriesPoint {
  targetStartTime: string;
  targetEndTime: string;
  settlementDate: string;
  settlementPeriod: number;
  decisionDate: string;
  actualGeneration: number | null;
  forecastGeneration: number | null;
  signedError: number | null;
  absoluteError: number | null;
  absolutePercentageError: number | null;
  matchStatus: string;
}

export interface TimeseriesResponse {
  analysisPeriod: string;
  decisionDateRange: { from: string; to: string };
  deliveryDateRange: { from: string; to: string };
  cutoffTimeUtc: string;
  mappingPolicy: string;
  points: TimeseriesPoint[];
}

export interface IntervalRecord {
  decisionDate: string;
  targetStartTime: string;
  targetEndTime: string;
  settlementDate: string;
  settlementPeriod: number;
  forecastPublishTime: string | null;
  forecastGeneration: number | null;
  actualGeneration: number | null;
  signedError: number | null;
  absoluteError: number | null;
  absolutePercentageError: number | null;
  biasContribution: number | null;
  matchStatus: string;
  selectionRationale: string;
}

export interface RecordsResponse {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  records: IntervalRecord[];
}

export interface InsightItem {
  type: 'bias' | 'peak_error' | 'diurnal' | 'coverage';
  title: string;
  summary: string;
  severity: 'info' | 'warning' | 'positive';
  detail?: string;
}

export interface InsightsResponse {
  insights: InsightItem[];
  peakErrorDays: Array<{
    settlementDate: string;
    mae: number;
    count: number;
  }>;
  diurnalProfile: Array<{
    hour: number;
    hourLabel: string;
    mae: number;
    count: number;
  }>;
}

export interface VintageRecord {
  publishTime: string;
  generation: number;
  isEligible: boolean;
  rejectionReason: string | null;
  isSelected: boolean;
}

export interface VintageInspectionResponse {
  decisionDate: string;
  targetStartTime: string;
  cutoffTimeUtc: string;
  selectedVintage: VintageRecord | null;
  allVintages: VintageRecord[];
  rationale: string;
}

export interface FilterState {
  decisionDateFrom: string;
  decisionDateTo: string;
  cutoffTime: string;
  mappingPolicy: string;
}
