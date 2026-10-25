import React from 'react';
import { Calendar, Clock, Sliders, Info, ArrowRight } from 'lucide-react';
import { FilterState } from '../types';

interface FilterBarProps {
  filters: FilterState;
  onChange: (updated: FilterState) => void;
  isLoading: boolean;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onChange,
  isLoading,
}) => {
  // Compute delivery dates for preview
  const getDeliveryDate = (dStr: string) => {
    try {
      const d = new Date(dStr + 'T00:00:00Z');
      d.setUTCDate(d.getUTCDate() + 1);
      return d.toISOString().split('T')[0];
    } catch {
      return dStr;
    }
  };

  const deliveryStart = getDeliveryDate(filters.decisionDateFrom);
  const deliveryEnd = getDeliveryDate(filters.decisionDateTo);

  const setPreset = (from: string, to: string) => {
    onChange({
      ...filters,
      decisionDateFrom: from,
      decisionDateTo: to,
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-5 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Sliders className="w-5 h-5 text-wind-600" />
            Purchasing Decision Context & Cutoff Configuration
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluate day-ahead wind forecasts available at the time of wholesale electricity procurement.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-medium mr-1">Presets:</span>
          <button
            type="button"
            onClick={() => setPreset('2026-01-01', '2026-01-31')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              filters.decisionDateFrom === '2026-01-01' && filters.decisionDateTo === '2026-01-31'
                ? 'bg-navy-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Full January (1-31)
          </button>
          <button
            type="button"
            onClick={() => setPreset('2026-01-01', '2026-01-07')}
            className="px-2.5 py-1 rounded-md font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
          >
            Week 1
          </button>
          <button
            type="button"
            onClick={() => setPreset('2026-01-08', '2026-01-14')}
            className="px-2.5 py-1 rounded-md font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
          >
            Week 2
          </button>
          <button
            type="button"
            onClick={() => setPreset('2026-01-15', '2026-01-21')}
            className="px-2.5 py-1 rounded-md font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
          >
            Week 3
          </button>
          <button
            type="button"
            onClick={() => setPreset('2026-01-22', '2026-01-28')}
            className="px-2.5 py-1 rounded-md font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
          >
            Week 4
          </button>
          <button
            type="button"
            onClick={() => setPreset('2026-01-31', '2026-01-31')}
            className="px-2.5 py-1 rounded-md font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all"
            title="Decision on Jan 31 targets delivery on Feb 1"
          >
            Jan 31 (Feb 1 Boundary)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        {/* Purchasing Decision Dates */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Decision Date From:
            </span>
          </label>
          <input
            type="date"
            min="2026-01-01"
            max="2026-01-31"
            value={filters.decisionDateFrom}
            onChange={(e) => onChange({ ...filters, decisionDateFrom: e.target.value })}
            className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-wind-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Decision Date To:
            </span>
          </label>
          <input
            type="date"
            min="2026-01-01"
            max="2026-01-31"
            value={filters.decisionDateTo}
            onChange={(e) => onChange({ ...filters, decisionDateTo: e.target.value })}
            className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-wind-500"
          />
        </div>

        {/* Day-Ahead Decision Cutoff Policy */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              Decision Cutoff (UTC):
            </span>
            <span
              className="text-slate-400 hover:text-slate-600 cursor-help"
              title="Forecasts published after this time on the decision date are rejected to prevent future-data leakage."
            >
              <Info className="w-3.5 h-3.5" />
            </span>
          </label>
          <select
            value={filters.cutoffTime}
            onChange={(e) => onChange({ ...filters, cutoffTime: e.target.value })}
            className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-wind-500"
          >
            <option value="12:00:00">12:00 UTC (Standard UK DAM Gate Closure)</option>
            <option value="11:00:00">11:00 UTC (Nord Pool GB DAM)</option>
            <option value="17:00:00">17:00 UTC (Late D-1 Schedule)</option>
            <option value="09:00:00">09:00 UTC (Early Procurement Window)</option>
          </select>
        </div>

        {/* Forecast Mapping Policy */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              Forecast Mapping Policy:
            </span>
            <span
              className="text-slate-400 hover:text-slate-600 cursor-help"
              title="Elexon WINDFOR publishes hourly forecasts, while FUELHH has 30-minute settlement periods. Hourly Block Mapping maps the hourly forecast across both 30-min settlement intervals."
            >
              <Info className="w-3.5 h-3.5" />
            </span>
          </label>
          <select
            value={filters.mappingPolicy}
            onChange={(e) => onChange({ ...filters, mappingPolicy: e.target.value })}
            className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-wind-500"
          >
            <option value="hourly_block">Hourly Block Mapping (48 Half-Hours Matched)</option>
            <option value="exact">Strict Exact Match (24 Hourly Intervals Matched)</option>
          </select>
        </div>
      </div>

      {/* Target Delivery Range Notice */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex items-center gap-1.5 font-medium">
          <span className="text-slate-700">Effective Day-Ahead Delivery Horizon:</span>
          <span className="font-semibold text-navy-900 bg-slate-100 px-2 py-0.5 rounded">
            {deliveryStart}
          </span>
          <ArrowRight className="w-3 h-3 text-slate-400" />
          <span className="font-semibold text-navy-900 bg-slate-100 px-2 py-0.5 rounded">
            {deliveryEnd}
          </span>
          <span className="text-slate-400 italic">
            ({(new Date(filters.decisionDateTo).getTime() - new Date(filters.decisionDateFrom).getTime()) / (1000 * 60 * 60 * 24) + 1} decision days evaluated)
          </span>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-wind-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-wind-500 animate-ping"></span>
            Computing forecast analytics...
          </div>
        )}
      </div>
    </div>
  );
};
