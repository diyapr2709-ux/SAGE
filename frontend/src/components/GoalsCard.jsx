import { Target } from 'lucide-react';

function GoalBar({ label, data = {} }) {
  const pct = data.target > 0 ? Math.min((data.actual_so_far / data.target) * 100, 100) : 0;
  const projPct = data.target > 0 ? Math.min(((data.projected || 0) / data.target) * 100, 100) : 0;
  const onPace = data.on_pace;

  return (
    <div>
      <div className="flex justify-between items-end mb-2">
        <span className="text-sm font-semibold text-slate-300">{label}</span>
        <div className="text-right">
          <span className="text-lg font-bold text-white">
            ${(data.actual_so_far || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
          <span className="text-slate-500 text-xs ml-1">/ ${(data.target || 0).toLocaleString()}</span>
        </div>
      </div>

      {/* Track */}
      <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden relative">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            onPace ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-amber-500 to-orange-400'
          }`}
          style={{ width: `${pct}%` }}
        />
        {projPct > pct && projPct <= 100 && (
          <div
            className="absolute top-0 h-full w-0.5 bg-white/30"
            style={{ left: `${projPct}%` }}
          />
        )}
      </div>

      <div className="flex justify-between text-xs mt-1.5">
        <span className="text-slate-600">{pct.toFixed(0)}% · proj. ${(data.projected || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        {onPace
          ? <span className="text-emerald-400 font-semibold">On pace ✓</span>
          : <span className="text-amber-400 font-semibold">Behind ${Math.abs(data.gap || 0).toFixed(0)}</span>
        }
      </div>
    </div>
  );
}

export default function GoalsCard({ goals = {} }) {
  return (
    <div className="card-solid overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
          <Target size={15} className="text-emerald-400" />
        </div>
        <div>
          <p className="font-semibold text-white text-sm">Revenue Goals</p>
          <p className="text-xs text-slate-500">PULSE · Daily & weekly tracking</p>
        </div>
      </div>
      <div className="px-5 py-5 space-y-6">
        <GoalBar label="Today" data={goals.daily} />
        <GoalBar label="This Week" data={goals.weekly} />
      </div>
    </div>
  );
}
