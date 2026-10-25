import React, { useEffect, useState } from 'react';
import { X, ShieldCheck, CheckCircle2, XCircle, AlertCircle, Clock, Calendar } from 'lucide-react';
import { FilterState, VintageInspectionResponse } from '../types';
import { fetchVintageInspection } from '../services/api';

interface VintageAuditModalProps {
  targetStartTime: string | null;
  filters: FilterState;
  onClose: () => void;
}

export const VintageAuditModal: React.FC<VintageAuditModalProps> = ({
  targetStartTime,
  filters,
  onClose,
}) => {
  const [data, setData] = useState<VintageInspectionResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!targetStartTime) return;
    setLoading(true);
    setError(null);
    fetchVintageInspection(targetStartTime, filters)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to audit vintages');
        setLoading(false);
      });
  }, [targetStartTime, filters]);

  if (!targetStartTime) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-navy-900 text-wind-500">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Forecast Vintage Selection Audit
              </h3>
              <p className="text-xs text-slate-500">
                Verifying eligible forecast selection and future-data leakage rejection.
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Loading vintage audit trail...
            </div>
          ) : error ? (
            <div className="p-4 rounded-lg bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          ) : data ? (
            <>
              {/* Context Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-slate-500 flex items-center gap-1 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Decision Date:
                  </div>
                  <div className="font-semibold text-slate-900 font-mono text-sm">
                    {data.decisionDate}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-slate-500 flex items-center gap-1 mb-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Decision Cutoff:
                  </div>
                  <div className="font-semibold text-slate-900 font-mono text-sm">
                    {data.cutoffTimeUtc} UTC
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-slate-500 flex items-center gap-1 mb-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Target Delivery Start:
                  </div>
                  <div className="font-semibold text-slate-900 font-mono text-sm">
                    {data.targetStartTime.replace('T', ' ').replace('Z', '')}
                  </div>
                </div>
              </div>

              {/* Rationale Notice */}
              <div className="p-3.5 rounded-lg bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-900">
                <strong className="font-bold">Selection Rationale: </strong>
                {data.rationale}
              </div>

              {/* All Candidate Vintages Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
                  Published Forecast Vintages ({data.allVintages.length})
                </h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-600 font-semibold text-[11px] uppercase border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Publish Time (UTC)</th>
                        <th className="py-2.5 px-3 text-right">Forecast (MW)</th>
                        <th className="py-2.5 px-3 text-center">Eligibility</th>
                        <th className="py-2.5 px-3">Status / Audit Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.allVintages.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-slate-400">
                            No forecast records found in WINDFOR for this target interval.
                          </td>
                        </tr>
                      ) : (
                        data.allVintages.map((v, idx) => (
                          <tr
                            key={idx}
                            className={
                              v.isSelected
                                ? 'bg-emerald-50/70 font-medium'
                                : !v.isEligible
                                ? 'bg-slate-50/40 text-slate-400'
                                : 'hover:bg-slate-50'
                            }
                          >
                            <td className="py-2.5 px-3 font-mono">
                              {v.publishTime.replace('T', ' ').replace('Z', '')}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold">
                              {v.generation.toLocaleString()} MW
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {v.isEligible ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  Eligible
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-rose-600 font-semibold text-[11px]">
                                  <XCircle className="w-3.5 h-3.5 text-rose-500" />
                                  Rejected
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-[11px]">
                              {v.isSelected ? (
                                <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                                  Selected (Latest Eligible Vintage)
                                </span>
                              ) : !v.isEligible ? (
                                <span className="text-rose-700 italic">
                                  {v.rejectionReason}
                                </span>
                              ) : (
                                <span className="text-slate-500">
                                  Superseded by later eligible vintage
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-navy-900 text-white rounded-lg text-xs font-semibold hover:bg-navy-800 transition-colors"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
};
