import { useState } from 'react';
import { Zap, Clock, CheckCircle, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const URGENCY_BADGE = {
  critical: 'badge-critical',
  high:     'badge-high',
  medium:   'badge-medium',
  low:      'badge-low',
};

const URGENCY_BAR = {
  critical: 'bg-red-500',
  high:     'bg-orange-500',
  medium:   'bg-amber-500',
  low:      'bg-slate-600',
};

const AGENT_STYLE = {
  PULSE: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  VOICE: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
  SHELF: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  CREW:  'bg-orange-500/15 text-orange-400 border-orange-500/25',
  FRANK: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25',
};

function RecRow({ rec, index }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="border-b border-white/[0.05] last:border-0"
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left px-5 py-4 flex items-center gap-3 hover:bg-white/[0.02] transition-colors group"
      >
        {/* Urgency bar */}
        <div className={`w-1 h-8 rounded-full shrink-0 ${URGENCY_BAR[rec.urgency] || 'bg-slate-600'} opacity-70`} />

        {/* Approval */}
        {rec.requires_approval
          ? <Clock size={14} className="text-amber-400 shrink-0" />
          : <CheckCircle size={14} className="text-emerald-500 shrink-0" />}

        {/* Agent */}
        <span className={`badge border ${AGENT_STYLE[rec.agent] || 'bg-slate-500/15 text-slate-400 border-slate-500/25'}`}>
          {rec.agent}
        </span>

        {/* Title */}
        <span className="flex-1 text-sm font-medium text-slate-200 text-left line-clamp-1 group-hover:text-white transition-colors">
          {rec.title}
        </span>

        {/* Urgency + impact */}
        <div className="flex items-center gap-3 shrink-0">
          <span className={URGENCY_BADGE[rec.urgency] || 'badge-low'}>{rec.urgency}</span>
          <span className="text-sm font-bold text-white w-20 text-right">
            ${(rec.impact || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
          {open
            ? <ChevronUp size={13} className="text-slate-500" />
            : <ChevronDown size={13} className="text-slate-500" />}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 ml-4 border-l border-white/[0.06] space-y-3">
              <p className="text-sm text-slate-400 leading-relaxed">{rec.description}</p>
              <div className="flex flex-wrap gap-4 text-xs">
                {rec.category && (
                  <span className="text-slate-500">Category: <strong className="text-slate-300">{rec.category}</strong></span>
                )}
                {rec.owner && rec.owner !== 'Owner' && (
                  <span className="text-slate-500">Owner: <strong className="text-slate-300">{rec.owner}</strong></span>
                )}
                {rec.deadline && (
                  <span className="text-slate-500">Deadline: <strong className="text-amber-400">{rec.deadline}</strong></span>
                )}
                {rec.merged_from?.length > 0 && (
                  <span className="text-slate-500">Merged: <strong className="text-indigo-400">{rec.merged_from.join(' + ')}</strong></span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const FILTERS = ['all', 'critical', 'high', 'approval'];

export default function RecommendationsList({ recommendations = [] }) {
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? recommendations
    : filter === 'approval' ? recommendations.filter(r => r.requires_approval)
    : recommendations.filter(r => r.urgency === filter);

  const counts = {
    all: recommendations.length,
    critical: recommendations.filter(r => r.urgency === 'critical').length,
    high: recommendations.filter(r => r.urgency === 'high').length,
    approval: recommendations.filter(r => r.requires_approval).length,
  };

  return (
    <div className="card-solid overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
            <Zap size={15} className="text-indigo-400" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">FRANK Recommendations</p>
            <p className="text-xs text-slate-500">{recommendations.length} signals ranked by urgency & impact</p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-white/[0.03] rounded-xl p-1 border border-white/[0.06]">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === f
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {f === 'approval' ? 'Needs Approval' : f.charAt(0).toUpperCase() + f.slice(1)}
              {counts[f] > 0 && (
                <span className={`ml-1.5 ${filter === f ? 'text-indigo-200' : 'text-slate-600'}`}>
                  {counts[f]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Rows */}
      <div>
        {filtered.length === 0
          ? <p className="text-sm text-slate-600 px-5 py-10 text-center">No recommendations in this filter</p>
          : filtered.map((rec, i) => <RecRow key={rec.id} rec={rec} index={i} />)
        }
      </div>
    </div>
  );
}
