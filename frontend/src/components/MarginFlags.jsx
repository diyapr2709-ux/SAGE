import { AlertTriangle, TrendingDown } from 'lucide-react';

function FlaggedItem({ item }) {
  const margin = item.current_margin_pct;
  const isNegative = margin < 0;

  return (
    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <TrendingDown size={13} className="text-red-400 shrink-0" />
            <p className="text-sm font-semibold text-slate-200 truncate">{item.item}</p>
            <span className={`badge ${
              item.urgency === 'critical' ? 'badge-critical' :
              item.urgency === 'high'     ? 'badge-high' : 'badge-medium'
            }`}>{item.urgency}</span>
          </div>
          {item.root_cause && (
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{item.root_cause}</p>
          )}
          {item.recommended_action && (
            <p className="text-xs text-indigo-400 mt-1 font-medium">→ {item.recommended_action}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className={`text-lg font-bold ${isNegative ? 'text-red-400' : 'text-amber-400'}`}>
            {margin?.toFixed(1)}%
          </p>
          <p className="text-[10px] text-slate-600 mt-0.5">
            ${Math.abs(item.financial_impact || item.monthly_impact || 0).toFixed(0)}/mo
          </p>
        </div>
      </div>
    </div>
  );
}

function CreepItem({ alert }) {
  return (
    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-200">{alert.item}</p>
          {alert.supplier && alert.supplier !== 'Unknown — no supplier data' && (
            <p className="text-xs text-slate-600 mt-0.5">{alert.supplier}</p>
          )}
          {alert.action && <p className="text-xs text-indigo-400 mt-1.5 leading-relaxed">{alert.action}</p>}
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-amber-400">+{alert.increase_3mo_pct?.toFixed(1)}%</p>
          <p className="text-[10px] text-slate-600">3 months</p>
          {alert.increase_6mo_pct && (
            <p className="text-[10px] text-slate-700">+{alert.increase_6mo_pct}% (6mo)</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MarginFlags({ flags }) {
  if (!flags) return null;
  const cost = flags.cost_intelligence || {};
  const flaggedItems = cost.flagged_items || [];
  const creepAlerts = cost.cost_creep_alerts || [];
  if (!flaggedItems.length && !creepAlerts.length && !flags.flag) return null;

  return (
    <div className="card-solid overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
          <AlertTriangle size={15} className="text-amber-400" />
        </div>
        <div>
          <p className="font-semibold text-white text-sm">Cost Intelligence · SHELF</p>
          <p className="text-xs text-slate-500">{flaggedItems.length} margin flags · {creepAlerts.length} cost creep alerts</p>
        </div>
      </div>

      <div className="px-5 py-4 space-y-5">
        {flaggedItems.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-3">Margin Flags</p>
            <div className="space-y-2">
              {flaggedItems.map((item, i) => <FlaggedItem key={i} item={item} />)}
            </div>
          </div>
        )}
        {creepAlerts.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-3">Cost Creep</p>
            <div className="space-y-2">
              {creepAlerts.map((a, i) => <CreepItem key={i} alert={a} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
