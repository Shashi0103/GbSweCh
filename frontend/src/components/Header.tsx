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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand & Wordmark */}
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-wind-500 to-sky-500 flex items-center justify-center shadow-md shadow-wind-500/20">
              <Wind className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center">
                <span className="text-2xl font-bold tracking-tight text-white">WindSight</span>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                Wind Forecast Intelligence Platform
              </p>
            </div>
          </div>

          {/* Right Controls: Freshness & Data Quality trigger */}
          <div className="flex items-center space-x-3">
            {/* January 2026 Decision Scope Badge */}
            <div className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-navy-800/90 border border-slate-700/60 text-xs text-slate-200">
              <span className="w-2 h-2 rounded-full bg-wind-500 animate-pulse"></span>
              <span className="font-semibold text-white">Scope:</span>
              <span className="text-slate-300">January 2026 Purchasing Decisions</span>
            </div>

            {/* Data Source Freshness Pill */}
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-navy-800/90 border border-slate-700/60 text-xs text-slate-300">
              <Database className="w-3.5 h-3.5 text-wind-500" />
              <span>Elexon BMRS:</span>
              <span className="font-semibold text-emerald-400 capitalize">
                {dataQuality?.dataRetrievalStatus || 'Verified'}
              </span>
            </div>

            {/* Data Quality Modal Trigger */}
            <button
              onClick={onOpenDataQuality}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 border border-slate-700 text-xs font-medium text-slate-200 transition-colors"
              title="Inspect Elexon Data Quality & Denominators"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-wind-500" />
              <span className="hidden sm:inline">Data Quality</span>
            </button>

            {/* Refresh Live Button */}
            <button
              onClick={onRefreshData}
              disabled={isRefreshing}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-wind-600 hover:bg-wind-500 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
              title="Re-query live Elexon BMRS API stream"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {isRefreshing ? 'Refreshing...' : 'Live Sync'}
              </span>
            </button>
          </div>
        </div>

        {/* Supporting Header Banner */}
        <div className="py-2.5 border-t border-navy-800/70 flex flex-col md:flex-row md:items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="text-slate-300 italic">
              "See the forecast. Measure the uncertainty. Make smarter energy decisions."
            </span>
          </div>
          <div className="mt-1 md:mt-0 text-slate-400 text-[11px]">
            Elexon Datasets: <span className="text-slate-200 font-mono">FUELHH (WIND)</span> actuals vs <span className="text-slate-200 font-mono">WINDFOR</span> forecasts
          </div>
        </div>
      </div>
    </header>
  );
};

export const Header = React.memo(HeaderComponent);
