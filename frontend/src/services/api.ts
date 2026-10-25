import axios from 'axios';
import {
  FilterState,
  InsightsResponse,
  RecordsResponse,
  SummaryResponse,
  TimeseriesResponse,
  VintageInspectionResponse,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

export const fetchSummary = async (filters: FilterState): Promise<SummaryResponse> => {
  const resp = await apiClient.get<SummaryResponse>('/api/analysis/summary', {
    params: {
      decision_date_from: filters.decisionDateFrom,
      decision_date_to: filters.decisionDateTo,
      cutoff_time: filters.cutoffTime,
      mapping_policy: filters.mappingPolicy,
    },
  });
  return resp.data;
};

export const fetchTimeseries = async (filters: FilterState): Promise<TimeseriesResponse> => {
  const resp = await apiClient.get<TimeseriesResponse>('/api/analysis/timeseries', {
    params: {
      decision_date_from: filters.decisionDateFrom,
      decision_date_to: filters.decisionDateTo,
      cutoff_time: filters.cutoffTime,
      mapping_policy: filters.mappingPolicy,
    },
  });
  return resp.data;
};

export const fetchRecords = async (
  filters: FilterState,
  page: number = 1,
  pageSize: number = 50,
  sortBy: string = 'targetStartTime',
  sortOrder: string = 'asc',
  status?: string
): Promise<RecordsResponse> => {
  const resp = await apiClient.get<RecordsResponse>('/api/analysis/records', {
    params: {
      decision_date_from: filters.decisionDateFrom,
      decision_date_to: filters.decisionDateTo,
      cutoff_time: filters.cutoffTime,
      mapping_policy: filters.mappingPolicy,
      page,
      page_size: pageSize,
      sort_by: sortBy,
      sort_order: sortOrder,
      status: status || undefined,
    },
  });
  return resp.data;
};

export const fetchInsights = async (filters: FilterState): Promise<InsightsResponse> => {
  const resp = await apiClient.get<InsightsResponse>('/api/analysis/insights', {
    params: {
      decision_date_from: filters.decisionDateFrom,
      decision_date_to: filters.decisionDateTo,
      cutoff_time: filters.cutoffTime,
      mapping_policy: filters.mappingPolicy,
    },
  });
  return resp.data;
};

export const fetchVintageInspection = async (
  targetStartTime: string,
  filters: FilterState
): Promise<VintageInspectionResponse> => {
  const resp = await apiClient.get<VintageInspectionResponse>('/api/analysis/vintages', {
    params: {
      target_start_time: targetStartTime,
      decision_date_from: filters.decisionDateFrom,
      decision_date_to: filters.decisionDateTo,
      cutoff_time: filters.cutoffTime,
      mapping_policy: filters.mappingPolicy,
    },
  });
  return resp.data;
};

export const refreshLiveData = async (): Promise<any> => {
  const resp = await apiClient.post('/api/analysis/refresh');
  return resp.data;
};
