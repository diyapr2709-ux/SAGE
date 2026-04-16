import { TrendingUp, AlertTriangle, DollarSign, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

const CARDS = [
  {
    key: 'health',
    label: 'Health Score',
    icon: Activity,
    gradient: 'from-emerald-500/20 to-teal-500/10',
    border: 'border-emerald-500/20',
    iconColor: 'text-emerald-400',
    glow: 'shadow-emerald-500/10',
  },
  {
    key: 'recs',
    label: 'Recommendations',
    icon: TrendingUp,
    gradient: 'from-indigo-500/20 to-blue-500/10',
    border: 'border-indigo-500/20',
    iconColor: 'text-indigo-400',
    glow: 'shadow-indigo-500/10',
  },
  {
    key: 'impact',
    label: 'Total Impact',
    icon: DollarSign,
    gradient: 'from-purple-500/20 to-pink-500/10',
    border: 'border-purple-500/20',
    iconColor: 'text-purple-400',
    glow: 'shadow-purple-500/10',
  },
  {
    key: 'critical',
    label: 'Critical Alerts',
    icon: AlertTriangle,
    gradient: 'from-red-500/20 to-orange-500/10',
    border: 'border-red-500/20',
    iconColor: 'text-red-400',
    glow: 'shadow-red-500/10',
  },
];

export default function StatCards({ data }) {
  const recs = data?.recommendations || [];
  const needsApproval = recs.filter(r => r.requires_approval).length;
  const totalImpact = recs.reduce((s, r) => s + (r.impact || 0), 0);
  const criticalCount = recs.filter(r => r.urgency === 'critical').length;
  const health = data?.health_score;

  const values = {
    health: { value: health != null ? `${health}/100` : '—', sub: health >= 70 ? 'Healthy' : health >= 40 ? 'At risk' : 'Critical' },
    recs:   { value: recs.length, sub: `${needsApproval} need approval` },
    impact: { value: `$${totalImpact.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, sub: 'Across all signals' },
    critical: { value: criticalCount, sub: data?.alert ? 'Revenue anomaly active' : 'No anomaly' },
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {CARDS.map((card, i) => {
        const { value, sub } = values[card.key];
        const Icon = card.icon;
        return (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.4, ease: 'easeOut' }}
            className={`relative overflow-hidden rounded-2xl border ${card.border} bg-gradient-to-br ${card.gradient} p-5 shadow-xl ${card.glow}`}
          >
            {/* Background shimmer */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

            <div className="flex items-start justify-between mb-4">
              <div className={`w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center ${card.iconColor}`}>
                <Icon size={18} />
              </div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest">{card.label}</span>
            </div>

            <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
            <p className="text-xs text-slate-500 mt-1 font-medium">{sub}</p>
          </motion.div>
        );
      })}
    </div>
  );
}
