import { useState, useEffect } from 'react';
import { Users, Clock, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

const STATUS_CFG = {
  understaffed: { icon: XCircle,     label: 'Understaffed', color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/25',     dot: 'bg-red-500' },
  overstaffed:  { icon: AlertCircle, label: 'Overstaffed',  color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/25', dot: 'bg-amber-500' },
  balanced:     { icon: CheckCircle, label: 'Balanced',     color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/25', dot: 'bg-emerald-500' },
};

const SCENARIO_COLORS = [
  'from-indigo-500/20 to-blue-500/10 border-indigo-500/20',
  'from-amber-500/20 to-orange-500/10 border-amber-500/20',
  'from-emerald-500/20 to-teal-500/10 border-emerald-500/20',
  'from-purple-500/20 to-pink-500/10 border-purple-500/20',
];

const ROLE_COLOR = {
  cashier:          'bg-blue-500/20 text-blue-300 border-blue-500/30',
  cook:             'bg-orange-500/20 text-orange-300 border-orange-500/30',
  shift_supervisor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  front_desk:       'bg-teal-500/20 text-teal-300 border-teal-500/30',
  delivery:         'bg-pink-500/20 text-pink-300 border-pink-500/30',
};

const TYPE_COLOR = {
  full_time:      'bg-emerald-500/15 text-emerald-400',
  part_time:      'bg-blue-500/15 text-blue-400',
  student_worker: 'bg-purple-500/15 text-purple-400',
};

function ShiftCard({ shift, colorClass, index }) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CFG[shift.staffing_status] || STATUS_CFG.balanced;
  const Icon = cfg.icon;
  const matched = shift.employees?.filter(e => e.preference_match).length || 0;
  const total = shift.employees?.length || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className={`rounded-2xl border bg-gradient-to-br ${colorClass} overflow-hidden`}
    >
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left p-4 flex items-start justify-between gap-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-start gap-3">
          <div className={`w-2 h-full min-h-[2.5rem] rounded-full ${cfg.dot} opacity-80 shrink-0 mt-1`} />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Icon size={14} className={cfg.color} />
              <span className={`text-xs font-bold ${cfg.color} uppercase tracking-wide`}>{cfg.label}</span>
              {shift.financial_impact > 0 && (
                <span className="badge bg-white/10 text-slate-300 border border-white/10">
                  ${shift.financial_impact} impact
                </span>
              )}
            </div>
            <p className="text-sm font-bold text-white mt-1">{shift.shift_date}</p>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
              <Clock size={11} /> {shift.shift_start} – {shift.shift_end}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-xs text-slate-500">Match rate</p>
            <p className={`text-sm font-bold ${matched === total ? 'text-emerald-400' : 'text-amber-400'}`}>
              {matched}/{total}
            </p>
          </div>
          {open ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
        </div>
      </button>

      {/* Adjustment */}
      {shift.adjustment && (
        <div className="px-4 pb-3">
          <p className="text-xs text-slate-400 italic">→ {shift.adjustment}</p>
        </div>
      )}

      {/* Employees expanded */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.06] px-4 py-3 space-y-2">
              {shift.employees?.map((emp, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {emp.name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-200">{emp.name}</p>
                      <span className={`badge border ${ROLE_COLOR[emp.employee_role] || 'bg-slate-500/15 text-slate-400 border-slate-500/20'}`}>
                        {emp.employee_role}
                      </span>
                      <span className={`badge ${TYPE_COLOR[emp.employee_type] || 'bg-slate-500/15 text-slate-400'}`}>
                        {emp.employee_type?.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Prefers: {emp.preferred_days?.slice(0, 3).join(', ')}{emp.preferred_days?.length > 3 ? '…' : ''} · {emp.preferred_start}–{emp.preferred_end}
                    </p>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <div className={`flex items-center gap-1 text-xs font-semibold ${emp.preference_match ? 'text-emerald-400' : 'text-red-400'}`}>
                      {emp.preference_match ? <CheckCircle size={11} /> : <XCircle size={11} />}
                      {emp.preference_match ? 'Match' : 'No match'}
                    </div>
                    <p className="text-[10px] text-slate-600">
                      {emp.current_hours_assigned}h / {emp.max_hours_per_week}h/wk
                    </p>
                    {emp.within_hour_cap === false && (
                      <p className="text-[10px] text-amber-500">Over cap</p>
                    )}
                  </div>
                </div>
              ))}

              {shift.preference_summary && (
                <p className="text-xs text-slate-500 pt-1 text-center">{shift.preference_summary}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function CrewSchedule() {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/crew')
      .then(res => setShifts(res.data))
      .catch(() => setShifts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="card-solid overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
          <Users size={15} className="text-orange-400" />
        </div>
        <div>
          <p className="font-semibold text-white text-sm">CREW · Shift Schedule</p>
          <p className="text-xs text-slate-500">All upcoming shifts with preference matching</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {[
            { label: 'Understaffed', color: 'bg-red-500' },
            { label: 'Balanced', color: 'bg-emerald-500' },
            { label: 'Overstaffed', color: 'bg-amber-500' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${l.color}`} />
              <span className="text-[10px] text-slate-500 hidden lg:block">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {loading && [0,1,2,3].map(i => (
          <div key={i} className="h-28 rounded-2xl bg-white/[0.03] animate-pulse" />
        ))}
        {!loading && shifts.map((shift, i) => (
          <ShiftCard key={shift.shift_id} shift={shift} colorClass={SCENARIO_COLORS[i % SCENARIO_COLORS.length]} index={i} />
        ))}
        {!loading && !shifts.length && (
          <p className="text-slate-600 text-sm col-span-2 text-center py-8">No crew data available</p>
        )}
      </div>
    </div>
  );
}
