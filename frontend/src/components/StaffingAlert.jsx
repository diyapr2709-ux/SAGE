import { Users, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

const STATUS = {
  understaffed: { icon: XCircle,     color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20',     label: 'Understaffed' },
  overstaffed:  { icon: AlertCircle, color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20', label: 'Overstaffed'  },
  balanced:     { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'Balanced' },
};

export default function StaffingAlert({ staffing = {} }) {
  const status = staffing.staffing_status || 'balanced';
  const cfg = STATUS[status] || STATUS.balanced;
  const Icon = cfg.icon;
  const employees = staffing.employees || [];

  return (
    <div className="card-solid overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
          <Users size={15} className="text-orange-400" />
        </div>
        <div>
          <p className="font-semibold text-white text-sm">Staffing · CREW</p>
          <p className="text-xs text-slate-500">{staffing.shift_date || 'Current shift'}</p>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Status */}
        <div className={`flex items-center gap-3 p-3 rounded-xl border ${cfg.bg}`}>
          <Icon size={18} className={cfg.color} />
          <div>
            <p className="text-sm font-bold text-white">{cfg.label}</p>
            {staffing.adjustment && (
              <p className="text-xs text-slate-400 mt-0.5">{staffing.adjustment}</p>
            )}
          </div>
          {staffing.financial_impact > 0 && (
            <span className="ml-auto text-xs font-bold text-white bg-white/10 px-2 py-1 rounded-lg">
              ${staffing.financial_impact}
            </span>
          )}
        </div>

        {/* Shift info */}
        {staffing.shift_start && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white/[0.03] rounded-lg p-2.5">
              <p className="text-slate-600 mb-0.5">Shift</p>
              <p className="text-slate-200 font-semibold">{staffing.shift_start}–{staffing.shift_end}</p>
            </div>
            <div className="bg-white/[0.03] rounded-lg p-2.5">
              <p className="text-slate-600 mb-0.5">Status</p>
              <p className={`font-semibold ${cfg.color}`}>{cfg.label}</p>
            </div>
          </div>
        )}

        {/* Preference summary */}
        {staffing.preference_summary && (
          <p className="text-xs text-slate-500 bg-white/[0.02] rounded-lg px-3 py-2">
            {staffing.preference_summary}
          </p>
        )}

        {/* Employees */}
        {employees.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">On Shift</p>
            {employees.map((emp, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg hover:bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                    {emp.name?.[0]}
                  </div>
                  <span className="font-medium text-slate-300">{emp.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-600">{emp.employee_role || emp.role}</span>
                  {emp.preference_match != null && (
                    <span className={emp.preference_match ? 'text-emerald-400' : 'text-amber-400'}>
                      {emp.preference_match ? '✓' : '✗'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
