// EmployeeDashboard.jsx
import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Star, CheckSquare, Clock, Zap, TrendingUp, AlertTriangle } from 'lucide-react'
import { apiDashboardEmployee } from '../api/client'
import { useAuth } from '../context/AuthContext'

const stagger = (i) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] }
})

export function EmployeeDashboard() {
  const { frankData } = useOutletContext() || {}
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiDashboardEmployee()
      .then(res => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  const d = frankData || data
  const eotw = d?.employee_of_the_week || {}
  const warnings = d?.warnings || []
  const recognitions = d?.recognitions || []
  const tasks = d?.tasks || ['Check inventory', 'Greet customers', 'Review today\'s specials']
  const rushHours = d?.rush_hours || []

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} style={{ display: 'inline-block', marginBottom: 16 }}>
          <Zap size={32} color="var(--blue-500)" />
        </motion.div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading your dashboard…</p>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900 }}>
      {/* Header */}
      <motion.div {...stagger(0)}>
        <p className="section-label" style={{ marginBottom: 4 }}>Employee Dashboard</p>
        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.9rem', color: 'var(--text-primary)' }}>
          Good morning 👋
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 4 }}>
          {user?.email} · Marathon Deli
        </p>
      </motion.div>

      {/* FRANK line */}
      {d?.frank_line && (
        <motion.div {...stagger(1)} className="sage-card" style={{ padding: '20px 24px', borderLeft: '3px solid var(--blue-400)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span className="agent-chip agent-frank" style={{ flexShrink: 0, marginTop: 1 }}>FRANK</span>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: 1.65 }}>
              {d.frank_line}
            </p>
          </div>
        </motion.div>
      )}

      {/* Stat row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <motion.div {...stagger(2)} className="stat-card">
          <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--yellow-50)', border: '1px solid var(--yellow-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <Star size={17} color="var(--yellow-500)" />
          </div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.7rem' }}>
            {eotw?.name ? '🏆' : '—'}
          </div>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: 4 }}>Top Performer</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{eotw?.name || 'TBD this week'}</div>
        </motion.div>

        <motion.div {...stagger(3)} className="stat-card">
          <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--blue-50)', border: '1px solid var(--blue-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <Clock size={17} color="var(--blue-500)" />
          </div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.7rem' }}>{rushHours.length || 0}</div>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: 4 }}>Rush Windows</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Today</div>
        </motion.div>

        <motion.div {...stagger(4)} className="stat-card">
          <div style={{ width: 36, height: 36, borderRadius: 9, background: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <TrendingUp size={17} color="#22C55E" />
          </div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.7rem' }}>{recognitions.length || 0}</div>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: 4 }}>Recognitions</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>This period</div>
        </motion.div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Today's Tasks */}
        <motion.div {...stagger(5)} className="sage-card" style={{ padding: '22px' }}>
          <p className="section-label" style={{ marginBottom: 14 }}>Today's Tasks</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tasks.map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--surface)', borderRadius: 9, cursor: 'pointer', transition: 'all 0.15s ease' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--blue-50)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
              >
                <CheckSquare size={15} color="var(--blue-400)" />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{t}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Alerts & Recognitions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {warnings.length > 0 && (
            <motion.div {...stagger(6)} className="sage-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                <AlertTriangle size={14} color="#F59E0B" />
                <p className="section-label">Warnings</p>
              </div>
              {warnings.map((w, i) => (
                <div key={i} style={{ fontSize: '0.82rem', color: '#92400E', background: 'var(--yellow-50)', border: '1px solid var(--yellow-100)', borderRadius: 8, padding: '8px 12px', marginBottom: 6 }}>{w}</div>
              ))}
            </motion.div>
          )}
          {recognitions.length > 0 && (
            <motion.div {...stagger(7)} className="sage-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                <Star size={14} color="var(--yellow-500)" />
                <p className="section-label">Recognitions</p>
              </div>
              {recognitions.map((r, i) => (
                <div key={i} style={{ fontSize: '0.82rem', color: '#166534', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '8px 12px', marginBottom: 6 }}>{r}</div>
              ))}
            </motion.div>
          )}
          {warnings.length === 0 && recognitions.length === 0 && (
            <motion.div {...stagger(6)} className="sage-card" style={{ padding: '20px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No alerts today 🎉</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Rush hours */}
      {rushHours.length > 0 && (
        <motion.div {...stagger(8)} className="sage-card" style={{ padding: '20px 24px' }}>
          <p className="section-label" style={{ marginBottom: 12 }}>Expected Rush Hours</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {rushHours.map((h, i) => (
              <div key={i} style={{
                padding: '6px 14px', background: 'var(--yellow-50)', border: '1px solid var(--yellow-200)',
                borderRadius: 99, fontSize: '0.82rem', fontWeight: 600, color: '#92400E',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <Clock size={12} />{h}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default EmployeeDashboard
