import React from 'react';
import { Lightbulb, AlertTriangle, CheckCircle, Info, Flame, Clock } from 'lucide-react';
import { InsightsResponse } from '../types';

interface InsightsPanelProps {
  insightsData?: InsightsResponse;
  isLoading: boolean;
}

export const InsightsPanelComponent: React.FC<InsightsPanelProps> = ({ insightsData, isLoading }) => {
  if (isLoading || !insightsData) {
    return (
      <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs mb-6 animate-pulse">
        <div className="h-5 bg-slate-200 rounded w-1/4 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-24 bg-slate-100 rounded-lg"></div>
          <div className="h-24 bg-slate-100 rounded-lg"></div>
        </div>
      </div>
    );
  }

  const getSeverityIcon = (sev: string) => {
    switch (sev) {
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />;
      case 'positive':
        return <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />;
      default:
        return <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />;
    }
  };

  const getSeverityBorder = (sev: string) => {
    switch (sev) {
      case 'warning':
        return 'border-amber-200 bg-amber-50/50';
      case 'positive':
        return 'border-emerald-200 bg-emerald-50/50';
      default:
        return 'border-blue-200 bg-blue-50/50';
    }
  };

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs mb-6">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-2">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Key Analytical Intelligence & Findings
          </h2>
        </div>
        <span className="text-xs text-slate-400">
          Derived quantitatively from verified Elexon observations
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {insightsData.insights.map((item, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-lg border ${getSeverityBorder(item.severity)} flex flex-col justify-between`}
          >
            <div>
              <div className="flex items-start space-x-2 mb-1.5">
                {getSeverityIcon(item.severity)}
                <h3 className="text-xs font-bold text-slate-900 tracking-tight leading-snug">
                  {item.title}
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mb-2">
                {item.summary}
              </p>
            </div>
            {item.detail && (
              <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 italic">
                {item.detail}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Peak Error Days strip if available */}
      {insightsData.peakErrorDays.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-500" />
            <span className="font-semibold text-slate-800">Top Volatility Delivery Dates (Highest MAE):</span>
            <div className="flex flex-wrap gap-2">
              {insightsData.peakErrorDays.map((d, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium border border-slate-200"
                >
                  {d.settlementDate}: <strong className="text-slate-900">{d.mae.toLocaleString()} MW</strong>
                </span>
              ))}
            </div>
          </div>
          <div className="text-[11px] text-slate-400">
            *High error days typically reflect fast synoptic wind front transitions across GB.
          </div>
        </div>
      )}
    </div>
  );
};

export const InsightsPanel = React.memo(InsightsPanelComponent);
