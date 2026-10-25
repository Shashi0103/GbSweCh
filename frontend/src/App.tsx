import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { SummaryMetrics } from './components/SummaryMetrics';
import { InsightsPanel } from './components/InsightsPanel';
import { ForecastChart } from './components/ForecastChart';
import { ErrorChart } from './components/ErrorChart';
import { DataTable } from './components/DataTable';
import { VintageAuditModal } from './components/VintageAuditModal';
import { DataQualityModal } from './components/DataQualityModal';
import {
  FilterState,
  InsightsResponse,
  RecordsResponse,
  SummaryResponse,
  TimeseriesResponse,
} from './types';
import {
  fetchInsights,
  fetchRecords,
  fetchSummary,
  fetchTimeseries,
  refreshLiveData,
} from './services/api';
import { AlertCircle, Wind } from 'lucide-react';

export const App: React.FC = () => {
  // Global Filter State
  const [filters, setFilters] = useState<FilterState>({
    decisionDateFrom: '2026-01-01',
    decisionDateTo: '2026-01-31',
    cutoffTime: '12:00:00',
    mappingPolicy: 'hourly_block',
  });

  // Data States
  const [summaryData, setSummaryData] = useState<SummaryResponse | null>(null);
  const [timeseriesData, setTimeseriesData] = useState<TimeseriesResponse | null>(null);
  const [insightsData, setInsightsData] = useState<InsightsResponse | null>(null);
  const [recordsData, setRecordsData] = useState<RecordsResponse | null>(null);

  // Table pagination and sorting states
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [sortBy, setSortBy] = useState<string>('targetStartTime');
  const [sortOrder, setSortOrder] = useState<string>('asc');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  // Modal States
  const [auditTargetStartTime, setAuditTargetStartTime] = useState<string | null>(null);
  const [isDataQualityOpen, setIsDataQualityOpen] = useState<boolean>(false);

  // Loading and Error States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTableLoading, setIsTableLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch summary, timeseries, and insights when filters change
  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [sumRes, tsRes, insRes] = await Promise.all([
        fetchSummary(filters),
        fetchTimeseries(filters),
        fetchInsights(filters),
      ]);
      setSummaryData(sumRes);
      setTimeseriesData(tsRes);
      setInsightsData(insRes);
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setErrorMessage(
        err.response?.data?.detail || err.message || 'Unable to connect to WindSight backend.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Fetch paginated table records
  const loadRecordsData = useCallback(async () => {
    setIsTableLoading(true);
    try {
      const res = await fetchRecords(filters, page, pageSize, sortBy, sortOrder, statusFilter);
      setRecordsData(res);
    } catch (err: any) {
      console.error('Failed to load table records:', err);
    } finally {
      setIsTableLoading(false);
    }
  }, [filters, page, pageSize, sortBy, sortOrder, statusFilter]);

  useEffect(() => {
    loadDashboardData();
    setPage(1); // Reset to page 1 on filter change
  }, [loadDashboardData]);

  useEffect(() => {
    loadRecordsData();
  }, [loadRecordsData]);

  const handleRefreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshLiveData();
      await loadDashboardData();
      await loadRecordsData();
    } catch (err: any) {
      console.error('Refresh failed:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadDashboardData, loadRecordsData]);

  const handleSortChange = useCallback((col: string) => {
    setSortBy((prevSortBy) => {
      if (prevSortBy === col) {
        setSortOrder((prevOrder) => (prevOrder === 'asc' ? 'desc' : 'asc'));
        return col;
      } else {
        setSortOrder('asc');
        return col;
      }
    });
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  }, []);

  const handleStatusFilterChange = useCallback((status?: string) => {
    setStatusFilter(status);
    setPage(1);
  }, []);

  const handleAuditVintage = useCallback((targetStartTime: string) => {
    setAuditTargetStartTime(targetStartTime);
  }, []);

  const handleCloseAudit = useCallback(() => {
    setAuditTargetStartTime(null);
  }, []);

  const handleOpenDataQuality = useCallback(() => {
    setIsDataQualityOpen(true);
  }, []);

  const handleCloseDataQuality = useCallback(() => {
    setIsDataQualityOpen(false);
  }, []);

  const handleFilterChange = useCallback((updated: FilterState) => {
    setFilters(updated);
  }, []);

  // Memoize timeseries points array reference
  const timeseriesPoints = useMemo(() => timeseriesData?.points || [], [timeseriesData]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* Top Application Header */}
      <Header
        dataQuality={summaryData?.dataQuality}
        onOpenDataQuality={handleOpenDataQuality}
        onRefreshData={handleRefreshData}
        isRefreshing={isRefreshing}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7">
        {/* Error Banner if connection fails */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={loadDashboardData}
              className="px-3 py-1 bg-rose-600 text-white font-medium rounded-lg hover:bg-rose-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Dashboard Title & Hero Descriptor */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Wind Generation Intelligence
              </h1>
              <p className="text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
                National UK wind generation forecasts, actual output, and forecast accuracy for day-ahead purchasing decisions.
              </p>
            </div>
            <div className="flex items-center self-start sm:self-auto gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-navy-900 text-wind-500 shadow-xs">
              <Wind className="w-4 h-4 text-wind-500" />
              <span>UK National Grid Balancing</span>
            </div>
          </div>
        </div>

        {/* Filter & Cutoff Configuration Bar */}
        <FilterBar filters={filters} onChange={handleFilterChange} isLoading={isLoading} />

        {/* Summary Metric Cards */}
        <SummaryMetrics metrics={summaryData?.metrics} isLoading={isLoading} />

        {/* Derived Analytical Intelligence Panel */}
        <InsightsPanel insightsData={insightsData || undefined} isLoading={isLoading} />

        {/* Main Forecast vs Actual Chart */}
        <ForecastChart
          points={timeseriesPoints}
          isLoading={isLoading}
        />

        {/* Signed Error & Diurnal Uncertainty Profile */}
        <ErrorChart
          points={timeseriesPoints}
          diurnalProfile={insightsData?.diurnalProfile}
          isLoading={isLoading}
        />

        {/* Detailed Data Table & CSV Export */}
        <DataTable
          recordsData={recordsData || undefined}
          page={page}
          pageSize={pageSize}
          sortBy={sortBy}
          sortOrder={sortOrder}
          statusFilter={statusFilter}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          onSortChange={handleSortChange}
          onStatusFilterChange={handleStatusFilterChange}
          onAuditVintage={handleAuditVintage}
          isLoading={isTableLoading}
        />
      </main>

      {/* Forecast Vintage Audit Modal */}
      <VintageAuditModal
        targetStartTime={auditTargetStartTime}
        filters={filters}
        onClose={handleCloseAudit}
      />

      {/* Data Quality Diagnostics Modal */}
      <DataQualityModal
        dataQuality={summaryData?.dataQuality}
        isOpen={isDataQualityOpen}
        onClose={handleCloseDataQuality}
      />

      {/* Application Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-6 text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-900">WindSight</span>
            <span>—</span>
            <span>Wind Forecast Intelligence Platform</span>
          </div>

          <div className="text-center md:text-right text-[11px] text-slate-400 space-y-0.5">
            <div>
              Forecast analysis supports purchasing decision-making but does not independently optimize electricity purchasing or guarantee financial savings.
            </div>
            <div>
              Data source: Elexon BMRS <code className="text-slate-600">FUELHH</code> (WIND) and <code className="text-slate-600">WINDFOR</code> streams.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
