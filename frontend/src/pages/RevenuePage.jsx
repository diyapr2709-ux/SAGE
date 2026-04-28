import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, AlertTriangle, Flame, BarChart2, Activity, Target, Clock } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell,
} from 'recharts'
import { apiDashboardManager } from '../api/client'

const fadeUp = (i = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
})

const MOCK = {
  forecast_72hr: [2800,3100,2600,1800,2900,3400,3100,2700,1900,3000,3500,3200,2800,2000,3100,3600,3300,2900],
  deviation_pct: 4,
  alert: false,
  pulse_summary: "Revenue trending upward. Peak windows identified at lunch and dinner.",
  rush_hours: ["11:30 AM", "1:00 PM", "6:30 PM", "8:00 PM"],
  goals: { monthly_target: 85000, weekly_target: 21250, daily_target: 3035 },
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', boxShadow: 'var(--shadow-lg)', fontFamily: "'Outfit', sans-serif" }}>
      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: '1rem', fontWeight: 700, color: '#3B82F6' }}>${payload[0]?.value?.toLocaleString()}</p>
    </div>
  )
}

function StatBox({ label, value, icon: Icon, accent, trend, index }) {
  return (
    <motion.div {...fadeUp(index)} style={{
      background: 'white', border: '1px solid var(--border)',
      borderRadius: 16, padding: '22px 24px',
      boxShadow: 'var(--shadow-sm)', position: 'relative', overflow: 'hidden',
    }} whileHover={{ y: -2, boxShadow: 'var(--shadow-md)' }}>
      <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, background: `radial-gradient(circle at top right, ${accent}18, transparent 70%)` }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: `${accent}18`, border: `1px solid ${accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={17} color={accent} />
        </div>
        {trend != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.75rem', fontWeight: 700, color: trend >= 0 ? '#16A34A' : '#DC2626', background: trend >= 0 ? '#F0FDF4' : '#FFF5F5', border: `1px solid ${trend >= 0 ? '#BBF7D0' : '#FECACA'}`, padding: '2px 8px', borderRadius: 99 }}>
            {trend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '0.04em', color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
      <div style={{ marginTop: 6, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</div>
    </motion.div>
  )
}

export default function RevenuePage() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiDashboardManager()
      .then(res => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  const d = data || MOCK

  const chartData = (d.forecast_72hr || []).map((val, i) => ({
    hour: `+${i * 4}h`,
    revenue: Math.round(val),
    label: i % 6 === 0 ? `Day ${Math.floor(i/6) + 1}` : '',
  }))

  // Bar chart: group into 8-hour windows
  const windowData = []
  for (let i = 0; i < chartData.length; i += 2) {
    const avg = (chartData[i]?.revenue + (chartData[i+1]?.revenue || 0)) / 2
    windowData.push({ label: chartData[i]?.hour, revenue: Math.round(avg) })
  }

  const maxRevenue = Math.max(...(d.forecast_72hr || [0]))
  const minRevenue = Math.min(...(d.forecast_72hr || [0]))
  const avgRevenue = Math.round((d.forecast_72hr || [0]).reduce((a, b) => a + b, 0) / ((d.forecast_72hr || [1]).length))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* Header */}
      <motion.div {...fadeUp(0)} style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>PULSE Agent</p>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem', letterSpacing: '0.06em', color: 'var(--text-primary)', lineHeight: 1 }}>Revenue Intelligence</h2>
          {d.pulse_summary && <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 6, maxWidth: 600 }}>{d.pulse_summary}</p>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {d.alert && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#FFF5F5', border: '1px solid #FECACA', borderRadius: 10 }}>
              <AlertTriangle size={14} color="#EF4444" />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#B91C1C' }}>Revenue Alert Active</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 99 }}>
            <Activity size={12} color="#3B82F6" />
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1D4ED8' }}>72-Hour Window</span>
          </div>
        </div>
      </motion.div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <StatBox icon={Target}     label="Monthly Target"    value={`$${(d.goals?.monthly_target || 0).toLocaleString()}`} accent="#3B82F6" index={0} />
        <StatBox icon={TrendingUp} label="Forecast Deviation" value={`${d.deviation_pct > 0 ? '+' : ''}${d.deviation_pct}%`} accent={d.deviation_pct >= 0 ? '#22C55E' : '#EF4444'} trend={d.deviation_pct} index={1} />
        <StatBox icon={BarChart2}  label="Peak Forecast"     value={`$${maxRevenue.toLocaleString()}`} accent="#8B5CF6" index={2} />
        <StatBox icon={Clock}      label="Rush Windows"      value={d.rush_hours?.length || 0} accent="#FBBF24" index={3} />
      </div>

      {/* Main 72hr chart */}
      <motion.div {...fadeUp(4)} style={{ background: 'white', border: `1px solid ${d.alert ? '#FECACA' : 'var(--border)'}`, borderRadius: 16, padding: '28px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#60A5FA', boxShadow: '0 0 4px #60A5FA' }} />
              <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em', color: '#1D4ED8', textTransform: 'uppercase' }}>PULSE</span>
            </div>
            <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>72-Hour Revenue Forecast</h3>
          </div>
          <div style={{ display: 'flex', gap: 16, textAlign: 'right' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Avg/window</div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>${avgRevenue.toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Peak</div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#16A34A' }}>${maxRevenue.toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Low</div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#DC2626' }}>${minRevenue.toLocaleString()}</div>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#60A5FA" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#60A5FA" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" vertical={false} />
            <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'Outfit' }} axisLine={false} tickLine={false} interval={3} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'Outfit' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(1)}k`} />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine y={avgRevenue} stroke="#94A3B8" strokeDasharray="4 4" strokeWidth={1} />
            <Area type="monotone" dataKey="revenue" stroke="#60A5FA" strokeWidth={2.5} fill="url(#revenueGrad)" dot={false} activeDot={{ r: 5, fill: '#3B82F6', stroke: 'white', strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
          <div style={{ width: 24, height: 1, background: '#94A3B8', borderTop: '1px dashed #94A3B8' }} />
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Average line</span>
        </div>
      </motion.div>

      {/* Goals + Rush Hours */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Goals */}
        {d.goals && Object.keys(d.goals).length > 0 && (
          <motion.div {...fadeUp(5)} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 16, padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 16 }}>Revenue Goals</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {Object.entries(d.goals).map(([key, val]) => {
                const pct = Math.min(100, Math.round((avgRevenue * (key.includes('daily') ? 1 : key.includes('weekly') ? 7 : 30) / val) * 100))
                return (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>${val.toLocaleString()}</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--surface)', borderRadius: 99, overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        style={{ height: '100%', background: pct >= 80 ? '#22C55E' : pct >= 50 ? '#60A5FA' : '#FBBF24', borderRadius: 99 }}
                      />
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>{pct}% on track</div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Rush Hours */}
        {d.rush_hours?.length > 0 && (
          <motion.div {...fadeUp(6)} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 16, padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 16 }}>Peak Rush Windows</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {d.rush_hours.map((h, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'var(--yellow-50)', border: '1px solid var(--yellow-200)', borderRadius: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--yellow-100)', border: '1px solid var(--yellow-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Flame size={16} color="#F59E0B" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: '#92400E' }}>{h}</div>
                    <div style={{ fontSize: '0.72rem', color: '#B45309' }}>High demand window — ensure full coverage</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
