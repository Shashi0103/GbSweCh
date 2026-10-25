import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from 'recharts';
import { BarChart3, Clock, AlertCircle } from 'lucide-react';
import { TimeseriesPoint } from '../types';

interface ErrorChartProps {
  points: TimeseriesPoint[];
  diurnalProfile?: Array<{ hour: number; hourLabel: string; mae: number; count: number }>;
  isLoading: boolean;
}

export const ErrorChart: React.FC<ErrorChartProps> = ({
  points,
  diurnalProfile,
  isLoading,
}) => {
  const [viewMode, setViewMode] = useState<'signed' | 'diurnal'>('signed');

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs mb-6 h-80 flex items-center justify-center animate-pulse">
        <div className="text-slate-400 text-sm font-medium">Loading forecast error chart...</div>
      </div>
    );
  }

  // Format signed error data
  const signedData = points.map((p) => {
    const d = new Date(p.targetStartTime);
    const dateLabel = `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
    return {
      time: dateLabel,
      fullTime: p.targetStartTime,
      settlementPeriod: p.settlementPeriod,
      signedError: p.signedError,
      isOverforecast: (p.signedError ?? 0) < 0,
    };
  });

  const SignedTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const err = data.signedError;
      const isOver = err < 0;
      return (
        <div className="bg-navy-900/95 backdrop-blur-xs text-white p-3 rounded-lg border border-slate-700 shadow-xl text-xs">
          <div className="text-slate-300 font-semibold mb-1">
            Target: {data.fullTime.replace('Z', ' UTC')}
          </div>
          <div className="text-slate-400 mb-1">Settlement Period: SP {data.settlementPeriod}</div>
          <div className="pt-1.5 border-t border-slate-700 flex items-center justify-between gap-3">
            <span className="text-slate-300">Signed Error (A − F):</span>
            <span className={`font-mono font-bold ${isOver ? 'text-amber-400' : 'text-blue-400'}`}>
              {err > 0 ? `+${err.toLocaleString()}` : err.toLocaleString()} MW
            </span>
          </div>
          <div className="text-[11px] mt-1 text-slate-400">
            {isOver ? 'Overforecasting (Actual < Forecast)' : 'Underforecasting (Actual > Forecast)'}
          </div>
        </div>
      );
    }
    return null;
  };

  const DiurnalTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-navy-900/95 backdrop-blur-xs text-white p-3 rounded-lg border border-slate-700 shadow-xl text-xs">
          <div className="text-slate-200 font-semibold mb-1">
            Delivery Hour: {data.hourLabel}
          </div>
          <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-700">
            <span className="text-slate-300">Average MAE:</span>
            <span className="font-mono font-bold text-sky-400">{data.mae.toLocaleString()} MW</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Based on {data.count} half-hour periods</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-2 border-b border-slate-100 gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-navy-800" />
            {viewMode === 'signed' ? 'Forecast Signed Error Over Time' : 'Diurnal Uncertainty Profile (Hour of Day)'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {viewMode === 'signed'
              ? 'Sign convention: Actual − Forecast. Negative = Overforecasting, Positive = Underforecasting.'
              : 'Average Mean Absolute Error (MAE) categorized by delivery hour (00:00 to 23:00 UTC).'}
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-medium">
          <button
            onClick={() => setViewMode('signed')}
            className={`px-3 py-1 rounded-md transition-all ${
              viewMode === 'signed'
                ? 'bg-white text-navy-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Signed Error (Time-Series)
          </button>
          <button
            onClick={() => setViewMode('diurnal')}
            className={`px-3 py-1 rounded-md transition-all ${
              viewMode === 'diurnal'
                ? 'bg-white text-navy-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Diurnal Profile (By Hour)
          </button>
        </div>
      </div>

      <div className="h-64 w-full pt-2">
        {viewMode === 'signed' ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={signedData} margin={{ top: 10, right: 15, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                minTickGap={45}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k MW`}
              />
              <Tooltip content={<SignedTooltip />} />
              <ReferenceLine y={0} stroke="#475569" strokeWidth={1.5} />
              <Bar dataKey="signedError" name="Signed Error (MW)" maxBarSize={6}>
                {signedData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isOverforecast ? '#F59E0B' : '#3B82F6'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={diurnalProfile || []} margin={{ top: 10, right: 15, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="hourLabel"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                tickFormatter={(v) => `${v.toLocaleString()} MW`}
              />
              <Tooltip content={<DiurnalTooltip />} />
              <Bar dataKey="mae" name="Average MAE (MW)" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-amber-500"></span>
            Negative Error (Amber): Overforecasting (Actual &lt; Forecast)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-blue-500"></span>
            Positive Error (Blue): Underforecasting (Actual &gt; Forecast)
          </span>
        </div>
        <div className="italic text-slate-400">
          Units: Megawatts (MW)
        </div>
      </div>
    </div>
  );
};
