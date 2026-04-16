import { Tag, Clock } from 'lucide-react';

const TYPE_STYLE = {
  overpriced:          { label: 'Overpriced',    style: 'bg-red-500/15 text-red-400 border-red-500/25' },
  competitor_promo:    { label: 'Opportunity',   style: 'bg-purple-500/15 text-purple-400 border-purple-500/25' },
  deal_recommendation: { label: 'Deal',          style: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
  underpriced:         { label: 'Underpriced',   style: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
};

export default function PricingAlerts({ pricingAlerts = [], temporalAlerts = [] }) {
  const all = [
    ...pricingAlerts.map(a => ({ ...a, _src: 'price' })),
    ...temporalAlerts.map(a => ({ ...a, _src: 'temporal' })),
  ].sort((a, b) => ({ critical: 0, high: 1, medium: 2, low: 3 })[a.urgency ?? 'medium'] - ({ critical: 0, high: 1, medium: 2, low: 3 })[b.urgency ?? 'medium']);

  if (!all.length) return null;

  return (
    <div className="card-solid overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
          <Tag size={15} className="text-purple-400" />
        </div>
        <div>
          <p className="font-semibold text-white text-sm">Pricing & Market Alerts · VOICE</p>
          <p className="text-xs text-slate-500">{all.length} signals from competitor & market intelligence</p>
        </div>
      </div>

      <div className="divide-y divide-white/[0.04]">
        {all.map((alert, i) => {
          const typeCfg = TYPE_STYLE[alert.type] || { label: 'Alert', style: 'bg-slate-500/15 text-slate-400 border-slate-500/25' };
          const impact = alert.financial_impact ?? 0;
          const positive = impact > 0;

          return (
            <div key={i} className="px-5 py-4 hover:bg-white/[0.01] transition-colors">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`badge border ${typeCfg.style}`}>{typeCfg.label}</span>
                  {alert.platform && <span className="text-[10px] text-slate-600 font-semibold uppercase tracking-wide">{alert.platform}</span>}
                  {alert.item && <span className="text-xs font-semibold text-slate-300">{alert.item}</span>}
                  {alert.time_sensitive && (
                    <span className="flex items-center gap-1 badge bg-red-500/15 text-red-400 border border-red-500/25 animate-pulse">
                      <Clock size={10} /> Live
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`badge ${
                    alert.urgency === 'critical' ? 'badge-critical' :
                    alert.urgency === 'high' ? 'badge-high' : 'badge-medium'
                  }`}>{alert.urgency}</span>
                  <span className={`text-sm font-bold ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {positive ? '+' : ''}${Math.abs(impact).toFixed(0)}
                  </span>
                </div>
              </div>

              <p className="text-sm text-slate-400 mt-2 leading-relaxed">{alert.detail || alert.insight}</p>

              {alert.recommended_action && (
                <div className="mt-2.5 flex items-start gap-2">
                  <span className="text-indigo-400 text-xs font-bold shrink-0 mt-0.5">Action</span>
                  <p className="text-xs text-slate-400 leading-relaxed">{alert.recommended_action}</p>
                </div>
              )}

              {alert.deadline && (
                <p className="text-[11px] text-slate-600 mt-2 flex items-center gap-1">
                  <Clock size={10} className="text-slate-700" />
                  Deadline: <strong className="text-amber-400 ml-1">{alert.deadline}</strong>
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
