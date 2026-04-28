import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, DollarSign, TrendingDown, AlertTriangle, ShoppingCart, BarChart2 } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import { apiDashboardManager } from '../api/client'

const fadeUp = (i = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
})

const MOCK = {
  health_score: 82,
  cost_intelligence: {
    labor_cost_pct:    28,
    food_cost_pct:     32,
    delivery_fee_pct:  30,
    net_margin_pct:    10,
  },
  shelf_flags: null,
  recommendations: [
    { id: 1, agent: "SHELF", category: "Labor",   title: "Review Michael Rivera overtime hours",  description: "Shift supervisor approaching overtime at 40h/week.",       urgency: "medium" },
    { id: 5, agent: "SHELF", category: "Health",  title: "Follow up on kitchen health-code near-miss", description: "Schedule a kitchen safety review for Daniel Brooks.", urgency: "high"   },
  ],
}

const BAR_COLORS = ['#3B82F6', '#22C55E', '#F97316', '#8B5CF6', '#FBBF24', '#EF4444']

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', boxShadow: 'var(--shadow-lg)', fontFamily: "'Outfit', sans-serif" }}>
      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{payload[0]?.value}%</p>
    </div>
  )
}

const URGENCY_COLOR = { high: '#EF4444', medium: '#FBBF24', low: '#22C55E' }

export default function CostIntelPage() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiDashboardManager()
      .then(res => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  const d = data || MOCK
  const costIntel   = d.cost_intelligence || {}
  const healthScore = d.health_score
  const shelfFlags  = d.shelf_flags
  const shelfRecs   = (d.recommendations || []).filter(r => r.agent === 'SHELF')

  const chartData = Object.entries(costIntel).map(([key, val], i) => ({
    name: key.replace(/_pct|_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim(),
    value: typeof val === 'number' ? val : 0,
    color: BAR_COLORS[i % BAR_COLORS.length],
  }))

  const hasCostData = chartData.length > 0

  // Health score color
  const hsColor = healthScore >= 80 ? '#22C55E' : healthScore >= 60 ? '#FBBF24' : '#EF4444'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* Header */}
      <motion.div {...fadeUp(0)} style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>SHELF Agent</p>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem', letterSpacing: '0.06em', color: 'var(--text-primary)', lineHeight: 1 }}>Cost Intelligence</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 6 }}>Business cost structure and financial health</p>
        </div>
        {healthScore != null && (
          <div style={{ textAlign: 'center', padding: '16px 24px', background: 'white', border: `1px solid ${hsColor}44`, borderRadius: 16, boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.6rem', color: hsColor, lineHeight: 1 }}>{healthScore}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center', marginTop: 4 }}>
              <Heart size={12} color={hsColor} />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Health Score</span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Shelf flags */}
      {shelfFlags && (
        <motion.div {...fadeUp(1)} style={{ padding: '16px 20px', background: '#FFF5F5', border: '1px solid #FECACA', borderRadius: 12, display: 'flex', gap: 10 }}>
          <AlertTriangle size={16} color="#EF4444" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: '0.85rem', color: '#B91C1C' }}>{JSON.stringify(shelfFlags)}</div>
        </motion.div>
      )}

      {/* Cost breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Bar chart */}
        {hasCostData && (
          <motion.div {...fadeUp(2)} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 16, padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#A78BFA', boxShadow: '0 0 4px #A78BFA' }} />
              <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em', color: '#7E22CE', textTransform: 'uppercase' }}>SHELF</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginLeft: 4 }}>Cost Breakdown</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'Outfit' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'Outfit' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Metric cards */}
        <motion.div {...fadeUp(3)} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {chartData.map((item, i) => {
            const isHigh = item.name.toLowerCase().includes('delivery') || item.name.toLowerCase().includes('food')
            const isMarg = item.name.toLowerCase().includes('margin')
            const statusColor = isMarg ? (item.value >= 15 ? '#22C55E' : item.value >= 8 ? '#FBBF24' : '#EF4444') : (item.value <= 30 ? '#22C55E' : item.value <= 40 ? '#FBBF24' : '#EF4444')
            const statusLabel = isMarg ? (item.value >= 15 ? 'Healthy' : item.value >= 8 ? 'Watch' : 'Critical') : (item.value <= 30 ? 'Healthy' : item.value <= 40 ? 'Watch' : 'High')

            return (
              <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.07 }}
                style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: 'var(--shadow-xs)' }}
                whileHover={{ y: -1, boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: `${item.color}18`, border: `1px solid ${item.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <DollarSign size={18} color={item.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: 4 }}>{item.name}</div>
                  <div style={{ height: 5, background: 'var(--surface)', borderRadius: 99, overflow: 'hidden' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(item.value, 100)}%` }} transition={{ duration: 0.7, delay: 0.4 + i * 0.07 }} style={{ height: '100%', background: item.color, borderRadius: 99 }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: 'var(--text-primary)', lineHeight: 1 }}>{item.value}%</div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: statusColor, marginTop: 2 }}>{statusLabel}</div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>

      {/* SHELF Recommendations */}
      {shelfRecs.length > 0 && (
        <motion.div {...fadeUp(4)}>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 14 }}>SHELF Recommendations</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {shelfRecs.map((rec, i) => (
              <motion.div key={rec.id || i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'flex-start', boxShadow: 'var(--shadow-xs)' }}
                whileHover={{ y: -1, boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: URGENCY_COLOR[rec.urgency] || '#94A3B8', boxShadow: `0 0 6px ${URGENCY_COLOR[rec.urgency] || '#94A3B8'}88`, marginTop: 4, flexShrink: 0 }} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7E22CE', background: '#FDF4FF', border: '1px solid #E9D5FF', padding: '2px 8px', borderRadius: 99 }}>SHELF</span>
                    {rec.category && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--surface)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 99 }}>{rec.category}</span>}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 4 }}>{rec.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>{rec.description}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
