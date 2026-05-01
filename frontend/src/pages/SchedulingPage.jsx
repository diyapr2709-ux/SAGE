import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, Users, Calendar, AlertTriangle, CheckCircle,
  XCircle, RefreshCw, LogIn, LogOut, ChevronDown, ChevronUp,
} from 'lucide-react'
import {
  apiDashboardCrew, apiGetShiftRequests, apiActionShiftRequest,
  apiGetAttendance, apiGetShiftLogSummary,
} from '../api/client'
import { useAuth } from '../context/AuthContext'

const fadeUp = (i = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
})

function to12h(t24) {
  if (!t24) return ''
  const [h, m] = t24.split(':').map(Number)
  const p = h >= 12 ? 'PM' : 'AM'
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${h12}:${String(m).padStart(2, '0')} ${p}`
}

function shiftHours(s, e) {
  if (!s || !e) return 0
  const [sh, sm] = s.split(':').map(Number)
  const [eh, em] = e.split(':').map(Number)
  let d = (eh * 60 + em) - (sh * 60 + sm)
  if (d <= 0) d += 1440
  return Math.round(d / 6) / 10
}

function timeToMinutes(t24) {
  if (!t24) return 0
  const [h, m] = t24.split(':').map(Number)
  return h * 60 + m
}

const DAY_START = 7 * 60   // 7 AM
const DAY_END   = 23 * 60  // 11 PM
const DAY_RANGE = DAY_END - DAY_START
const HOUR_LABELS = Array.from({ length: 17 }, (_, i) => {
  const h = i + 7
  return h < 12 ? `${h}AM` : h === 12 ? '12PM' : `${h - 12}PM`
})

const STATUS_COLOR = {
  understaffed: { bg: '#FFF5F5', border: '#FECACA', text: '#DC2626', bar: '#EF4444' },
  overstaffed:  { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', bar: '#FBBF24' },
  balanced:     { bg: '#F0FDF4', border: '#BBF7D0', text: '#166534', bar: '#22C55E' },
  optimal:      { bg: '#F0FDF4', border: '#BBF7D0', text: '#166534', bar: '#22C55E' },
}

const EMP_COLORS = ['#3B82F6','#8B5CF6','#F97316','#22C55E','#EC4899','#14B8A6','#EAB308','#6366F1']

const DAYS_ORDER = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
const DAY_SHORT  = { Monday:'Mon', Tuesday:'Tue', Wednesday:'Wed', Thursday:'Thu', Friday:'Fri', Saturday:'Sat', Sunday:'Sun' }

function dayOfWeek(dateStr) {
  try {
    const d = new Date(dateStr + 'T00:00:00')
    return DAYS_ORDER[d.getDay() === 0 ? 6 : d.getDay() - 1]
  } catch { return '' }
}

// ── Gantt row for one shift ────────────────────────────────────────
function GanttRow({ shift, attendance, empColorMap }) {
  const [expanded, setExpanded] = useState(false)
  const sc = STATUS_COLOR[shift.staffing_status] || STATUS_COLOR.balanced
  const leftPct  = Math.max(0, ((timeToMinutes(shift.shift_start) - DAY_START) / DAY_RANGE) * 100)
  const widthPct = Math.min(100 - leftPct, (shiftHours(shift.shift_start, shift.shift_end) * 60 / DAY_RANGE) * 100)

  const clockedIn = attendance.filter(r => r.shift_id === shift.shift_id && r.clock_in && !r.clock_out)
  const clockedOut = attendance.filter(r => r.shift_id === shift.shift_id && r.clock_out)

  return (
    <div style={{ marginBottom: 2 }}>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{ display: 'flex', alignItems: 'center', gap: 0, height: 48, cursor: 'pointer' }}
      >
        {/* Shift label */}
        <div style={{ width: 160, flexShrink: 0, paddingRight: 14 }}>
          <div style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {dayOfWeek(shift.shift_date)} · {to12h(shift.shift_start)}
          </div>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc.bar, display: 'inline-block' }} />
            {shift.staffing_status} · {shiftHours(shift.shift_start, shift.shift_end)}h
          </div>
        </div>

        {/* Bar */}
        <div style={{ flex: 1, position: 'relative', height: 36, background: 'var(--surface)', borderRadius: 8, overflow: 'hidden' }}>
          {HOUR_LABELS.map((_, hi) => (
            <div key={hi} style={{ position: 'absolute', top: 0, bottom: 0, left: `${(hi / (HOUR_LABELS.length - 1)) * 100}%`, width: 1, background: 'rgba(0,0,0,0.05)' }} />
          ))}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${widthPct}%` }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: 'absolute', top: 4, bottom: 4, left: `${leftPct}%`, background: sc.bar, borderRadius: 6, display: 'flex', alignItems: 'center', paddingLeft: 10, overflow: 'hidden', boxShadow: `0 2px 8px ${sc.bar}44` }}
          >
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'white', whiteSpace: 'nowrap' }}>
              {to12h(shift.shift_start)} – {to12h(shift.shift_end)}
            </span>
          </motion.div>

          {/* Clock-in dots */}
          {clockedIn.map((r, i) => {
            const color = empColorMap[r.name] || '#6B7280'
            return (
              <div key={i} title={`${r.name} clocked in`} style={{ position: 'absolute', top: '50%', left: `${leftPct + 2}%`, transform: 'translateY(-50%)', width: 8, height: 8, borderRadius: '50%', background: color, border: '1.5px solid white', boxShadow: `0 0 4px ${color}`, marginLeft: i * 10 }} />
            )
          })}
        </div>

        {/* Badges */}
        <div style={{ width: 80, flexShrink: 0, paddingLeft: 12, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
          {clockedIn.length > 0 && (
            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#16A34A', background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '2px 6px', borderRadius: 99 }}>
              {clockedIn.length} in
            </div>
          )}
          {clockedOut.length > 0 && (
            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#6B7280', background: '#F9FAFB', border: '1px solid #E5E7EB', padding: '2px 6px', borderRadius: 99 }}>
              {clockedOut.length} out
            </div>
          )}
          <div style={{ color: 'var(--text-muted)' }}>{expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}</div>
        </div>
      </div>

      {/* Expanded: employee list + attendance */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden', marginLeft: 160, marginBottom: 8 }}
          >
            <div style={{ background: 'var(--off-white)', border: '1px solid var(--border-soft)', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 7 }}>
              {shift.adjustment && shift.adjustment !== 'No change needed' && (
                <div style={{ fontSize: '0.75rem', color: sc.text, background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: 6, padding: '5px 10px', marginBottom: 4 }}>
                  ⚠ {shift.adjustment}
                </div>
              )}
              {(shift.employees || []).map((emp, i) => {
                const clIn  = attendance.find(r => r.shift_id === shift.shift_id && r.name === emp.name && r.clock_in && !r.clock_out)
                const clOut = attendance.find(r => r.shift_id === shift.shift_id && r.name === emp.name && r.clock_out)
                const color = empColorMap[emp.name] || '#6B7280'
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.72rem', flexShrink: 0 }}>
                      {emp.name[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{emp.name}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{emp.employee_role} · {emp.max_hours_per_week}h/wk cap · {emp.preference_label || ''}</div>
                    </div>
                    {clOut ? (
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#6B7280', background: '#F9FAFB', border: '1px solid #E5E7EB', padding: '2px 8px', borderRadius: 99, flexShrink: 0 }}>
                        Clocked out · {clOut.duration_min}min
                      </div>
                    ) : clIn ? (
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#16A34A', background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '2px 8px', borderRadius: 99, flexShrink: 0 }}>
                        ● Clocked in
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 99, background: 'rgba(0,0,0,0.03)', flexShrink: 0 }}>
                        Not clocked in
                      </div>
                    )}
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: emp.selection_status === 'recommended' ? '#16A34A' : emp.selection_status === 'not_recommended' ? '#DC2626' : '#92400E', padding: '2px 8px', borderRadius: 99, background: emp.selection_status === 'recommended' ? '#F0FDF4' : emp.selection_status === 'not_recommended' ? '#FFF5F5' : '#FFFBEB', border: `1px solid ${emp.selection_status === 'recommended' ? '#BBF7D0' : emp.selection_status === 'not_recommended' ? '#FECACA' : '#FDE68A'}`, flexShrink: 0 }}>
                      {emp.selection_status || 'acceptable'}
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Shift Requests Panel ───────────────────────────────────────────
function ShiftRequestsPanel() {
  const [requests, setRequests] = useState([])
  const [acting, setActing]     = useState({})

  const load = useCallback(() => {
    apiGetShiftRequests().then(r => setRequests(r.data.requests || [])).catch(() => {})
  }, [])
  useEffect(() => { load() }, [load])

  const act = async (req, status) => {
    const key = `${req.shift_id}-${req.email}`
    setActing(a => ({ ...a, [key]: true }))
    try {
      await apiActionShiftRequest({ shift_id: req.shift_id, email: req.email, status })
      load()
    } finally { setActing(a => ({ ...a, [key]: false })) }
  }

  const pending  = requests.filter(r => r.status === 'pending')
  const resolved = requests.filter(r => r.status !== 'pending')

  if (requests.length === 0) return (
    <div style={{ textAlign: 'center', padding: '32px', background: 'white', border: '1px solid var(--border)', borderRadius: 14, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
      <CheckCircle size={18} color="#22C55E" style={{ marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
      No pending shift requests
    </div>
  )

  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 16, padding: '22px', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#FB923C', boxShadow: '0 0 4px #FB923C' }} />
          <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em', color: '#9A3412', textTransform: 'uppercase' }}>CREW</span>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Employee Requests</span>
        </div>
        {pending.length > 0 && (
          <div style={{ padding: '3px 10px', borderRadius: 99, background: '#FFF5F5', border: '1px solid #FECACA', fontSize: '0.72rem', fontWeight: 700, color: '#DC2626' }}>
            {pending.length} pending
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {requests.map((req, i) => {
          const key = `${req.shift_id}-${req.email}`
          const isPending = req.status === 'pending'
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: isPending ? 'var(--off-white)' : (req.status === 'approved' ? '#F0FDF4' : '#FFF5F5'), border: `1px solid ${isPending ? 'var(--border-soft)' : req.status === 'approved' ? '#BBF7D0' : '#FECACA'}`, borderRadius: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #60A5FA, #3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.82rem' }}>
                {req.name?.[0] || '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.83rem', color: 'var(--text-primary)' }}>{req.name}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}>
                  {req.shift_id} · <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{req.request_type}</span>
                  {req.note && ` — "${req.note}"`}
                </div>
              </div>
              {isPending ? (
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <motion.button onClick={() => act(req, 'approved')} disabled={acting[key]} whileTap={{ scale: 0.95 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: 'none', background: '#22C55E', color: 'white', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}>
                    <CheckCircle size={12} />Approve
                  </motion.button>
                  <motion.button onClick={() => act(req, 'rejected')} disabled={acting[key]} whileTap={{ scale: 0.95 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1px solid #FECACA', background: 'white', color: '#DC2626', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}>
                    <XCircle size={12} />Reject
                  </motion.button>
                </div>
              ) : (
                <div style={{ padding: '4px 10px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 700, background: req.status === 'approved' ? '#F0FDF4' : '#FFF5F5', border: `1px solid ${req.status === 'approved' ? '#BBF7D0' : '#FECACA'}`, color: req.status === 'approved' ? '#16A34A' : '#DC2626', textTransform: 'capitalize', flexShrink: 0 }}>
                  {req.status}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Attendance feed ────────────────────────────────────────────────
function AttendanceFeed({ attendance }) {
  const recent = [...attendance].reverse().slice(0, 10)
  if (recent.length === 0) return null
  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: '20px', boxShadow: 'var(--shadow-xs)' }}>
      <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>Live Attendance</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {recent.map((r, i) => {
          const isIn = !r.clock_out
          const time = new Date(isIn ? r.clock_in : r.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: isIn ? '#F0FDF4' : 'var(--surface)', border: `1px solid ${isIn ? '#BBF7D0' : 'var(--border-soft)'}`, borderRadius: 9 }}>
              {isIn ? <LogIn size={13} color="#22C55E" /> : <LogOut size={13} color="#6B7280" />}
              <div style={{ flex: 1, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{r.name}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.shift_id}</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: isIn ? '#16A34A' : '#6B7280' }}>
                {isIn ? 'IN' : 'OUT'} {time}
                {r.duration_min && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> · {r.duration_min}min</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Shift Log Summary (cash/tips per shift) ────────────────────────
function ShiftLogSummary() {
  const [data, setData] = useState(null)

  useEffect(() => {
    apiGetShiftLogSummary().then(r => setData(r.data)).catch(() => {})
  }, [])

  if (!data || data.summary.length === 0) return null

  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 16, padding: '22px', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 4px #22C55E' }} />
          <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em', color: '#166534', textTransform: 'uppercase' }}>Cash & Tips Log</span>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginLeft: 2 }}>Shift Financial Summary</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { label: 'Total Tips', value: `$${data.totals.total_tips.toFixed(2)}`, color: '#22C55E' },
            { label: 'Net Cash', value: `$${data.totals.total_net_cash.toFixed(2)}`, color: '#3B82F6' },
            { label: 'Entries', value: data.totals.entries, color: 'var(--text-primary)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ textAlign: 'center', padding: '6px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', color, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.summary.map((s, i) => (
          <div key={i} style={{ border: '1px solid var(--border-soft)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--off-white)' }}>
              <div style={{ flex: 1, fontWeight: 700, fontSize: '0.83rem', color: 'var(--text-primary)' }}>{s.shift_id.replace(/_/g, ' ')}</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#22C55E' }}>Tips: ${s.tips.toFixed(2)}</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#3B82F6' }}>Net Cash: ${s.net_cash.toFixed(2)}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{s.entries.length} {s.entries.length === 1 ? 'entry' : 'entries'}</div>
            </div>
            {s.entries.map((e, j) => (
              <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 14px', borderTop: '1px solid var(--border-soft)', background: 'white' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg, #60A5FA, #3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.7rem', flexShrink: 0 }}>{e.name[0]}</div>
                <div style={{ flex: 1, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{e.name}</div>
                <div style={{ fontSize: '0.72rem', color: '#22C55E', fontWeight: 600 }}>+${e.tips.toFixed(2)} tips</div>
                <div style={{ fontSize: '0.72rem', color: '#3B82F6', fontWeight: 600 }}>${e.net_cash.toFixed(2)} net</div>
                {e.notes && <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.notes}>{e.notes}</div>}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}


// ── Main ──────────────────────────────────────────────────────────
export default function SchedulingPage() {
  const [shifts, setShifts]         = useState([])
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading]       = useState(true)
  const [view, setView]             = useState('gantt')   // 'gantt' | 'week'
  const { user } = useAuth()

  const loadAttendance = useCallback(() => {
    apiGetAttendance().then(r => setAttendance(r.data.attendance || [])).catch(() => {})
  }, [])

  useEffect(() => {
    apiDashboardCrew()
      .then(res => {
        const raw = res.data
        setShifts(Array.isArray(raw) ? raw : (raw?.shifts || []))
      })
      .catch(() => setShifts([]))
      .finally(() => setLoading(false))
    loadAttendance()
    const iv = setInterval(loadAttendance, 20000)
    return () => clearInterval(iv)
  }, [loadAttendance])

  // Build a stable color map for employees across all shifts
  const empColorMap = {}
  const empNames = []
  shifts.forEach(s => (s.employees || []).forEach(e => { if (!empNames.includes(e.name)) empNames.push(e.name) }))
  empNames.forEach((n, i) => { empColorMap[n] = EMP_COLORS[i % EMP_COLORS.length] })

  const totalHours    = shifts.reduce((acc, s) => acc + shiftHours(s.shift_start, s.shift_end), 0)
  const understaffed  = shifts.filter(s => s.staffing_status === 'understaffed').length
  const clockedInNow  = new Set(attendance.filter(r => r.clock_in && !r.clock_out).map(r => r.name)).size

  // Group shifts by day for week view
  const byDay = {}
  DAYS_ORDER.forEach(d => { byDay[d] = [] })
  shifts.forEach(s => {
    const d = dayOfWeek(s.shift_date)
    if (d) byDay[d].push(s)
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <motion.div {...fadeUp(0)} style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>CREW Agent</p>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem', letterSpacing: '0.06em', color: 'var(--text-primary)', lineHeight: 1 }}>Shift Scheduling</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 6 }}>Current week · auto-updating</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { val: shifts.length,   label: 'Shifts This Week', color: 'var(--text-primary)' },
            { val: `${totalHours}h`, label: 'Total Hours',      color: 'var(--text-primary)' },
            { val: understaffed,    label: 'Need Coverage',     color: understaffed > 0 ? '#EF4444' : '#22C55E' },
            { val: clockedInNow,    label: 'Clocked In Now',    color: clockedInNow > 0 ? '#22C55E' : 'var(--text-primary)' },
          ].map(({ val, label, color }) => (
            <div key={label} style={{ textAlign: 'center', padding: '10px 16px', background: 'white', border: '1px solid var(--border)', borderRadius: 12 }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color, lineHeight: 1 }}>{val}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap' }}>{label}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* View toggle */}
      <div style={{ display: 'flex', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 3, gap: 2, width: 'fit-content' }}>
        {[{ key: 'gantt', label: 'Timeline' }, { key: 'week', label: 'Week View' }].map(t => (
          <button key={t.key} onClick={() => setView(t.key)} style={{ padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", fontSize: '0.82rem', fontWeight: 600, background: view === t.key ? 'white' : 'transparent', color: view === t.key ? 'var(--text-primary)' : 'var(--text-muted)', boxShadow: view === t.key ? 'var(--shadow-sm)' : 'none', transition: 'all 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }} />
        </div>
      )}

      {/* ── Gantt Timeline ─────────────────────────────────── */}
      {!loading && view === 'gantt' && (
        <motion.div {...fadeUp(1)} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 16, padding: '24px 28px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#FB923C', boxShadow: '0 0 4px #FB923C' }} />
            <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em', color: '#9A3412', textTransform: 'uppercase' }}>CREW</span>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginLeft: 4 }}>Week Timeline</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>Click a row to expand employees & attendance</span>
          </div>

          {/* Hour ruler */}
          <div style={{ display: 'flex', marginLeft: 160, marginBottom: 6, position: 'relative', height: 16 }}>
            {HOUR_LABELS.map((label, i) => (
              <div key={i} style={{ position: 'absolute', left: `${(i / (HOUR_LABELS.length - 1)) * 100}%`, transform: 'translateX(-50%)', fontSize: '0.62rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {label}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {shifts.map((shift, i) => (
              <GanttRow key={shift.shift_id || i} shift={shift} attendance={attendance} empColorMap={empColorMap} />
            ))}
          </div>

          {/* Employee legend */}
          <div style={{ display: 'flex', gap: 10, marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border-soft)', flexWrap: 'wrap' }}>
            {empNames.map((name, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: empColorMap[name] }} />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{name}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Week View ─────────────────────────────────────── */}
      {!loading && view === 'week' && (
        <motion.div {...fadeUp(1)} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 16, padding: '24px 28px', boxShadow: 'var(--shadow-sm)', overflowX: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#FB923C', boxShadow: '0 0 4px #FB923C' }} />
            <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em', color: '#9A3412', textTransform: 'uppercase' }}>CREW</span>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginLeft: 4 }}>Weekly Schedule</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, minWidth: 700 }}>
            {DAYS_ORDER.map(day => {
              const dayShifts = byDay[day] || []
              const isToday = dayShifts.length > 0 && new Date(dayShifts[0].shift_date).toDateString() === new Date().toDateString()
              return (
                <div key={day}>
                  <div style={{ textAlign: 'center', padding: '8px 4px', fontWeight: 700, fontSize: '0.75rem', color: isToday ? '#3B82F6' : 'var(--text-primary)', background: isToday ? '#EFF6FF' : 'var(--surface)', border: `1px solid ${isToday ? '#BFDBFE' : 'var(--border)'}`, borderRadius: '8px 8px 0 0', borderBottom: 'none' }}>
                    {DAY_SHORT[day]}
                    {dayShifts[0]?.shift_date && <div style={{ fontSize: '0.62rem', fontWeight: 400, color: 'var(--text-muted)' }}>{dayShifts[0].shift_date.slice(5)}</div>}
                  </div>
                  <div style={{ minHeight: 100, border: '1px solid var(--border)', borderRadius: '0 0 8px 8px', padding: 5, display: 'flex', flexDirection: 'column', gap: 5, background: isToday ? '#F8FBFF' : 'white' }}>
                    {dayShifts.length === 0
                      ? <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: 'var(--text-muted)' }}>Off</div>
                      : dayShifts.map((s, si) => {
                          const sc = STATUS_COLOR[s.staffing_status] || STATUS_COLOR.balanced
                          const clIn = attendance.filter(r => r.shift_id === s.shift_id && r.clock_in && !r.clock_out).length
                          return (
                            <div key={si} style={{ background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: 6, padding: '5px 7px' }}>
                              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: sc.text }}>{to12h(s.shift_start)}–{to12h(s.shift_end)}</div>
                              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.employees?.length || 0} staff</div>
                              {clIn > 0 && <div style={{ fontSize: '0.6rem', color: '#16A34A', fontWeight: 700 }}>● {clIn} clocked in</div>}
                              {s.staffing_status === 'understaffed' && <div style={{ fontSize: '0.58rem', color: '#DC2626', fontWeight: 700 }}>⚠ Understaffed</div>}
                            </div>
                          )
                        })
                    }
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* ── Attendance feed + Requests (managers) ──────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: attendance.length > 0 ? '1fr 1fr' : '1fr', gap: 16 }}>
        {attendance.length > 0 && (
          <motion.div {...fadeUp(2)}>
            <AttendanceFeed attendance={attendance} />
          </motion.div>
        )}
        {(user?.role === 'ceo' || user?.role === 'manager' || user?.role === 'admin') && (
          <motion.div {...fadeUp(3)}>
            <ShiftRequestsPanel />
          </motion.div>
        )}
      </div>

      {/* ── Cash & Tips Summary (managers only) ────────────── */}
      {(user?.role === 'ceo' || user?.role === 'manager' || user?.role === 'admin') && (
        <motion.div {...fadeUp(4)}>
          <ShiftLogSummary />
        </motion.div>
      )}
    </div>
  )
}
