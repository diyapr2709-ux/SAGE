import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp, TrendingDown, Users, AlertTriangle, Star,
  DollarSign, Heart, Zap, ChevronRight, CheckCircle,
  Clock, MessageSquare, Calendar, Activity, ThumbsUp,
  ThumbsDown, Flame, BarChart2, RefreshCw,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { apiDashboardManager } from '../api/client'

const fadeUp = (i = 0) => ({
  initial: { opacity: 0, y: 22 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.055, duration: 0.42, ease: [0.22, 1, 0.36, 1] },
})

const AGENT = {
  FRANK: { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', dot: '#FBBF24' },
  PULSE: { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8', dot: '#60A5FA' },
  VOICE: { bg: '#F0FDF4', border: '#BBF7D0', text: '#166534', dot: '#34D399' },
  CREW:  { bg: '#FFF7ED', border: '#FED7AA', text: '#9A3412', dot: '#FB923C' },
  SHELF: { bg: '#FDF4FF', border: '#E9D5FF', text: '#7E22CE', dot: '#A78BFA' },
}

function AgentChip({ name }) {
  const a = AGENT[name?.toUpperCase()] || AGENT.FRANK
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 99,
      background: a.bg, border: `1px solid ${a.border}`,
      fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em',
      color: a.text, textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>
      <div style={{ width: 5, height: 5, borderRadius: '50%', background: a.dot, boxShadow: `0 0 4px ${a.dot}` }} />
      {name}
    </div>
  )
}

function SectionHeader({ agent, title, sub, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <AgentChip name={agent} />
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>{title}</div>
          {sub && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>{sub}</div>}
        </div>
      </div>
      {action}
    </div>
  )
}

function EmptyState({ icon: Icon, label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px', gap: 10 }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} color="var(--text-muted)" />
      </div>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>{label}</p>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, trend, accent = '#3B82F6', index = 0 }) {
  const hasValue = value !== null && value !== undefined
  return (
    <motion.div {...fadeUp(index)} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 22px', boxShadow: 'var(--shadow-sm)', position: 'relative', overflow: 'hidden' }}
      whileHover={{ y: -2, boxShadow: 'var(--shadow-md)' }}>
      <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, background: `radial-gradient(circle at top right, ${accent}14, transparent 70%)` }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: `${accent}14`, border: `1px solid ${accent}28`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={17} color={accent} />
        </div>
        {trend != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.75rem', fontWeight: 700, color: trend >= 0 ? '#16A34A' : '#DC2626', background: trend >= 0 ? '#F0FDF4' : '#FFF5F5', border: `1px solid ${trend >= 0 ? '#BBF7D0' : '#FECACA'}`, padding: '2px 8px', borderRadius: 99 }}>
            {trend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.1rem', letterSpacing: '0.04em', color: 'var(--text-primary)', lineHeight: 1 }}>
        {hasValue ? value : '—'}
      </div>
      <div style={{ marginTop: 6, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</div>
      {sub && <div style={{ marginTop: 2, fontSize: '0.72rem', color: 'var(--text-muted)' }}>{sub}</div>}
    </motion.div>
  )
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', boxShadow: 'var(--shadow-lg)', fontFamily: "'Outfit', sans-serif" }}>
      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--blue-700)' }}>${payload[0]?.value?.toLocaleString()}</p>
    </div>
  )
}

function FrankBriefing({ text }) {
  return (
    <motion.div {...fadeUp(4)} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 16, padding: '22px 24px', borderLeft: '3px solid #FBBF24', boxShadow: 'var(--shadow-sm)' }}>
      <SectionHeader agent="FRANK" title="Daily Briefing" sub="AI-generated operational summary" />
      {text
        ? <p style={{ fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: 1.8, margin: 0 }}>{text}</p>
        : <EmptyState icon={Zap} label="Run FRANK to generate today's briefing" />
      }
    </motion.div>
  )
}

function PulseChart({ forecast, deviation, alert: isAlert, summary, rushHours, goals }) {
  const chartData = (forecast || []).map((val, i) => ({ hour: `+${i * 4}h`, revenue: Math.round(val) }))
  return (
    <motion.div {...fadeUp(5)} style={{ background: 'white', border: `1px solid ${isAlert ? '#FECACA' : 'var(--border)'}`, borderRadius: 16, padding: '22px 24px', boxShadow: 'var(--shadow-sm)' }}>
      <SectionHeader agent="PULSE" title="72-Hour Revenue Forecast" sub={summary || 'Live revenue projection'}
        action={
          deviation != null && (
            <div style={{ padding: '4px 10px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700, background: deviation >= 0 ? '#F0FDF4' : '#FFF5F5', border: `1px solid ${deviation >= 0 ? '#BBF7D0' : '#FECACA'}`, color: deviation >= 0 ? '#16A34A' : '#DC2626' }}>
              {deviation >= 0 ? '+' : ''}{deviation}% vs baseline
            </div>
          )
        }
      />
      {chartData.length > 0 ? (
        <>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="pulseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#60A5FA" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#60A5FA" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'Outfit' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'Outfit' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(1)}k`} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke="#60A5FA" strokeWidth={2.5} fill="url(#pulseGrad)" dot={false} activeDot={{ r: 5, fill: '#3B82F6', stroke: 'white', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
          {goals && Object.keys(goals).length > 0 && (
            <div style={{ display: 'flex', gap: 16, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-soft)' }}>
              {Object.entries(goals).slice(0, 3).map(([key, val]) => (
                <div key={key} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'capitalize', marginBottom: 3 }}>{key.replace(/_/g, ' ')}</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>{typeof val === 'number' ? `$${val.toLocaleString()}` : val}</div>
                </div>
              ))}
            </div>
          )}
          {rushHours?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', alignSelf: 'center' }}>Rush windows:</span>
              {rushHours.map((h, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: 'var(--yellow-50)', border: '1px solid var(--yellow-200)', borderRadius: 99, fontSize: '0.72rem', fontWeight: 600, color: '#92400E' }}>
                  <Flame size={10} />{h}
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <EmptyState icon={BarChart2} label="Revenue forecast will appear after FRANK runs" />
      )}
    </motion.div>
  )
}

function RecommendationsFeed({ recs, conflicts }) {
  const [filter, setFilter] = useState('all')
  const urgencyOrder = { high: 0, medium: 1, low: 2 }
  const urgencyColor = { high: '#EF4444', medium: '#FBBF24', low: '#22C55E' }
  const filtered = (recs || []).filter(r => filter === 'all' || r.urgency === filter).sort((a, b) => (urgencyOrder[a.urgency] ?? 3) - (urgencyOrder[b.urgency] ?? 3))

  return (
    <motion.div {...fadeUp(6)} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 16, padding: '22px 24px', boxShadow: 'var(--shadow-sm)' }}>
      <SectionHeader agent="FRANK" title="Agent Recommendations" sub={`${(recs || []).length} active recommendations`}
        action={
          <div style={{ display: 'flex', gap: 4 }}>
            {['all', 'high', 'medium', 'low'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: '4px 10px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600, textTransform: 'capitalize', background: filter === f ? 'var(--blue-600)' : 'var(--surface)', color: filter === f ? 'white' : 'var(--text-muted)', transition: 'all 0.15s ease' }}>
                {f}
              </button>
            ))}
          </div>
        }
      />
      {filtered.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <AnimatePresence>
            {filtered.map((rec, i) => (
              <motion.div key={rec.id || i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ delay: i * 0.04, duration: 0.25 }}
                style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 16px', background: 'var(--off-white)', border: '1px solid var(--border-soft)', borderRadius: 12, cursor: 'pointer' }}
                whileHover={{ background: 'var(--blue-50)', borderColor: 'var(--blue-100)' }}>
                <div style={{ paddingTop: 3, flexShrink: 0 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: urgencyColor[rec.urgency] || '#94A3B8', boxShadow: `0 0 6px ${urgencyColor[rec.urgency] || '#94A3B8'}88` }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
                    <AgentChip name={rec.agent} />
                    {rec.category && <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--surface)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 99 }}>{rec.category}</span>}
                    {rec.requires_approval && <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#92400E', background: 'var(--yellow-50)', border: '1px solid var(--yellow-200)', padding: '2px 8px', borderRadius: 99 }}>Needs Approval</span>}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: 4 }}>{rec.title}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>{rec.description}</div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                    {rec.impact && <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><DollarSign size={11} color="#3B82F6" /><span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#1D4ED8' }}>{typeof rec.impact === 'number' ? `$${rec.impact.toLocaleString()} impact` : rec.impact}</span></div>}
                    {rec.owner && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Owner: <strong>{rec.owner}</strong></div>}
                    {rec.deadline && <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.72rem', color: 'var(--text-muted)' }}><Clock size={10} /> {rec.deadline}</div>}
                  </div>
                </div>
                <ChevronRight size={14} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <EmptyState icon={CheckCircle} label={recs?.length > 0 ? `No ${filter} urgency recommendations` : 'Recommendations will appear after FRANK runs'} />
      )}
      {conflicts?.length > 0 && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-soft)' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Resolved Conflicts ({conflicts.length})</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {conflicts.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <CheckCircle size={13} color="#22C55E" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>{c.conflict_type}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 6 }}>→ {c.resolution_strategy}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}

function ShelfPanel({ employees, eotw, costIntel, healthScore }) {
  return (
    <motion.div {...fadeUp(4)} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 16, padding: '22px 24px', boxShadow: 'var(--shadow-sm)' }}>
      <SectionHeader agent="SHELF" title="Team Intelligence" sub={`${(employees || []).length} employees on roster`}
        action={healthScore != null && (
          <div style={{ padding: '4px 12px', borderRadius: 99, background: '#F0FDF4', border: '1px solid #BBF7D0', fontSize: '0.75rem', fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Heart size={11} />Health: {healthScore}
          </div>
        )}
      />
      {costIntel && Object.keys(costIntel).length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, padding: '12px 14px', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border-soft)', flexWrap: 'wrap' }}>
          {Object.entries(costIntel).slice(0, 4).map(([key, val]) => (
            <div key={key} style={{ flex: 1, minWidth: 80, textAlign: 'center' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'capitalize', marginBottom: 2 }}>{key.replace(/_/g, ' ')}</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>{typeof val === 'number' ? (val > 100 ? `$${val.toLocaleString()}` : `${val}%`) : String(val)}</div>
            </div>
          ))}
        </div>
      )}
      {eotw?.name && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'linear-gradient(135deg, #FFFBEB, #FEF9C3)', border: '1px solid var(--yellow-200)', borderRadius: 12, marginBottom: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #FBBF24, #F59E0B)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '0.9rem', boxShadow: '0 0 12px rgba(251,191,36,0.5)' }}>{eotw.name[0]}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Star size={12} fill="#FBBF24" color="#FBBF24" /><span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#92400E', letterSpacing: '0.05em' }}>EMPLOYEE OF THE WEEK</span></div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#78350F' }}>{eotw.name}</div>
          </div>
        </div>
      )}
      {(employees || []).length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {employees.map((emp, i) => (
            <motion.div key={emp.name || i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: emp.name === eotw?.name ? '#FFFBEB' : 'var(--surface)', border: `1px solid ${emp.name === eotw?.name ? 'var(--yellow-200)' : 'var(--border-soft)'}`, borderRadius: 10 }}
              whileHover={{ background: 'var(--blue-50)', borderColor: 'var(--blue-100)' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: emp.name === eotw?.name ? 'linear-gradient(135deg, #FBBF24, #F59E0B)' : 'linear-gradient(135deg, #60A5FA, #3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.8rem' }}>{emp.name?.[0] || '?'}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.83rem', color: 'var(--text-primary)' }}>{emp.name}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{emp.role}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.83rem', color: 'var(--text-primary)' }}>${emp.hourly_rate}/hr</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{emp.hours_per_week}h/wk</div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <EmptyState icon={Users} label="Employee data will load after FRANK runs" />
      )}
    </motion.div>
  )
}

function VoicePanel({ reviews, pricingAlerts, temporalAlerts }) {
  const allAlerts = [...(pricingAlerts || []), ...(temporalAlerts || [])]
  const hasData = (reviews || []).length > 0 || allAlerts.length > 0
  return (
    <motion.div {...fadeUp(5)} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 16, padding: '22px 24px', boxShadow: 'var(--shadow-sm)' }}>
      <SectionHeader agent="VOICE" title="Reputation & Reviews" sub={`${(reviews || []).length} reviews · ${allAlerts.length} alerts`} />
      {hasData ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {allAlerts.slice(0, 2).map((alert, i) => (
            <div key={i} style={{ padding: '10px 14px', borderRadius: 10, background: '#FFF5F5', border: '1px solid #FECACA', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <AlertTriangle size={13} color="#EF4444" style={{ marginTop: 2, flexShrink: 0 }} />
              <div style={{ fontSize: '0.78rem', color: '#B91C1C', lineHeight: 1.5 }}>{typeof alert === 'string' ? alert : JSON.stringify(alert)}</div>
            </div>
          ))}
          {(reviews || []).slice(0, 3).map((r, i) => {
            const text = r.reply_text || r.original_review || r.text || JSON.stringify(r)
            const isPositive = r.sentiment === 'positive' || r.rating >= 4
            return (
              <div key={i} style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border-soft)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  {isPositive ? <ThumbsUp size={12} color="#22C55E" /> : <ThumbsDown size={12} color="#EF4444" />}
                  {r.platform && <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)' }}>{r.platform}</span>}
                  {r.rating && <div style={{ display: 'flex', gap: 2 }}>{[...Array(5)].map((_, si) => <Star key={si} size={9} fill={si < r.rating ? '#FBBF24' : 'none'} color={si < r.rating ? '#FBBF24' : '#D1D5DB'} />)}</div>}
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>{text.length > 140 ? text.slice(0, 140) + '…' : text}</p>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState icon={MessageSquare} label="Review intelligence will appear after FRANK runs" />
      )}
    </motion.div>
  )
}

function CrewPanel({ staffing }) {
  const shifts = staffing && Object.keys(staffing).length > 0
    ? Object.entries(staffing).slice(0, 5).map(([name, info]) => ({ name, ...info }))
    : []
  return (
    <motion.div {...fadeUp(6)} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 16, padding: '22px 24px', boxShadow: 'var(--shadow-sm)' }}>
      <SectionHeader agent="CREW" title="Shift Scheduling" sub="Optimized workforce plan"
        action={shifts.length > 0 && <div style={{ padding: '4px 10px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 700, background: '#FFF7ED', border: '1px solid #FED7AA', color: '#9A3412' }}>{shifts.length} shifts</div>}
      />
      {shifts.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {shifts.map((shift, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #FB923C, #F97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.75rem' }}>{shift.name?.[0] || '?'}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>{shift.name}</div>
                {shift.start && shift.end && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={9} /> {shift.start} – {shift.end}</div>}
              </div>
              {shift.hours && <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{shift.hours}h</div>}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={Calendar} label="Crew scheduling will appear after FRANK runs" />
      )}
    </motion.div>
  )
}

function AlertsBanner({ alerts }) {
  if (!alerts?.length) return null
  return (
    <motion.div {...fadeUp(3)} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '12px 18px', background: '#FFF5F5', border: '1px solid #FECACA', borderRadius: 12 }}>
      <AlertTriangle size={15} color="#EF4444" style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#991B1B', marginRight: 8 }}>{alerts.length} Employee Alert{alerts.length > 1 ? 's' : ''}</span>
        {alerts.slice(0, 2).map((a, i) => <span key={i} style={{ fontSize: '0.78rem', color: '#B91C1C', marginRight: 12 }}>{typeof a === 'string' ? a : a.message || JSON.stringify(a)}</span>)}
      </div>
    </motion.div>
  )
}

function LoadingState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}>
        <Zap size={32} color="var(--blue-400)" />
      </motion.div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>Loading dashboard…</p>
    </div>
  )
}

const MOCK = {
  briefing_text: "Marathon Deli is performing above expectations this week. Revenue is trending 4% above baseline with strong lunch rush performance. Michael Rivera's team is managing weekend demand well. One health-code concern from Daniel Brooks' station needs follow-up. Delivery fees from DoorDash remain high at 30% — recommend negotiating or pushing direct orders. Overall business health is strong.",
  health_score: 82, deviation_pct: 4, alert: false,
  pulse_summary: "Revenue trending upward. Peak windows identified at lunch and dinner.",
  rush_hours: ["11:30 AM", "1:00 PM", "6:30 PM", "8:00 PM"],
  goals: { monthly_target: 85000, weekly_target: 21250, daily_target: 3035 },
  forecast_72hr: [2800,3100,2600,1800,2900,3400,3100,2700,1900,3000,3500,3200,2800,2000,3100,3600,3300,2900],
  recommendations: [
    { id: 1, agent: "PULSE", category: "Revenue",     title: "Push direct orders to reduce DoorDash fees",      description: "DoorDash fees at 30% are cutting into margins. A 10% shift to direct orders could save $2,550/month.", impact: 2550, urgency: "high",   requires_approval: false, owner: "Manager", deadline: "This week"     },
    { id: 2, agent: "SHELF", category: "Labor",       title: "Review Michael Rivera overtime hours",            description: "Shift supervisor approaching overtime threshold at 40h/week. Schedule adjustment recommended.",       impact: 800,  urgency: "medium", requires_approval: true,  owner: "Manager", deadline: "Before Sunday" },
    { id: 3, agent: "VOICE", category: "Reputation",  title: "Respond to 3 unanswered Google reviews",         description: "Three recent reviews have no response. Average rating impact estimated at 0.2 stars.",               impact: null, urgency: "medium", requires_approval: false, owner: "Manager", deadline: "Today"         },
    { id: 4, agent: "CREW",  category: "Scheduling",  title: "Add coverage for Friday dinner rush",             description: "CREW predicts understaffing during Friday 6-9 PM. Recommend adding one cashier shift.",             impact: 400,  urgency: "low",    requires_approval: false, owner: "Manager", deadline: "By Thursday"   },
    { id: 5, agent: "SHELF", category: "Health",      title: "Follow up on kitchen health-code near-miss",     description: "Daniel Brooks had one health-code near-miss last month. Schedule a kitchen safety review.",           impact: null, urgency: "high",   requires_approval: false, owner: "Manager", deadline: "Today"         },
  ],
  conflicts: [
    { conflict_type: "Labor vs Revenue",  resolution_strategy: "Stagger breaks during rush windows",    outcome: "Resolved" },
    { conflict_type: "Overtime threshold", resolution_strategy: "Redistribute 4hrs to part-time staff", outcome: "Resolved" },
  ],
  reviews: [
    { reply_text: "Best breakfast sandwich in College Park, staff was super friendly!", sentiment: "positive", rating: 5, platform: "Google" },
    { reply_text: "Wait times were long on Saturday afternoon but food made up for it.", sentiment: "neutral",  rating: 3, platform: "Yelp"   },
    { reply_text: "Aarav at the register always remembers my order. Great service!",    sentiment: "positive", rating: 5, platform: "Google" },
  ],
  pricing_alerts: ["DoorDash commission rate increased to 30% — review contract terms"],
  temporal_alerts: [], employee_alerts: [],
  employee_of_the_week: { name: "Aarav Patel" },
  employee_intelligence: {
    employees: [
      { name: "Aarav Patel",    role: "Cashier",         hourly_rate: 14, hours_per_week: 18, performance_notes: "Excellent customer feedback, consistent" },
      { name: "Michael Rivera", role: "Shift Supervisor", hourly_rate: 22, hours_per_week: 40, performance_notes: "Strong leader, slight overtime concern"   },
      { name: "Sophia Kim",     role: "Cashier",          hourly_rate: 14, hours_per_week: 12, performance_notes: "Reliable, good upsell rate"               },
      { name: "Daniel Brooks",  role: "Cook",             hourly_rate: 16, hours_per_week: 25, performance_notes: "Fast prep, one health-code near-miss"     },
      { name: "Emily Chen",     role: "Front Desk",       hourly_rate: 13, hours_per_week: 12, performance_notes: "Student worker, very friendly"            },
    ]
  },
  cost_intelligence: { labor_cost_pct: 28, food_cost_pct: 32, delivery_fee_pct: 30, net_margin_pct: 10 },
  staffing: {
    "Aarav Patel":    { start: "9:00 AM",  end: "3:00 PM", hours: 6 },
    "Michael Rivera": { start: "8:00 AM",  end: "5:00 PM", hours: 9 },
    "Sophia Kim":     { start: "12:00 PM", end: "6:00 PM", hours: 6 },
    "Daniel Brooks":  { start: "7:00 AM",  end: "3:00 PM", hours: 8 },
    "Emily Chen":     { start: "10:00 AM", end: "2:00 PM", hours: 4 },
  },
}

export default function ManagerDashboard() {
  const outlet    = useOutletContext() || {}
  const frankData = outlet.frankData
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiDashboardManager()
      .then(res => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  const d         = frankData || data || MOCK
  const empIntel  = d?.employee_intelligence || {}
  const employees = empIntel?.employees || []
  const eotw      = d?.employee_of_the_week || empIntel?.employee_of_the_week || {}
  const recs      = d?.recommendations || []
  const conflicts = d?.conflicts || []
  const forecast  = d?.forecast_72hr || []
  const reviews   = d?.reviews || []
  const staffing  = d?.staffing || {}
  const alerts    = d?.employee_alerts || []
  const costIntel = d?.cost_intelligence || {}

  if (loading) return <LoadingState />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      <motion.div {...fadeUp(0)} style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Manager Dashboard</p>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem', letterSpacing: '0.06em', color: 'var(--text-primary)', lineHeight: 1 }}>Daily Operations</h2>
        </div>
        <div>
          {data
            ? <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 99 }}><Activity size={12} color="#22C55E" /><span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#166534' }}>Live Data</span></div>
            : <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: 'var(--yellow-50)', border: '1px solid var(--yellow-200)', borderRadius: 99 }}><RefreshCw size={12} color="#92400E" /><span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400E' }}>Demo Mode</span></div>
          }
        </div>
      </motion.div>

      <AlertsBanner alerts={alerts} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <StatCard icon={Heart}      label="Health Score"       value={d?.health_score}                                                                                   sub="Business vitality" accent="#22C55E" index={0} trend={2} />
        <StatCard icon={DollarSign} label="Monthly Revenue"    value={`$${(85000).toLocaleString()}`}                                                                    sub="Marathon Deli"     accent="#3B82F6" index={1} trend={4} />
        <StatCard icon={TrendingUp} label="Forecast Deviation" value={d?.deviation_pct != null ? `${d.deviation_pct > 0 ? '+' : ''}${d.deviation_pct}%` : null}         sub="vs baseline"       accent="#22C55E" index={2} />
        <StatCard icon={Users}      label="Active Employees"   value={employees.length || 5}                                                                             sub="On roster"         accent="#FBBF24" index={3} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 380px', gap: 16 }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div id="frank"><FrankBriefing text={d?.briefing_text} /></div>
          <div id="pulse">
            <PulseChart forecast={forecast} deviation={d?.deviation_pct} alert={d?.alert} summary={d?.pulse_summary} rushHours={d?.rush_hours} goals={d?.goals} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div id="recommendations">
            <RecommendationsFeed recs={recs} conflicts={conflicts} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div id="shelf">
            <ShelfPanel employees={employees} eotw={eotw} costIntel={costIntel} healthScore={d?.health_score} />
          </div>
          <div id="voice">
            <VoicePanel reviews={reviews} pricingAlerts={d?.pricing_alerts} temporalAlerts={d?.temporal_alerts} />
          </div>
          <div id="crew">
            <CrewPanel staffing={staffing} />
          </div>
        </div>

      </div>
    </div>
  )
}
