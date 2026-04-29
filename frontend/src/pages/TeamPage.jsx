import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Star, AlertTriangle, CheckCircle, Users, DollarSign, Clock } from 'lucide-react'
import { apiDashboardManager, apiGetLastOutput } from '../api/client'

const fadeUp = (i = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
})

const MOCK = {
  employees: [
    { name: "Aarav Patel",    role: "Cashier",         hourly_rate: 14, hours_per_week: 18, performance_notes: "Excellent customer feedback, consistent, fast checkout" },
    { name: "Michael Rivera", role: "Shift Supervisor", hourly_rate: 22, hours_per_week: 40, performance_notes: "Strong leader, managing weekend rush, slight overtime concern" },
    { name: "Sophia Kim",     role: "Cashier",          hourly_rate: 14, hours_per_week: 12, performance_notes: "Reliable, prefers afternoon shifts, good upsell rate" },
    { name: "Daniel Brooks",  role: "Cook",             hourly_rate: 16, hours_per_week: 25, performance_notes: "Fast prep times, one health-code near-miss last month" },
    { name: "Emily Chen",     role: "Front Desk",       hourly_rate: 13, hours_per_week: 12, performance_notes: "Student worker, limited availability, very friendly" },
  ],
  employee_of_the_week: { name: "Aarav Patel" },
  warnings:      ["Daniel Brooks: health-code near-miss requires follow-up"],
  recognitions:  ["Aarav Patel: Top customer satisfaction scores this week", "Michael Rivera: Successfully managed weekend rush"],
}

const AVATAR_COLORS = [
  'linear-gradient(135deg, #60A5FA, #3B82F6)',
  'linear-gradient(135deg, #34D399, #10B981)',
  'linear-gradient(135deg, #F472B6, #EC4899)',
  'linear-gradient(135deg, #FB923C, #F97316)',
  'linear-gradient(135deg, #A78BFA, #8B5CF6)',
]

export default function TeamPage() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiDashboardManager()
      .then(res => setData(res.data))
      .catch(() => apiGetLastOutput().then(r => setData(r.data)).catch(() => setData(null)))
      .finally(() => setLoading(false))
  }, [])

  const d = data || MOCK

  const employees    = d.employee_intelligence?.employees || d.employees || MOCK.employees
  const eotw         = d.employee_of_the_week || d.employee_intelligence?.employee_of_the_week || {}
  const warnings     = d.employee_feedback?.warnings || d.warnings || []
  const recognitions = d.employee_feedback?.recognitions || d.recognitions || []

  const totalWeeklyHours = employees.reduce((s, e) => s + (e.hours_per_week || 0), 0)
  const totalWeeklyCost  = employees.reduce((s, e) => s + ((e.hourly_rate || 0) * (e.hours_per_week || 0)), 0)
  const avgHourlyRate    = employees.length > 0
    ? Math.round(employees.reduce((s, e) => s + (e.hourly_rate || 0), 0) / employees.length)
    : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* Header */}
      <motion.div {...fadeUp(0)} style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>SHELF Agent</p>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem', letterSpacing: '0.06em', color: 'var(--text-primary)', lineHeight: 1 }}>Team Intelligence</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 6 }}>Employee performance, recognition, and workforce data</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { label: 'Team Size',     value: employees.length,                     color: '#3B82F6' },
            { label: 'Weekly Hours',  value: totalWeeklyHours,                     color: '#8B5CF6' },
            { label: 'Weekly Cost',   value: `$${totalWeeklyCost.toLocaleString()}`, color: '#22C55E' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center', padding: '10px 18px', background: 'white', border: '1px solid var(--border)', borderRadius: 12 }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* EOTW highlight */}
      {eotw?.name && (
        <motion.div {...fadeUp(1)} style={{
          background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
          border: '1px solid var(--yellow-300)', borderRadius: 16, padding: '22px 26px',
          display: 'flex', alignItems: 'center', gap: 20, boxShadow: '0 4px 20px rgba(251,191,36,0.15)',
        }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #FBBF24, #F59E0B)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1.3rem', boxShadow: '0 0 20px rgba(251,191,36,0.5)', flexShrink: 0 }}>
            {eotw.name[0]}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Star size={16} fill="#FBBF24" color="#FBBF24" />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', color: '#92400E', textTransform: 'uppercase' }}>Employee of the Week</span>
            </div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', letterSpacing: '0.04em', color: '#78350F', lineHeight: 1 }}>{eotw.name}</div>
            <div style={{ fontSize: '0.82rem', color: '#B45309', marginTop: 4 }}>
              {employees.find(e => e.name === eotw.name)?.role || 'Team Member'}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
            {(() => {
              const emp = employees.find(e => e.name === eotw.name)
              return emp ? (
                <>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', color: '#92400E' }}>${emp.hourly_rate}/hr</div>
                  <div style={{ fontSize: '0.72rem', color: '#B45309' }}>{emp.hours_per_week}h/week</div>
                </>
              ) : null
            })()}
          </div>
        </motion.div>
      )}

      {/* Warnings + Recognitions */}
      {(warnings.length > 0 || recognitions.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {warnings.length > 0 && (
            <motion.div {...fadeUp(2)} style={{ background: 'white', border: '1px solid #FECACA', borderRadius: 14, padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <AlertTriangle size={14} color="#F59E0B" />
                <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#92400E' }}>Warnings</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {warnings.map((w, i) => (
                  <div key={i} style={{ padding: '10px 14px', background: '#FFFBEB', border: '1px solid var(--yellow-200)', borderRadius: 10, fontSize: '0.82rem', color: '#92400E', lineHeight: 1.5 }}>
                    {typeof w === 'string' ? w : `${w.employee || ''}: ${w.message || ''}`}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
          {recognitions.length > 0 && (
            <motion.div {...fadeUp(3)} style={{ background: 'white', border: '1px solid #BBF7D0', borderRadius: 14, padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <CheckCircle size={14} color="#22C55E" />
                <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#166534' }}>Recognitions</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recognitions.map((r, i) => (
                  <div key={i} style={{ padding: '10px 14px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, fontSize: '0.82rem', color: '#166534', lineHeight: 1.5 }}>
                    {typeof r === 'string' ? r : `${r.employee || ''}: ${r.message || ''}`}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Employee grid */}
      <motion.div {...fadeUp(4)}>
        <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 14 }}>Full Roster</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {employees.map((emp, i) => {
            const isEOTW = emp.name === eotw?.name
            const weeklyPay = (emp.hourly_rate || 0) * (emp.hours_per_week || 0)
            return (
              <motion.div key={emp.name || i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                style={{
                  background: 'white',
                  border: `1px solid ${isEOTW ? 'var(--yellow-300)' : 'var(--border)'}`,
                  borderRadius: 16, padding: '20px 24px',
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 16, alignItems: 'center',
                  boxShadow: isEOTW ? '0 4px 16px rgba(251,191,36,0.12)' : 'var(--shadow-xs)',
                }}
                whileHover={{ y: -2, boxShadow: 'var(--shadow-md)' }}>

                {/* Identity */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                    background: isEOTW ? 'linear-gradient(135deg, #FBBF24, #F59E0B)' : AVATAR_COLORS[i % AVATAR_COLORS.length],
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 700, fontSize: '1rem',
                    boxShadow: isEOTW ? '0 0 14px rgba(251,191,36,0.4)' : '0 2px 8px rgba(0,0,0,0.1)',
                  }}>
                    {emp.name?.[0] || '?'}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>{emp.name}</span>
                      {isEOTW && <Star size={12} fill="#FBBF24" color="#FBBF24" />}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>{emp.role}</div>
                  </div>
                </div>

                {/* Pay & hours */}
                <div style={{ display: 'flex', gap: 20 }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 3 }}>Hourly Rate</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <DollarSign size={13} color="#3B82F6" />
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{emp.hourly_rate}/hr</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 3 }}>Weekly Hours</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={13} color="#8B5CF6" />
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{emp.hours_per_week}h</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 3 }}>Weekly Pay</div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#22C55E' }}>${weeklyPay}</div>
                  </div>
                </div>

                {/* Performance */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {emp.performance_score != null && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 5, background: 'var(--surface)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ width: `${emp.performance_score}%`, height: '100%', background: emp.performance_score >= 80 ? '#22C55E' : emp.performance_score >= 60 ? '#FBBF24' : '#EF4444', borderRadius: 99 }} />
                      </div>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: emp.performance_score >= 80 ? '#16A34A' : emp.performance_score >= 60 ? '#92400E' : '#DC2626', minWidth: 28 }}>{emp.performance_score}</span>
                    </div>
                  )}
                  <div style={{ padding: '8px 12px', background: 'var(--surface)', borderRadius: 8, fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {emp.performance_notes || emp.notes || 'No notes available'}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}
