import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-white/10 rounded-xl shadow-2xl px-4 py-3 text-sm">
      <p className="text-slate-400 text-xs mb-1">Hour +{label}</p>
      <p className="font-bold text-white text-base">${payload[0].value?.toFixed(0)}</p>
    </div>
  );
};

export default function RevenueChart({ forecast = [], rushHours = [] }) {
  const data = forecast.map((value, idx) => ({ hour: idx, revenue: +value.toFixed(2) }));

  return (
    <div className="card-solid overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <TrendingUp size={15} className="text-blue-400" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">72‑Hour Revenue Forecast</p>
            <p className="text-xs text-slate-500">PULSE · Statistical model (MSTL)</p>
          </div>
        </div>
        {rushHours.length > 0 && (
          <span className="badge bg-amber-500/15 text-amber-400 border border-amber-500/25">
            {rushHours.length} rush window{rushHours.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="px-2 pt-4 pb-2">
        {data.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-slate-600 text-sm">No forecast data</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="hour"
                tickFormatter={v => `+${v}h`}
                tick={{ fontSize: 10, fill: '#475569' }}
                axisLine={false}
                tickLine={false}
                interval={11}
              />
              <YAxis
                tickFormatter={v => `$${v}`}
                tick={{ fontSize: 10, fill: '#475569' }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#revGrad)"
                dot={false}
                activeDot={{ r: 5, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {rushHours.length > 0 && (
        <div className="px-5 pb-4 flex flex-wrap gap-2">
          {rushHours.map((r, i) => (
            <div key={i} className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              <span className="text-xs text-amber-300 font-medium">{r.window}</span>
              <span className="text-xs text-slate-500">${r.expected_revenue?.toFixed(0)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
