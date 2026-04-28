import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, Users, Calendar, AlertTriangle } from 'lucide-react'
import { apiDashboardManager } from '../api/client'

const fadeUp = (i = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
})

const MOCK = {
  staffing: {
    "Aarav Patel":    { start: "9:00 AM",  end: "3:00 PM", hours: 6  },
    "Michael Rivera": { start: "8:00 AM",  end: "5:00 PM", hours: 9  },
    "Sophia Kim":     { start: "12:00 PM", end: "6:00 PM", hours: 6  },
    "Daniel Brooks":  { start: "7:00 AM",  end: "3:00 PM", hours: 8  },
    "Emily Chen":     { start: "10:00 AM", end: "2:00 PM", hours: 4  },
  },
  rush_hours: ["11:30 AM", "1:00 PM", "6:30 PM", "8:00 PM"],
  employee_alerts: [],
}

// Convert time string to minutes from midnight for positioning
function timeToMin(t) {
  if (!t) return 0
  const [time, period] = t.split(' ')
  let [h, m] = time.split(':').map(Number)
  if (period === 'PM' && h !== 12) h += 12
  if (period === 'AM' && h === 12) h = 0
  return h * 60 + (m || 0)
}

const SHIFT_COLORS = [
  { bg: '#EFF6FF', border: '#BFDBFE', bar: '#3B82F6', text: '#1D4ED8' },
  { bg: '#F0FDF4', border: '#BBF7D0', bar: '#22C55E', text: '#166534' },
  { bg: '#FFF7ED', border: '#FED7AA', bar: '#F97316', text: '#9A3412' },
  { bg: '#FDF4FF', border: '#E9D5FF', bar: '#A78BFA', text: '#7E22CE' },
  { bg: '#FFFBEB', border: '#FDE68A', bar: '#FBBF24', text: '#92400E' },
]

const DAY_START = 6 * 60   // 6 AM
const DAY_END   = 22 * 60  // 10 PM
const DAY_RANGE = DAY_END - DAY_START

const HOUR_LABELS = Array.from({ length: 17 }, (_, i) => {
  const h = i + 6
  return h < 12 ? `${h}AM` : h === 12 ? '12PM' : `${h - 12}PM`
})

export default function SchedulingPage() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiDashboardManager()
      .then(res => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  const d = data || MOCK
  const staffing = d.staffing || {}
  const shifts = Object.entries(staffing).map(([name, info], i) => ({
    name, ...info,
    startMin: timeToMin(info.start),
    endMin: timeToMin(info.end),
    color: SHIFT_COLORS[i % SHIFT_COLORS.length],
  }))
  const rushHours = d.rush_hours || []
  const alerts = d.employee_alerts || []
  const totalHours = shifts.reduce((sum, s) => sum + (s.hours || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* Header */}
      <motion.div {...fadeUp(0)} style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>CREW Agent</p>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem', letterSpacing: '0.06em', color: 'var(--text-primary)', lineHeight: 1 }}>Shift Scheduling</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 6 }}>Optimized workforce plan for today</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ textAlign: 'center', padding: '10px 18px', background: 'white', border: '1px solid var(--border)', borderRadius: 12 }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem', color: 'var(--text-primary)', lineHeight: 1 }}>{shifts.length}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>Staff Today</div>
          </div>
          <div style={{ textAlign: 'center', padding: '10px 18px', background: 'white', border: '1px solid var(--border)', borderRadius: 12 }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem', color: 'var(--text-primary)', lineHeight: 1 }}>{totalHours}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>Total Hours</div>
          </div>
        </div>
      </motion.div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <motion.div {...fadeUp(1)} style={{ display: 'flex', gap: 10, padding: '12px 18px', background: '#FFF5F5', border: '1px solid #FECACA', borderRadius: 12 }}>
          <AlertTriangle size={15} color="#EF4444" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: '0.82rem', color: '#B91C1C' }}>{alerts.map((a, i) => <span key={i}>{typeof a === 'string' ? a : a.message}</span>)}</div>
        </motion.div>
      )}

      {/* Gantt Timeline */}
      <motion.div {...fadeUp(2)} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 16, padding: '28px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#FB923C', boxShadow: '0 0 4px #FB923C' }} />
          <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em', color: '#9A3412', textTransform: 'uppercase' }}>CREW</span>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginLeft: 4 }}>Daily Schedule Timeline</span>
        </div>

        {/* Hour labels */}
        <div style={{ display: 'flex', marginLeft: 140, marginBottom: 8, position: 'relative' }}>
          {HOUR_LABELS.map((label, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: `${(i / (HOUR_LABELS.length - 1)) * 100}%`,
              transform: 'translateX(-50%)',
              fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 500,
              whiteSpace: 'nowrap',
            }}>
              {label}
            </div>
          ))}
        </div>

        {/* Timeline rows */}
        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {shifts.map((shift, i) => {
            const leftPct  = Math.max(0, ((shift.startMin - DAY_START) / DAY_RANGE) * 100)
            const widthPct = Math.min(100 - leftPct, ((shift.endMin - shift.startMin) / DAY_RANGE) * 100)

            return (
              <motion.div key={shift.name} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                style={{ display: 'flex', alignItems: 'center', gap: 0, height: 44 }}>
                {/* Name */}
                <div style={{ width: 140, flexShrink: 0, paddingRight: 16 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{shift.name}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{shift.hours}h shift</div>
                </div>

                {/* Bar area */}
                <div style={{ flex: 1, position: 'relative', height: '100%', background: 'var(--surface)', borderRadius: 8, overflow: 'hidden' }}>
                  {/* Grid lines */}
                  {HOUR_LABELS.map((_, hi) => (
                    <div key={hi} style={{ position: 'absolute', top: 0, bottom: 0, left: `${(hi / (HOUR_LABELS.length - 1)) * 100}%`, width: 1, background: 'var(--border-soft)' }} />
                  ))}

                  {/* Rush hour highlights */}
                  {rushHours.map((rh, ri) => {
                    const rhMin = timeToMin(rh)
                    const rhLeft = ((rhMin - DAY_START) / DAY_RANGE) * 100
                    return (
                      <div key={ri} style={{ position: 'absolute', top: 0, bottom: 0, left: `${rhLeft}%`, width: '4%', background: 'rgba(251,191,36,0.12)', borderLeft: '1px solid rgba(251,191,36,0.3)' }} />
                    )
                  })}

                  {/* Shift bar */}
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: `${widthPct}%`, opacity: 1 }}
                    transition={{ delay: 0.3 + i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      position: 'absolute', top: 6, bottom: 6,
                      left: `${leftPct}%`,
                      background: shift.color.bar,
                      borderRadius: 6,
                      display: 'flex', alignItems: 'center', paddingLeft: 10, overflow: 'hidden',
                      boxShadow: `0 2px 8px ${shift.color.bar}44`,
                    }}
                  >
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'white', whiteSpace: 'nowrap' }}>
                      {shift.start} – {shift.end}
                    </span>
                  </motion.div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-soft)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 8, borderRadius: 2, background: 'rgba(251,191,36,0.3)', border: '1px solid rgba(251,191,36,0.5)' }} />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Rush windows</span>
          </div>
        </div>
      </motion.div>

      {/* Shift detail cards */}
      <motion.div {...fadeUp(3)}>
        <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 14 }}>Shift Details</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {shifts.map((shift, i) => (
            <motion.div key={shift.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              style={{ background: 'white', border: `1px solid ${shift.color.border}`, borderRadius: 14, padding: '16px 18px', boxShadow: 'var(--shadow-xs)' }}
              whileHover={{ y: -2, boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: shift.color.bar, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>{shift.name[0]}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{shift.name}</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  <Clock size={12} color={shift.color.bar} />
                  {shift.start} – {shift.end}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  <Calendar size={12} color={shift.color.bar} />
                  {shift.hours} hours total
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
