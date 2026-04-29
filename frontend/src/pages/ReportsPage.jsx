import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { apiDashboardManager } from '../api/client'
import {
  TrendingUp, TrendingDown, Heart, Users, DollarSign,
  Star, AlertTriangle, CheckCircle, BarChart2, Activity,
  Download, RefreshCw,
} from 'lucide-react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, BarChart, Bar, Cell,
} from 'recharts'

const fadeUp = (i = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
})

function MetricTile({ label, value, sub, color = '#3B82F6', trend, icon: Icon }) {
  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', boxShadow: 'var(--shadow-xs)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, right: 0, width: 70, height: 70, background: `radial-gradient(circle at top right, ${color}14, transparent 70%)` }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: `${color}18`, border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={15} color={color} />
        </div>
        {trend != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.72rem', fontWeight: 700, color: trend >= 0 ? '#16A34A' : '#DC2626', background: trend >= 0 ? '#F0FDF4' : '#FFF5F5', border: `1px solid ${trend >= 0 ? '#BBF7D0' : '#FECACA'}`, padding: '2px 7px', borderRadius: 99 }}>
            {trend >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}{Math.abs(trend)}%
          </div>
        )}
      </div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.9rem', color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: 5 }}>{label}</div>
      {sub && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function SectionHead({ agent, title, color }) {
  const AGENT_COLORS = { FRANK: '#FBBF24', PULSE: '#60A5FA', VOICE: '#34D399', CREW: '#FB923C', SHELF: '#A78BFA' }
  const c = AGENT_COLORS[agent] || color || '#94A3B8'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <div style={{ width: 5, height: 5, borderRadius: '50%', background: c, boxShadow: `0 0 5px ${c}` }} />
      <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', color: c, textTransform: 'uppercase' }}>{agent}</span>
      <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>{title}</span>
    </div>
  )
}

const TooltipRevenue = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 13px', boxShadow: 'var(--shadow-lg)', fontFamily: "'Outfit'" }}>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontWeight: 700, color: '#3B82F6' }}>${payload[0]?.value?.toLocaleString()}</div>
    </div>
  )
}

export default function ReportsPage() {
  const { user }  = useAuth()
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExp]   = useState(false)

  useEffect(() => {
    apiDashboardManager()
      .then(res => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  const handleExport = () => {
    if (!data) return
    setExp(true)
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `SAGE_Report_${new Date().toISOString().slice(0,10)}.json`
    a.click(); URL.revokeObjectURL(url)
    setTimeout(() => setExp(false), 1500)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} style={{ display: 'inline-block', marginBottom: 12 }}>
          <RefreshCw size={28} color="var(--blue-400)" />
        </motion.div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Generating report…</p>
      </div>
    </div>
  )

  const d = data || {}

  // Derived
  const employees  = d.employee_intelligence?.employees || []
  const recs       = d.recommendations || []
  const reviews    = d.reviews || []
  const costIntel  = d.cost_intelligence || {}
  const forecast   = d.forecast_72hr || []
  const goals      = d.goals || {}

  const avgRating     = reviews.length ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1) : '—'
  const positiveCount = reviews.filter(r => r.sentiment === 'positive' || r.rating >= 4).length
  const highRecs      = recs.filter(r => r.urgency === 'high' || r.urgency === 'critical').length
  const totalImpact   = recs.reduce((s, r) => s + (r.impact || 0), 0)

  const chartData = forecast.map((v, i) => ({ h: `+${i * 4}h`, revenue: Math.round(v) }))

  const costChartData = Object.entries(costIntel)
    .filter(([, v]) => typeof v === 'number' && v <= 100)
    .map(([k, v], i) => ({
      name: k.replace(/_pct$|_pct_of_/g, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      value: Math.round(v * 10) / 10,
      fill: ['#3B82F6','#22C55E','#F97316','#A78BFA','#FBBF24'][i % 5],
    }))

  // Radar data for business health
  const radarData = [
    { metric: 'Revenue',    score: Math.min(100, Math.round((d.deviation_pct ?? 0) + 70)) },
    { metric: 'Team',       score: employees.length > 0 ? Math.round(employees.reduce((s, e) => s + (e.performance_score || 75), 0) / employees.length) : 75 },
    { metric: 'Reputation', score: avgRating !== '—' ? Math.round(Number(avgRating) * 20) : 70 },
    { metric: 'Cost',       score: costIntel.net_margin_pct != null ? Math.min(100, Math.round(costIntel.net_margin_pct * 4 + 60)) : 65 },
    { metric: 'Operations', score: d.health_score || 72 },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <motion.div {...fadeUp(0)} style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>FRANK · All Agents</p>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem', letterSpacing: '0.06em', color: 'var(--text-primary)', lineHeight: 1 }}>Business Report</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 6 }}>
            Full operational summary · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <motion.button onClick={handleExport} disabled={exporting} whileTap={{ scale: 0.96 }}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 10, border: '1px solid var(--border)', background: 'white', color: 'var(--text-primary)', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', boxShadow: 'var(--shadow-xs)' }}>
          {exporting ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />Exporting…</> : <><Download size={14} />Export JSON</>}
        </motion.button>
      </motion.div>

      {/* KPI row */}
      <motion.div {...fadeUp(1)} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        <MetricTile icon={Heart}      label="Health Score"      value={d.health_score ?? '—'}         color="#22C55E" trend={2} />
        <MetricTile icon={TrendingUp} label="Forecast Dev."     value={d.deviation_pct != null ? `${d.deviation_pct > 0 ? '+' : ''}${Number(d.deviation_pct).toFixed(1)}%` : '—'} color="#3B82F6" trend={Number((d.deviation_pct ?? 0).toFixed(1))} />
        <MetricTile icon={Users}      label="Team Size"         value={employees.length || '—'}       color="#8B5CF6" />
        <MetricTile icon={Star}       label="Avg Review"        value={avgRating}                     color="#FBBF24" />
        <MetricTile icon={AlertTriangle} label="High-Priority"  value={highRecs}                      color="#EF4444" sub={`$${totalImpact.toLocaleString()} total impact`} />
      </motion.div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>

        {/* Revenue forecast */}
        <motion.div {...fadeUp(2)} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 16, padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
          <SectionHead agent="PULSE" title="72-Hour Revenue Forecast" />
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="rpGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60A5FA" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#60A5FA" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" vertical={false} />
                <XAxis dataKey="h" tick={{ fontSize: 9, fill: 'var(--text-muted)', fontFamily: 'Outfit' }} axisLine={false} tickLine={false} interval={5} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)', fontFamily: 'Outfit' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(1)}k`} />
                <Tooltip content={<TooltipRevenue />} />
                <Area type="monotone" dataKey="revenue" stroke="#60A5FA" strokeWidth={2.5} fill="url(#rpGrad)" dot={false} activeDot={{ r: 4, fill: '#3B82F6', stroke: 'white', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Run FRANK to generate forecast</div>
          )}
          {Object.keys(goals).length > 0 && (
            <div style={{ display: 'flex', gap: 12, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-soft)' }}>
              {Object.entries(goals).slice(0, 3).map(([key, val]) => {
                const target = typeof val === 'number' ? val : (val?.target ?? 0)
                const actual = typeof val === 'object' ? val?.actual_so_far : null
                return (
                  <div key={key} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'capitalize', marginBottom: 2 }}>{key.replace(/_/g, ' ')} target</div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>${Number(target).toLocaleString()}</div>
                    {actual != null && <div style={{ fontSize: '0.65rem', color: '#16A34A', marginTop: 1 }}>↑ ${Number(actual).toLocaleString()} so far</div>}
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>

        {/* Business Health Radar */}
        <motion.div {...fadeUp(3)} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 16, padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
          <SectionHead agent="FRANK" title="Health Radar" />
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--border-soft)" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'Outfit' }} />
              <Radar name="Score" dataKey="score" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.18} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Cost + Team row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Cost breakdown */}
        {costChartData.length > 0 && (
          <motion.div {...fadeUp(4)} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 16, padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <SectionHead agent="SHELF" title="Cost Breakdown" />
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={costChartData} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--text-muted)', fontFamily: 'Outfit' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)', fontFamily: 'Outfit' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip formatter={v => [`${v}%`]} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {costChartData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Team performance */}
        {employees.length > 0 && (
          <motion.div {...fadeUp(5)} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 16, padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <SectionHead agent="SHELF" title="Team Performance" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
              {employees.map((emp, i) => {
                const score = emp.performance_score ?? 75
                const color = score >= 85 ? '#22C55E' : score >= 70 ? '#3B82F6' : '#F97316'
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg, ${color}88, ${color})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.75rem' }}>{emp.name?.[0]}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>{emp.name}</span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color }}>{score}</span>
                      </div>
                      <div style={{ height: 5, background: 'var(--surface)', borderRadius: 99, overflow: 'hidden' }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 0.7, delay: 0.3 + i * 0.05 }} style={{ height: '100%', background: color, borderRadius: 99 }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </div>

      {/* Recommendations summary */}
      {recs.length > 0 && (
        <motion.div {...fadeUp(6)} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 16, padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
          <SectionHead agent="FRANK" title="All Recommendations" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
            {recs.map((rec, i) => {
              const uColor = { critical: '#DC2626', high: '#EF4444', medium: '#FBBF24', low: '#22C55E' }[rec.urgency] || '#94A3B8'
              return (
                <div key={i} style={{ padding: '12px 14px', background: 'var(--off-white)', border: '1px solid var(--border-soft)', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: uColor, boxShadow: `0 0 5px ${uColor}88`, marginTop: 5, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>{rec.title}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{rec.description?.slice(0, 90)}{rec.description?.length > 90 ? '…' : ''}</div>
                    {rec.impact > 0 && <div style={{ marginTop: 5, fontSize: '0.68rem', fontWeight: 700, color: '#16A34A' }}>${rec.impact.toLocaleString()} impact</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* FRANK briefing */}
      {d.briefing_text && (
        <motion.div {...fadeUp(7)} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 16, padding: '24px', borderLeft: '3px solid #FBBF24', boxShadow: 'var(--shadow-sm)' }}>
          <SectionHead agent="FRANK" title="Full Briefing" />
          <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.8, whiteSpace: 'pre-wrap', margin: 0 }}>{d.briefing_text}</p>
        </motion.div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
