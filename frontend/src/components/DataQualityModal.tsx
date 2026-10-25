import React from 'react';
import { X, ShieldCheck, Database, CheckCircle2, AlertTriangle, Layers, Info } from 'lucide-react';
import { DataQualitySummary } from '../types';

interface DataQualityModalProps {
  dataQuality?: DataQualitySummary;
  isOpen: boolean;
  onClose: () => void;
}

export const DataQualityModal: React.FC<DataQualityModalProps> = ({
  dataQuality,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !dataQuality) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-emerald-600 text-white shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Data Quality, Lineage & Matching Diagnostics
              </h3>
              <p className="text-xs text-slate-500">
                Auditing official Elexon FUELHH and WINDFOR streams and match rates.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          {/* Main Quality Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-slate-500 text-[11px] font-medium mb-1">FUELHH Actuals:</div>
              <div className="text-lg font-bold text-slate-900 font-mono">
                {dataQuality.actualRecordsRetrieved.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400">WIND fuelType records</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-slate-500 text-[11px] font-medium mb-1">WINDFOR Forecasts:</div>
              <div className="text-lg font-bold text-slate-900 font-mono">
                {dataQuality.forecastRecordsRetrieved.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400">Total vintages parsed</div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
              <div className="text-emerald-700 text-[11px] font-medium mb-1">Matched Periods:</div>
              <div className="text-lg font-bold text-emerald-800 font-mono">
                {dataQuality.matchedIntervals.toLocaleString()}
              </div>
              <div className="text-[10px] text-emerald-600 font-semibold">
                {dataQuality.matchRate}% Match Rate
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-slate-500 text-[11px] font-medium mb-1">Duplicates Deduplicated:</div>
              <div className="text-lg font-bold text-slate-900 font-mono">
                {dataQuality.duplicateRecordsHandled.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400">Deterministic resolution</div>
            </div>
          </div>

          {/* Diagnostic Breakdown */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Lineage & Matching Specifications
            </h4>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="font-semibold text-slate-600">Match Rate Denominator:</span>
                <span className="font-mono text-slate-900 text-right">{dataQuality.denominator}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="font-semibold text-slate-600">Decision Cutoff Policy:</span>
                <span className="font-mono text-slate-900">{dataQuality.cutoffTimeUtc} UTC</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="font-semibold text-slate-600">Resolution Mapping:</span>
                <span className="font-mono text-slate-900 capitalize">
                  {dataQuality.mappingPolicy.replace('_', ' ')}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="font-semibold text-slate-600">Data Acquisition Status:</span>
                <span className="font-semibold text-emerald-700 capitalize">
                  {dataQuality.dataRetrievalStatus}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="font-semibold text-slate-600">Acquisition Timestamp:</span>
                <span className="font-mono text-slate-900 text-[11px]">
                  {dataQuality.retrievalTimestamp}
                </span>
              </div>
            </div>
          </div>

          {/* Source Data Explanation & Integrity Alert */}
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold">
              <Info className="w-4 h-4 text-blue-600" />
              <span>Official Elexon Stream Endpoints Verified</span>
            </div>
            <p className="text-[11px] leading-relaxed text-blue-800">
              WindSight connects directly to the official UK balancing mechanism reporting service (Elexon BMRS) via:
              <br />
              • <code className="bg-blue-100 px-1 py-0.5 rounded text-blue-900">/datasets/FUELHH/stream</code> (filtered strictly to <code className="bg-blue-100 px-1 py-0.5 rounded text-blue-900">fuelType=WIND</code>)
              <br />
              • <code className="bg-blue-100 px-1 py-0.5 rounded text-blue-900">/datasets/WINDFOR/stream</code> (day-ahead forecast horizons)
              <br />
              Missing intervals are treated honestly and never fabricated or replaced with zero.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-navy-900 text-white rounded-lg text-xs font-semibold hover:bg-navy-800 transition-colors"
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
};
