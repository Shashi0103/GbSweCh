import React, { useState } from 'react';
import {
  Table,
  ArrowUpDown,
  Download,
  Search,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { IntervalRecord, RecordsResponse } from '../types';

interface DataTableProps {
  recordsData?: RecordsResponse;
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: string;
  statusFilter?: string;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newSize: number) => void;
  onSortChange: (column: string) => void;
  onStatusFilterChange: (status?: string) => void;
  onAuditVintage: (targetStartTime: string) => void;
  isLoading: boolean;
}

export const DataTable: React.FC<DataTableProps> = ({
  recordsData,
  page,
  pageSize,
  sortBy,
  sortOrder,
  statusFilter,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  onStatusFilterChange,
  onAuditVintage,
  isLoading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const records = recordsData?.records || [];
  const total = recordsData?.total || 0;
  const totalPages = recordsData?.totalPages || 1;

  // Filter in-memory by search term
  const filteredRecords = searchTerm
    ? records.filter(
        (r) =>
          r.targetStartTime.includes(searchTerm) ||
          r.decisionDate.includes(searchTerm) ||
          r.settlementDate.includes(searchTerm) ||
          String(r.settlementPeriod).includes(searchTerm)
      )
    : records;

  const handleExportCSV = () => {
    if (!records.length) return;
    const headers = [
      'Decision Date',
      'Delivery Settlement Date',
      'Settlement Period',
      'Target Start Time (UTC)',
      'Forecast Publish Time (UTC)',
      'Selected Forecast (MW)',
      'Actual Generation (MW)',
      'Signed Error (MW)',
      'Absolute Error (MW)',
      'APE (%)',
      'Match Status',
      'Selection Rationale',
    ];

    const rows = records.map((r) => [
      r.decisionDate,
      r.settlementDate,
      r.settlementPeriod,
      r.targetStartTime,
      r.forecastPublishTime || 'N/A',
      r.forecastGeneration !== null ? r.forecastGeneration : 'N/A',
      r.actualGeneration !== null ? r.actualGeneration : 'N/A',
      r.signedError !== null ? r.signedError : 'N/A',
      r.absoluteError !== null ? r.absoluteError : 'N/A',
      r.absolutePercentageError !== null ? r.absolutePercentageError : 'N/A',
      r.matchStatus,
      `"${r.selectionRationale.replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `windsight_analysis_page_${page}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'matched':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Matched
          </span>
        );
      case 'missing_forecast':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            No Forecast
          </span>
        );
      case 'missing_actual':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            Missing Actual
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs mb-8 overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Table className="w-4 h-4 text-navy-800" />
            Interval-by-Interval Analysis & Audit Table
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Showing verified 30-minute delivery periods, selected forecast vintages, and accuracy deltas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search interval or date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-wind-500 w-44 sm:w-52"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter || ''}
            onChange={(e) => onStatusFilterChange(e.target.value || undefined)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-wind-500"
          >
            <option value="">All Statuses</option>
            <option value="matched">Matched Only</option>
            <option value="missing_forecast">Missing Forecast</option>
            <option value="missing_actual">Missing Actual</option>
          </select>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            title="Export currently loaded intervals to CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-semibold tracking-wider text-[11px] uppercase">
              <th
                onClick={() => onSortChange('targetStartTime')}
                className="py-3 px-3.5 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Target Start (UTC)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => onSortChange('settlementPeriod')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors text-center"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>SP</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-3">Decision Date</th>
              <th className="py-3 px-3">Forecast Pub Time (UTC)</th>
              <th
                onClick={() => onSortChange('forecastGeneration')}
                className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Forecast (MW)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => onSortChange('actualGeneration')}
                className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Actual (MW)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => onSortChange('signedError')}
                className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Signed Err (A−F)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => onSortChange('absoluteError')}
                className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Abs Err (MW)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => onSortChange('absolutePercentageError')}
                className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>APE (%)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-3 text-center">Status</th>
              <th className="py-3 px-3 text-center">Audit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {isLoading ? (
              <tr>
                <td colSpan={11} className="py-12 text-center text-slate-400 font-medium">
                  Loading interval observations...
                </td>
              </tr>
            ) : filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-12 text-center text-slate-400">
                  No interval records found matching the current criteria.
                </td>
              </tr>
            ) : (
              filteredRecords.map((r, i) => {
                const isOver = (r.signedError ?? 0) < 0;
                return (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3.5 font-mono text-slate-800 font-medium whitespace-nowrap">
                      {r.targetStartTime.replace('T', ' ').replace('Z', '')}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-center font-semibold text-slate-600">
                      {r.settlementPeriod}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">
                      {r.decisionDate}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px] whitespace-nowrap">
                      {r.forecastPublishTime
                        ? r.forecastPublishTime.replace('T', ' ').replace('Z', '')
                        : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-sky-700">
                      {r.forecastGeneration !== null
                        ? r.forecastGeneration.toLocaleString()
                        : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-700">
                      {r.actualGeneration !== null
                        ? r.actualGeneration.toLocaleString()
                        : '—'}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono font-bold ${
                        r.signedError === null
                          ? 'text-slate-400'
                          : isOver
                          ? 'text-amber-700'
                          : 'text-blue-700'
                      }`}
                    >
                      {r.signedError !== null
                        ? `${r.signedError > 0 ? '+' : ''}${r.signedError.toLocaleString()}`
                        : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                      {r.absoluteError !== null ? r.absoluteError.toLocaleString() : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                      {r.absolutePercentageError !== null
                        ? `${r.absolutePercentageError}%`
                        : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {getStatusBadge(r.matchStatus)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => onAuditVintage(r.targetStartTime)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-navy-900 hover:text-white text-slate-600 text-[11px] font-medium transition-colors"
                        title="Audit all candidate forecast vintages for this interval"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Audit</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-3">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-2 py-1 bg-white border border-slate-200 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-wind-500"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-slate-400 ml-2">
            Showing {records.length > 0 ? (page - 1) * pageSize + 1 : 0} to{' '}
            {Math.min(page * pageSize, total)} of {total.toLocaleString()} total intervals
          </span>
        </div>

        <div className="flex items-center space-x-1.5 self-end sm:self-auto">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Previous page"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <span className="px-3 py-1 font-semibold text-slate-800">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Next page"
          >
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>
    </div>
  );
};
