import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Brush,
} from 'recharts';
import { Activity, ZoomIn } from 'lucide-react';
import { TimeseriesPoint } from '../types';

interface ForecastChartProps {
  points: TimeseriesPoint[];
  isLoading: boolean;
}

export const ForecastChartComponent: React.FC<ForecastChartProps> = ({ points, isLoading }) => {
  const [showBrush, setShowBrush] = useState(true);

  // Memoize formatted chart points to avoid recalculation on unrelated renders
  const chartData = useMemo(() => {
    return points.map((p) => {
      const d = new Date(p.targetStartTime);
      const dateLabel = `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
      return {
        time: dateLabel,
        fullTime: p.targetStartTime,
        settlementDate: p.settlementDate,
        settlementPeriod: p.settlementPeriod,
        decisionDate: p.decisionDate,
        actual: p.actualGeneration,
        forecast: p.forecastGeneration,
        signedError: p.signedError,
        absError: p.absoluteError,
      };
    });
  }, [points]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs mb-6 h-96 flex items-center justify-center animate-pulse">
        <div className="text-slate-400 text-sm font-medium">Loading time-series data...</div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const actual = data.actual;
      const forecast = data.forecast;
      const error = data.signedError;
      return (
        <div className="bg-navy-900/95 backdrop-blur-xs text-white p-3.5 rounded-xl border border-slate-700 shadow-xl text-xs max-w-xs">
          <div className="font-semibold text-slate-200 pb-1.5 border-b border-slate-700/80 mb-2">
            Target: {data.fullTime.replace('Z', ' UTC')}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] mb-2 text-slate-300">
            <div>Settlement Date:</div>
            <div className="font-mono text-white text-right">{data.settlementDate}</div>
            <div>Settlement Period:</div>
            <div className="font-mono text-white text-right">SP {data.settlementPeriod}</div>
            <div>Decision Date:</div>
            <div className="font-mono text-white text-right">{data.decisionDate}</div>
          </div>
          <div className="space-y-1 pt-1.5 border-t border-slate-700/80">
            <div className="flex justify-between items-center text-emerald-400">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Actual Generation:
              </span>
              <span className="font-mono font-bold">
                {actual !== null ? `${actual.toLocaleString()} MW` : 'Missing'}
              </span>
            </div>
            <div className="flex justify-between items-center text-sky-400">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                Day-Ahead Forecast:
              </span>
              <span className="font-mono font-bold">
                {forecast !== null ? `${forecast.toLocaleString()} MW` : 'Missing'}
              </span>
            </div>
            {error !== null && (
              <div className="flex justify-between items-center pt-1 text-slate-300">
                <span>Signed Error (A − F):</span>
                <span
                  className={`font-mono font-bold ${
                    error > 0 ? 'text-blue-300' : 'text-amber-300'
                  }`}
                >
                  {error > 0 ? `+${error.toLocaleString()}` : error.toLocaleString()} MW
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl p-3.5 sm:p-5 border border-slate-200/80 shadow-xs mb-4 sm:mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 sm:pb-4 mb-2 border-b border-slate-100 gap-2.5">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-600 shrink-0" />
            Day-Ahead Forecast vs Actual Generation
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
            National GB wind generation (FUELHH WIND) evaluated against selected Day-Ahead forecasts (WINDFOR) in MW.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            onClick={() => setShowBrush(!showBrush)}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md min-h-[32px] sm:min-h-0 transition-colors active:scale-95 cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
            <span>{showBrush ? 'Hide Zoom Slider' : 'Show Zoom Slider'}</span>
          </button>
        </div>
      </div>

      <div className="h-72 sm:h-80 w-full pt-2">
        {chartData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
            <Activity className="w-8 h-8 text-slate-300 mb-2" />
            <span>No timeseries intervals available for this date selection.</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 15, left: 0, bottom: 5 }}>
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
                domain={[0, 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
              />
              {/* Critical requirement: connectNulls={false} to avoid misleading connections across missing intervals */}
              <Line
                type="monotone"
                dataKey="actual"
                name="Actual Wind Generation (FUELHH)"
                stroke="#059669"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="forecast"
                name="Selected Day-Ahead Forecast (WINDFOR)"
                stroke="#2563EB"
                strokeWidth={2}
                strokeDasharray="4 3"
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls={false}
                isAnimationActive={false}
              />
              {showBrush && chartData.length > 1 && (
                <Brush
                  dataKey="time"
                  height={26}
                  stroke="#94a3b8"
                  fill="#f8fafc"
                  startIndex={0}
                  endIndex={Math.min(chartData.length - 1, 96)}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export const ForecastChart = React.memo(ForecastChartComponent);
