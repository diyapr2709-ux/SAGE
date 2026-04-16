import { useEffect, useState } from 'react';
import { RefreshCw, Star, AlertTriangle, CheckCircle, Clock, Users, User } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import EmployeeOfWeek from '../components/EmployeeOfWeek';
import ShiftSelector from '../components/ShiftSelector';

function FeedbackSection({ warnings = [], recognitions = [] }) {
  if (!warnings.length && !recognitions.length) return null;

  return (
    <div className="card-solid overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
          <Star size={15} className="text-yellow-400" />
        </div>
        <div>
          <p className="font-semibold text-white text-sm">Feedback from SHELF</p>
          <p className="text-xs text-slate-500">{recognitions.length} recognitions · {warnings.length} warnings</p>
        </div>
      </div>
      <div className="px-5 py-4 space-y-3">
        {recognitions.map((r, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl"
          >
            <CheckCircle size={18} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-emerald-300">{r.employee || r.to} — Recognition</p>
              <p className="text-sm text-emerald-500/80 mt-0.5">{r.message_to_employee || r.message}</p>
            </div>
          </motion.div>
        ))}
        {warnings.map((w, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`flex gap-3 p-4 rounded-xl border ${
              w.urgency === 'critical' ? 'bg-red-500/10 border-red-500/20' :
              w.urgency === 'high'     ? 'bg-orange-500/10 border-orange-500/20' :
                                         'bg-amber-500/10 border-amber-500/20'
            }`}
          >
            <AlertTriangle size={18} className={`shrink-0 mt-0.5 ${
              w.urgency === 'critical' ? 'text-red-400' :
              w.urgency === 'high'     ? 'text-orange-400' : 'text-amber-400'
            }`} />
            <div>
              <p className="text-sm font-bold text-slate-200">
                {w.employee || w.to}
                {w.role && <span className="font-normal text-slate-500 ml-1.5">· {w.role}</span>}
              </p>
              <p className="text-sm text-slate-400 mt-0.5">{w.message_to_employee || w.message}</p>
              {w.action && <p className="text-xs text-slate-500 mt-1.5">Action: <span className="text-slate-300">{w.action}</span></p>}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function TeamRoster({ employees = [] }) {
  if (!employees.length) return null;
  return (
    <div className="card-solid overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
          <Users size={15} className="text-indigo-400" />
        </div>
        <div>
          <p className="font-semibold text-white text-sm">Team · SHELF Intelligence</p>
          <p className="text-xs text-slate-500">{employees.length} team members</p>
        </div>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {employees.map((emp, i) => (
          <div key={i} className="px-5 py-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {emp.name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-slate-200">{emp.name}</p>
                <span className="badge bg-slate-500/15 text-slate-400 border border-slate-500/20">{emp.role}</span>
                {emp.flags?.map((f, fi) => (
                  <span key={fi} className="badge badge-high">{f}</span>
                ))}
              </div>
              {emp.performance_notes && (
                <p className="text-xs text-slate-500 mt-0.5 truncate">{emp.performance_notes}</p>
              )}
            </div>
            <div className="text-right text-xs text-slate-600 shrink-0">
              {(emp.hours_per_week ?? emp.current_hours_assigned) != null && (
                <p>{emp.hours_per_week ?? emp.current_hours_assigned}h/wk</p>
              )}
              {emp.monthly_cost != null && (
                <p className="font-semibold text-slate-400 mt-0.5">${emp.monthly_cost?.toLocaleString()}/mo</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/employee')
      .then(res => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const eotw = data?.employee_of_the_week;

  return (
    <Layout>
      <div className="space-y-5 max-w-4xl">

        {/* Hero greeting */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/25">
            <User size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {greeting}, {user?.full_name?.split(' ')[0] || 'there'}
            </h1>
            {data?.frank_line && (
              <p className="text-sm text-slate-500 mt-0.5">{data.frank_line}</p>
            )}
          </div>
        </motion.div>

        {loading && (
          <div className="flex items-center justify-center h-48">
            <div className="flex items-center gap-3 text-slate-500">
              <RefreshCw size={16} className="animate-spin" />
              <span className="text-sm">Loading your dashboard…</span>
            </div>
          </div>
        )}

        {!loading && data && (
          <>
            {/* Employee of the Week — visible to all */}
            <EmployeeOfWeek eotw={eotw} />

            {/* Feedback */}
            <FeedbackSection warnings={data.warnings || []} recognitions={data.recognitions || []} />

            {/* Rush hours + Shift */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {data.rush_hours?.length > 0 && (
                <div className="card-solid overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                      <Clock size={15} className="text-amber-400" />
                    </div>
                    <p className="font-semibold text-white text-sm">Rush Windows · PULSE</p>
                  </div>
                  <div className="px-5 py-4 space-y-2">
                    {data.rush_hours.map((r, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                        <div>
                          <p className="text-sm font-semibold text-amber-300">{r.window}</p>
                          <p className="text-xs text-slate-500 mt-0.5">${r.expected_revenue?.toFixed(0)} expected</p>
                        </div>
                        <span className={`badge ${r.urgency === 'high' ? 'badge-high' : 'badge-medium'}`}>{r.urgency}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.my_schedule && Object.keys(data.my_schedule).length > 0 && (
                <div className="card-solid overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                      <Clock size={15} className="text-blue-400" />
                    </div>
                    <p className="font-semibold text-white text-sm">My Shift · CREW</p>
                  </div>
                  <div className="px-5 py-4 space-y-2">
                    {[
                      { label: 'Date', val: data.my_schedule.shift_date },
                      { label: 'Hours', val: data.my_schedule.shift_start ? `${data.my_schedule.shift_start} – ${data.my_schedule.shift_end}` : null },
                      { label: 'Status', val: data.my_schedule.staffing_status },
                      { label: 'Impact', val: data.my_schedule.financial_impact ? `$${data.my_schedule.financial_impact}` : null },
                    ].filter(r => r.val).map(row => (
                      <div key={row.label} className="flex justify-between items-center py-1.5 border-b border-white/[0.04] last:border-0">
                        <span className="text-xs text-slate-500">{row.label}</span>
                        <span className={`text-sm font-semibold ${
                          row.label === 'Status' && row.val === 'balanced' ? 'text-emerald-400' :
                          row.label === 'Status' ? 'text-amber-400' : 'text-slate-200'
                        }`}>{row.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Tasks */}
            <div className="card-solid p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <CheckCircle size={15} className="text-emerald-400" />
                </div>
                <p className="font-semibold text-white text-sm">Today's Tasks</p>
              </div>
              <ul className="space-y-2.5">
                {(data.tasks || []).map((task, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-slate-400 group">
                    <span className="w-5 h-5 rounded-full border-2 border-white/10 shrink-0 group-hover:border-indigo-500/50 transition-colors" />
                    {task}
                  </li>
                ))}
              </ul>
            </div>

            {/* Shift scheduling — employees pick their shifts */}
            <ShiftSelector employeeName={user?.full_name} />

            <TeamRoster employees={data.employees || []} />
          </>
        )}
      </div>
    </Layout>
  );
}
