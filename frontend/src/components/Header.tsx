import React from 'react';
import { Wind, Activity, RefreshCw, Database, HelpCircle, ShieldCheck } from 'lucide-react';
import { DataQualitySummary } from '../types';

interface HeaderProps {
  dataQuality?: DataQualitySummary;
  onOpenDataQuality: () => void;
  onRefreshData: () => void;
  isRefreshing: boolean;
}

export const HeaderComponent: React.FC<HeaderProps> = ({
  dataQuality,
  onOpenDataQuality,
  onRefreshData,
  isRefreshing,
}) => {
  return (
    <header className="bg-navy-900 border-b border-navy-800 text-white sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-[4.5rem] py-2.5 sm:py-0 sm:h-20">
          {/* Brand & Wordmark */}
          <div className="flex items-center space-x-2.5 sm:space-x-3.5">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-wind-500 to-sky-500 flex items-center justify-center shadow-md shadow-wind-500/20 shrink-0">
              <Wind className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center">
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-white">WindSight</span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 font-medium">
                Wind Forecast Intelligence
              </p>
            </div>
          </div>

          {/* Right Controls: Freshness & Data Quality trigger */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* January 2026 Decision Scope Badge (Hidden on mobile/tablet) */}
            <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-navy-800/90 border border-slate-700/60 text-xs text-slate-200">
              <span className="w-2 h-2 rounded-full bg-wind-500 animate-pulse"></span>
              <span className="font-semibold text-white">Scope:</span>
              <span className="text-slate-300">January 2026 Decisions</span>
            </div>

            {/* Data Source Freshness Pill */}
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-navy-800/90 border border-slate-700/60 text-xs text-slate-300">
              <Database className="w-3.5 h-3.5 text-wind-500 shrink-0" />
              <span>BMRS:</span>
              <span className="font-semibold text-emerald-400 capitalize">
                {dataQuality?.dataRetrievalStatus || 'Verified'}
              </span>
            </div>

            {/* Data Quality Modal Trigger */}
            <button
              onClick={onOpenDataQuality}
              className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 border border-slate-700 text-xs font-medium text-slate-200 min-h-[38px] sm:min-h-[32px] transition-colors active:scale-95 cursor-pointer"
              title="Inspect Elexon Data Quality & Denominators"
            >
              <ShieldCheck className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-wind-500 shrink-0" />
              <span className="hidden xs:inline sm:inline">Quality</span>
            </button>

            {/* Refresh Live Button */}
            <button
              onClick={onRefreshData}
              disabled={isRefreshing}
              className="flex items-center space-x-1.5 px-3 sm:px-3.5 py-2 sm:py-1.5 rounded-lg bg-wind-600 hover:bg-wind-500 text-white text-xs font-semibold shadow-sm transition-all min-h-[38px] sm:min-h-[32px] active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Re-query live Elexon BMRS API stream"
            >
              <RefreshCw className={`w-4 h-4 sm:w-3.5 sm:h-3.5 ${isRefreshing ? 'animate-spin' : ''} shrink-0`} />
              <span>
                {isRefreshing ? 'Syncing...' : 'Sync'}
              </span>
            </button>
          </div>
        </div>

        {/* Supporting Header Banner */}
        <div className="py-2 border-t border-navy-800/70 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 gap-1">
          <div className="flex items-center space-x-2">
            <span className="text-slate-300 italic text-[11px] sm:text-xs">
              "See the forecast. Measure uncertainty. Make smarter decisions."
            </span>
          </div>
          <div className="text-slate-400 text-[10px] sm:text-[11px]">
            Elexon Streams: <span className="text-slate-200 font-mono">FUELHH</span> actuals vs <span className="text-slate-200 font-mono">WINDFOR</span> forecasts
          </div>
        </div>
      </div>
    </header>
  );
};

export const Header = React.memo(HeaderComponent);
