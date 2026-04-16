import { useState, useEffect } from 'react';
import { Calendar, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

const STATUS_COLORS = {
  understaffed: 'border-red-500/30 bg-red-500/10',
  overstaffed:  'border-amber-500/30 bg-amber-500/10',
  balanced:     'border-emerald-500/30 bg-emerald-500/10',
};

export default function ShiftSelector({ employeeName }) {
  const [shifts, setShifts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [confirmed, setConfirmed] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/crew')
      .then(res => setShifts(res.data))
      .catch(() => setShifts([]))
      .finally(() => setLoading(false));
  }, []);

  // Find this employee across all shifts
  const myShifts = shifts.map(shift => {
    const me = shift.employees?.find(e =>
      employeeName && e.name?.toLowerCase().includes(employeeName.toLowerCase().split(' ')[0])
    );
    return me ? { ...shift, myData: me } : null;
  }).filter(Boolean);

  const handleConfirm = (shiftId) => {
    setConfirmed(shiftId);
    setSelected(null);
  };

  return (
    <div className="card-solid overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
          <Calendar size={15} className="text-indigo-400" />
        </div>
        <div>
          <p className="font-semibold text-white text-sm">Pick My Shifts · CREW</p>
          <p className="text-xs text-slate-500">Select shifts that work for your schedule</p>
        </div>
      </div>

      <div className="px-5 py-4 space-y-3">
        {loading && (
          <div className="space-y-2">
            {[0,1,2].map(i => <div key={i} className="h-16 rounded-xl bg-white/[0.03] animate-pulse" />)}
          </div>
        )}

        {!loading && shifts.map((shift, i) => {
          const myData = shift.employees?.find(e =>
            employeeName && e.name?.toLowerCase().includes(employeeName.toLowerCase().split(' ')[0])
          );
          const canSelect = myData?.can_select_shift ?? true;
          const isConfirmed = confirmed === shift.shift_id;
          const isSelected = selected === shift.shift_id;

          return (
            <motion.div
              key={shift.shift_id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`rounded-xl border p-4 transition-all ${
                isConfirmed ? 'border-emerald-500/40 bg-emerald-500/10' :
                isSelected  ? 'border-indigo-500/40 bg-indigo-500/10' :
                STATUS_COLORS[shift.staffing_status] || 'border-white/10 bg-white/[0.02]'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-white">{shift.shift_date}</p>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock size={10} /> {shift.shift_start}–{shift.shift_end}
                    </span>
                    <span className={`badge ${
                      shift.staffing_status === 'understaffed' ? 'badge-critical' :
                      shift.staffing_status === 'overstaffed' ? 'badge-medium' : 'badge-low'
                    }`}>{shift.staffing_status}</span>
                  </div>

                  {myData && (
                    <p className={`text-xs mt-1 flex items-center gap-1 ${canSelect ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {canSelect
                        ? <><CheckCircle size={11} /> {myData.selection_note}</>
                        : <><XCircle size={11} /> {myData.selection_note}</>
                      }
                    </p>
                  )}
                  {!myData && (
                    <p className="text-xs text-slate-600 mt-1">Not assigned to this shift</p>
                  )}
                </div>

                <div className="shrink-0">
                  {isConfirmed ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-400 font-bold">
                      <CheckCircle size={14} /> Confirmed
                    </span>
                  ) : (
                    <button
                      onClick={() => isSelected ? handleConfirm(shift.shift_id) : setSelected(shift.shift_id)}
                      disabled={!canSelect && !myData}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        !canSelect && myData ? 'bg-slate-700 text-slate-500 cursor-not-allowed' :
                        isSelected ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25' :
                        'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30'
                      }`}
                    >
                      {isSelected ? 'Confirm?' : 'Select'}
                    </button>
                  )}
                </div>
              </div>

              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center gap-2 text-xs text-amber-400">
                      <AlertTriangle size={12} />
                      Click Confirm to lock in this shift
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {!loading && shifts.length === 0 && (
          <p className="text-slate-600 text-sm text-center py-6">No shifts available</p>
        )}
      </div>
    </div>
  );
}
