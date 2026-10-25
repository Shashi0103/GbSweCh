import React from 'react';
import { Target, TrendingUp, TrendingDown, Gauge, AlertCircle, HelpCircle, Layers } from 'lucide-react';
import { SummaryMetrics as SummaryMetricsType } from '../types';

interface SummaryMetricsProps {
  metrics?: SummaryMetricsType;
  isLoading: boolean;
}

export const SummaryMetricsComponent: React.FC<SummaryMetricsProps> = ({ metrics, isLoading }) => {
  if (isLoading || !metrics) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4 mb-4 sm:mb-6">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`bg-white rounded-xl p-3.5 sm:p-5 border border-slate-200/80 shadow-xs animate-pulse ${
              i === 4 ? 'col-span-2 sm:col-span-1' : ''
            }`}
          >
            <div className="h-3 bg-slate-200 rounded w-2/3 mb-2.5"></div>
            <div className="h-6 sm:h-7 bg-slate-200 rounded w-1/2 mb-2"></div>
            <div className="h-2.5 bg-slate-100 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  const isOverforecast = (metrics.bias ?? 0) > 0;
  const biasAbs = Math.abs(metrics.bias ?? 0);
  const biasPctOfMean = metrics.meanActualGeneration
    ? ((biasAbs / metrics.meanActualGeneration) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4 mb-4 sm:mb-6">
      {/* 1. Matched Intervals */}
      <div className="bg-white rounded-xl p-3.5 sm:p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-slate-300 transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-slate-500 mb-1 sm:mb-1.5">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
              Coverage
            </span>
            <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 group-hover:text-navy-900 transition-colors shrink-0" />
          </div>
          <div className="flex items-baseline space-x-1 sm:space-x-1.5 flex-wrap">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {metrics.matchedIntervals.toLocaleString()}
            </span>
            <span className="text-[10px] sm:text-xs text-slate-400 font-medium">
              /{metrics.totalTargetIntervals.toLocaleString()}
            </span>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] sm:text-xs">
          <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 sm:px-2 py-0.5 rounded-full border border-emerald-100 text-[10px] sm:text-xs">
            {metrics.matchRatePercent}% Match
          </span>
          <span
            className="text-slate-400 hover:text-slate-600 cursor-help"
            title="Proportion of expected target delivery intervals successfully matched with an eligible forecast published prior to cutoff."
          >
            <HelpCircle className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* 2. Mean Absolute Error (MAE) */}
      <div className="bg-white rounded-xl p-3.5 sm:p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-slate-300 transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-slate-500 mb-1 sm:mb-1.5">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
              MAE
            </span>
            <Gauge className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 group-hover:text-navy-900 transition-colors shrink-0" />
          </div>
          <div className="flex items-baseline space-x-1 sm:space-x-1.5">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {metrics.mae !== null ? metrics.mae.toLocaleString() : 'N/A'}
            </span>
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500">{metrics.unit}</span>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] sm:text-xs text-slate-500">
          <span className="truncate">mean(|A − F|)</span>
          <span
            className="text-slate-400 hover:text-slate-600 cursor-help"
            title="Average magnitude of forecast error across all matched half-hour periods in verified megawatts (MW)."
          >
            <HelpCircle className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* 3. Mean Absolute Percentage Error (MAPE) */}
      <div className="bg-white rounded-xl p-3.5 sm:p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-slate-300 transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-slate-500 mb-1 sm:mb-1.5">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
              MAPE
            </span>
            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 group-hover:text-navy-900 transition-colors shrink-0" />
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {metrics.mape !== null ? `${metrics.mape}%` : 'N/A'}
            </span>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] sm:text-xs text-slate-500">
          <span className="truncate">
            {metrics.zeroActualExclusions > 0
              ? `${metrics.zeroActualExclusions} zeroes excl.`
              : 'Relative error'}
          </span>
          <span
            className="text-slate-400 hover:text-slate-600 cursor-help"
            title="Mean Absolute Percentage Error relative to actual wind generation. Excludes periods with zero actual generation to prevent division by zero."
          >
            <HelpCircle className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* 4. Forecast Bias */}
      <div className="bg-white rounded-xl p-3.5 sm:p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-slate-300 transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-slate-500 mb-1 sm:mb-1.5">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
              Bias
            </span>
            {isOverforecast ? (
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500 shrink-0" />
            )}
          </div>
          <div className="flex items-baseline space-x-1 sm:space-x-1.5">
            <span
              className={`text-xl sm:text-2xl font-bold tracking-tight ${
                isOverforecast ? 'text-amber-700' : 'text-blue-700'
              }`}
            >
              {metrics.bias !== null
                ? `${metrics.bias > 0 ? '+' : ''}${metrics.bias.toLocaleString()}`
                : 'N/A'}
            </span>
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500">{metrics.unit}</span>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] sm:text-xs">
          <span
            className={`px-1.5 sm:px-2 py-0.5 rounded-full font-medium text-[10px] sm:text-[11px] truncate ${
              isOverforecast
                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                : 'bg-blue-50 text-blue-800 border border-blue-200'
            }`}
          >
            {isOverforecast ? 'Over' : 'Under'} ({biasPctOfMean}%)
          </span>
          <span
            className="text-slate-400 hover:text-slate-600 cursor-help"
            title="Forecast Bias = mean(Forecast − Actual). Positive values mean forecasts systematically exceeded actual generation; negative values mean forecasts underestimated generation."
          >
            <HelpCircle className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* 5. Root Mean Square Error (RMSE) - Spans 2 cols on mobile */}
      <div className="col-span-2 sm:col-span-1 bg-white rounded-xl p-3.5 sm:p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-slate-300 transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-slate-500 mb-1 sm:mb-1.5">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
              Root Mean Square Error (RMSE)
            </span>
            <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 group-hover:text-navy-900 transition-colors shrink-0" />
          </div>
          <div className="flex items-baseline space-x-1 sm:space-x-1.5">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {metrics.rmse !== null ? metrics.rmse.toLocaleString() : 'N/A'}
            </span>
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500">{metrics.unit}</span>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] sm:text-xs text-slate-500">
          <span>sqrt(mean((A − F)²))</span>
          <span
            className="text-slate-400 hover:text-slate-600 cursor-help"
            title="Root Mean Square Error penalizes larger forecast deviations more heavily than MAE, reflecting volumetric risk."
          >
            <HelpCircle className="w-3 h-3" />
          </span>
        </div>
      </div>
    </div>
  );
};

export const SummaryMetrics = React.memo(SummaryMetricsComponent);
