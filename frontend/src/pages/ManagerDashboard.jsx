import { useState, useEffect, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp, TrendingDown, Users, AlertTriangle, Star,
  DollarSign, Heart, Zap, ChevronRight, CheckCircle,
  Clock, MessageSquare, Calendar, Activity, ThumbsUp,
  ThumbsDown, Flame, BarChart2, RefreshCw, Brain, XCircle,
  Send, Mail, Trash2, Plus, CheckSquare,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  apiDashboardManager, apiRecordFeedback, apiGetPreferences, apiGetLastOutput,
  apiGetMessages, apiSendMessage, apiDeleteMessage, apiGetMessageUsers,
  apiGetTasks, apiCreateTask, apiUpdateTask, apiDeleteTask,
  apiManualRefresh,
} from '../api/client'

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
              {Object.entries(goals).slice(0, 3).map(([key, val]) => {
                const target = typeof val === 'number' ? val : (val?.target ?? val?.monthly_target ?? val?.weekly_target ?? val?.daily_target ?? 0)
                const actual = typeof val === 'object' && val !== null ? val.actual_so_far : null
                return (
                  <div key={key} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'capitalize', marginBottom: 3 }}>{key.replace(/_/g, ' ')} target</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>${Number(target).toLocaleString()}</div>
                    {actual != null && <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 1 }}>${Number(actual).toLocaleString()} so far</div>}
                  </div>
                )
              })}
            </div>
          )}
          {rushHours?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Flame size={11} color="#F59E0B" />Rush windows
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {rushHours.map((h, i) => {
                  const label = typeof h === 'string' ? h : h?.window || JSON.stringify(h)
                  const rev   = typeof h === 'object' && h?.expected_revenue ? `$${Math.round(h.expected_revenue).toLocaleString()}` : null
                  const urg   = typeof h === 'object' ? h?.urgency : null
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: urg === 'high' ? '#FFF5F5' : 'var(--yellow-50)', border: `1px solid ${urg === 'high' ? '#FECACA' : 'var(--yellow-200)'}`, borderRadius: 8, fontSize: '0.7rem', fontWeight: 600, color: urg === 'high' ? '#DC2626' : '#92400E' }}>
                      <Flame size={9} />{label}{rev && <span style={{ fontWeight: 400, marginLeft: 4 }}>{rev}</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        <EmptyState icon={BarChart2} label="Revenue forecast will appear after FRANK runs" />
      )}
    </motion.div>
  )
}

const URGENCY_COLOR = { critical: '#DC2626', high: '#EF4444', medium: '#FBBF24', low: '#22C55E' }
const URGENCY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }

function ApprovalScoreBar({ score }) {
  if (score == null) return null
  const pct  = Math.round(score * 100)
  const col  = pct >= 70 ? '#22C55E' : pct >= 45 ? '#FBBF24' : '#EF4444'
  return (
    <div title={`Predicted approval probability: ${pct}%`} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ width: 50, height: 4, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: col, borderRadius: 99 }} />
      </div>
      <span style={{ fontSize: '0.62rem', fontWeight: 700, color: col }}>{pct}%</span>
    </div>
  )
}

function RecommendationsFeed({ recs, conflicts }) {
  const [filter, setFilter]   = useState('all')
  const [decided, setDecided] = useState({})   // id → 'approved' | 'rejected'
  const [acting, setActing]   = useState(null)
  const [prefs, setPrefs]     = useState(null)

  // Load preference model summary
  useEffect(() => {
    apiGetPreferences().then(r => setPrefs(r.data)).catch(() => {})
  }, [decided])

  const filtered = (recs || [])
    .filter(r => filter === 'all' || r.urgency === filter)
    .filter(r => !decided[r.id] || decided[r.id] === 'show')  // hide acted-on after a beat

  const handleDecide = useCallback(async (rec, action) => {
    setActing(rec.id + action)
    try {
      await apiRecordFeedback({
        recommendation_id: rec.id,
        category:          rec.category || 'composite',
        agent:             rec.agent    || 'FRANK',
        financial_impact:  rec.impact   || 0,
        urgency:           rec.urgency  || 'medium',
        action,
      })
      setDecided(d => ({ ...d, [rec.id]: action }))
      // Refresh preferences after each decision
      apiGetPreferences().then(r => setPrefs(r.data)).catch(() => {})
    } catch (e) {
      console.error('Feedback failed', e)
    } finally { setActing(null) }
  }, [])

  const drift = prefs?.drift_detected
  const approvalRate = prefs?.approval_rate_30d
  const threshold    = prefs?.action_threshold
  const insights     = prefs?.insights || []

  return (
    <motion.div {...fadeUp(6)} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 16, padding: '22px 24px', boxShadow: 'var(--shadow-sm)' }}>

      {/* Drift warning */}
      {drift && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 14px', background: '#FFF5F5', border: '1px solid #FECACA', borderRadius: 10, marginBottom: 14 }}>
          <AlertTriangle size={14} color="#EF4444" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#DC2626' }}>Preference drift detected — </span>
            <span style={{ fontSize: '0.75rem', color: '#B91C1C' }}>
              your approval rate has dropped significantly over the last 30 days. Confidence bounds are widened; FRANK is recalibrating.
            </span>
          </div>
        </div>
      )}

      <SectionHeader agent="FRANK" title="Agent Recommendations"
        sub={`${(recs || []).length} recommendations${prefs?.total_decisions > 0 ? ` · ${prefs.total_decisions} decisions logged` : ''}`}
        action={
          <div style={{ display: 'flex', gap: 4 }}>
            {['all', 'critical', 'high', 'medium', 'low'].map(f => (
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
            {filtered.map((rec, i) => {
              const isDecided = decided[rec.id]
              const isActing  = acting?.startsWith(rec.id)
              const uc = URGENCY_COLOR[rec.urgency] || '#94A3B8'

              return (
                <motion.div
                  key={rec.id || i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: isDecided ? 0.55 : 1, x: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.25 }}
                  style={{
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                    padding: '14px 16px',
                    background: isDecided === 'approved' ? '#F0FDF4' : isDecided === 'rejected' ? '#FFF5F5' : 'var(--off-white)',
                    border: `1px solid ${isDecided === 'approved' ? '#BBF7D0' : isDecided === 'rejected' ? '#FECACA' : 'var(--border-soft)'}`,
                    borderRadius: 12,
                  }}
                >
                  <div style={{ paddingTop: 3, flexShrink: 0 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: uc, boxShadow: `0 0 6px ${uc}88` }} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
                      <AgentChip name={rec.agent} />
                      {rec.category && <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--surface)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 99 }}>{rec.category}</span>}
                      {rec.requires_approval && !isDecided && <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', padding: '2px 8px', borderRadius: 99 }}>Needs Approval</span>}
                      {isDecided && <span style={{ fontSize: '0.68rem', fontWeight: 700, color: isDecided === 'approved' ? '#16A34A' : '#DC2626', background: isDecided === 'approved' ? '#F0FDF4' : '#FFF5F5', border: `1px solid ${isDecided === 'approved' ? '#BBF7D0' : '#FECACA'}`, padding: '2px 8px', borderRadius: 99 }}>{isDecided}</span>}
                    </div>

                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: 4 }}>{rec.title}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>{rec.description}</div>

                    <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      {rec.impact > 0 && <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><DollarSign size={11} color="#3B82F6" /><span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#1D4ED8' }}>${Number(rec.impact).toLocaleString()} impact</span></div>}
                      {rec.owner && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Owner: <strong>{rec.owner}</strong></div>}
                      {rec.deadline && <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.72rem', color: 'var(--text-muted)' }}><Clock size={10} /> {rec.deadline}</div>}
                      <ApprovalScoreBar score={rec.approval_score} />
                    </div>
                  </div>

                  {/* Approve / Reject */}
                  {!isDecided ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
                      <motion.button
                        onClick={() => handleDecide(rec, 'approved')}
                        disabled={!!acting}
                        whileTap={{ scale: 0.93 }}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 11px', borderRadius: 7, border: 'none', background: '#22C55E', color: 'white', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', opacity: isActing ? 0.7 : 1 }}
                      >
                        {isActing && acting === rec.id + 'approved'
                          ? <RefreshCw size={10} style={{ animation: 'spin 1s linear infinite' }} />
                          : <ThumbsUp size={11} />} Approve
                      </motion.button>
                      <motion.button
                        onClick={() => handleDecide(rec, 'rejected')}
                        disabled={!!acting}
                        whileTap={{ scale: 0.93 }}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 11px', borderRadius: 7, border: '1px solid #FECACA', background: 'white', color: '#DC2626', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        {isActing && acting === rec.id + 'rejected'
                          ? <RefreshCw size={10} style={{ animation: 'spin 1s linear infinite' }} />
                          : <XCircle size={11} />} Reject
                      </motion.button>
                    </div>
                  ) : (
                    <div style={{ flexShrink: 0 }}>
                      {isDecided === 'approved'
                        ? <CheckCircle size={16} color="#22C55E" />
                        : <XCircle size={16} color="#EF4444" />}
                    </div>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      ) : (
        <EmptyState icon={CheckCircle} label={recs?.length > 0 ? `No ${filter} urgency recommendations` : 'Recommendations will appear after FRANK runs'} />
      )}

      {/* Preference insights */}
      {prefs && prefs.total_decisions > 0 && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Brain size={13} color="#6366F1" />
            <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4338CA' }}>
              Learned Preferences · {prefs.total_decisions} decisions
            </p>
            {approvalRate != null && (
              <span style={{ marginLeft: 'auto', fontSize: '0.68rem', fontWeight: 600, color: approvalRate >= 0.6 ? '#16A34A' : '#DC2626' }}>
                30d approval: {Math.round(approvalRate * 100)}%
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {threshold != null && (
              <div style={{ padding: '5px 10px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, fontSize: '0.72rem', color: '#1D4ED8', fontWeight: 600 }}>
                Action threshold: ${Math.round(threshold)}+
              </div>
            )}
            {insights.map((ins, i) => (
              <div key={i} style={{ padding: '5px 10px', background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 8, fontSize: '0.72rem', color: '#7C3AED' }}>
                {ins}
              </div>
            ))}
            {Object.entries(prefs.category_weights || {}).filter(([,v]) => v !== 0.5).slice(0, 4).map(([cat, w]) => (
              <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{cat}</span>
                <div style={{ width: 30, height: 3, background: 'var(--border)', borderRadius: 99 }}>
                  <div style={{ width: `${Math.round(w * 100)}%`, height: '100%', background: w >= 0.6 ? '#22C55E' : '#EF4444', borderRadius: 99 }} />
                </div>
                <span style={{ fontSize: '0.65rem', color: w >= 0.6 ? '#16A34A' : '#DC2626', fontWeight: 700 }}>{Math.round(w * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
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
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
          {Object.entries(costIntel)
            .filter(([, val]) => typeof val === 'number')
            .slice(0, 4)
            .map(([key, val]) => (
              <div key={key} style={{ flex: 1, minWidth: 80, textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'capitalize', marginBottom: 2 }}>{key.replace(/_/g, ' ')}</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>{val > 100 ? `$${val.toLocaleString()}` : `${val}%`}</div>
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
                {emp.hourly_rate != null && (
                  <div style={{ fontWeight: 700, fontSize: '0.83rem', color: 'var(--text-primary)' }}>${emp.hourly_rate}/hr{emp.hours_per_week ? ` · ${emp.hours_per_week}h` : ''}</div>
                )}
                {emp.performance_score != null && (
                  <div style={{ fontSize: '0.68rem', color: emp.performance_score >= 80 ? '#16A34A' : emp.performance_score >= 60 ? '#92400E' : '#DC2626', fontWeight: 600, marginTop: 2 }}>
                    Score {emp.performance_score}
                  </div>
                )}
                {emp.monthly_cost != null && !emp.hourly_rate && (
                  <div style={{ fontWeight: 700, fontSize: '0.83rem', color: 'var(--text-primary)' }}>${emp.monthly_cost}/mo</div>
                )}
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
              <div style={{ fontSize: '0.78rem', color: '#B91C1C', lineHeight: 1.5 }}>
                {typeof alert === 'string' ? alert : (alert.recommended_action || alert.insight || alert.detail || alert.title || '')}
                {alert.financial_impact > 0 && <span style={{ fontWeight: 700, marginLeft: 6 }}>${alert.financial_impact?.toLocaleString()} impact</span>}
              </div>
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
  // staffing may be {shifts:[...]} from API or {name:{start,end}} from mock
  const rawShifts = Array.isArray(staffing?.shifts) ? staffing.shifts : null
  const shifts = rawShifts
    ? rawShifts.slice(0, 5).map(s => ({
        name: s.shift_id || s.shift_date || 'Shift',
        start: s.shift_start, end: s.shift_end,
        hours: null,
        status: s.staffing_status,
        adjustment: s.adjustment,
        employeeCount: s.employees?.length || 0,
      }))
    : staffing && Object.keys(staffing).length > 0
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
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--surface)', border: `1px solid ${shift.status === 'understaffed' ? '#FECACA' : 'var(--border-soft)'}`, borderRadius: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #FB923C, #F97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.75rem' }}>{(shift.name?.[0] || '?').toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{shift.start && shift.end ? `${shift.start} – ${shift.end}` : shift.name}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{shift.adjustment || (shift.employeeCount ? `${shift.employeeCount} staff` : '')}</div>
              </div>
              {shift.status && <div style={{ fontSize: '0.68rem', fontWeight: 700, color: shift.status === 'understaffed' ? '#DC2626' : shift.status === 'overstaffed' ? '#92400E' : '#166534', background: shift.status === 'understaffed' ? '#FFF5F5' : shift.status === 'overstaffed' ? '#FFFBEB' : '#F0FDF4', padding: '2px 8px', borderRadius: 99, flexShrink: 0 }}>{shift.status}</div>}
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

// ── Messaging Panel (CEO → Employees) ─────────────────────────────
function MessagingPanel() {
  const [messages, setMessages]   = useState([])
  const [users, setUsers]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [composing, setComposing] = useState(false)
  const [form, setForm]           = useState({ recipient_email: '', subject: '', body: '' })
  const [sending, setSending]     = useState(false)
  const [sent, setSent]           = useState(false)
  const [expanded, setExpanded]   = useState(null)

  const load = useCallback(() => {
    Promise.all([
      apiGetMessages().catch(() => ({ data: { messages: [] } })),
      apiGetMessageUsers().catch(() => ({ data: { users: [] } })),
    ]).then(([msgRes, userRes]) => {
      setMessages(msgRes.data.messages || [])
      setUsers(userRes.data.users || [])
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleSend = async () => {
    if (!form.body.trim()) return
    setSending(true)
    try {
      await apiSendMessage({
        recipient_email: form.recipient_email || null,
        subject: form.subject || '(No subject)',
        body: form.body,
      })
      setForm({ recipient_email: '', subject: '', body: '' })
      setComposing(false)
      setSent(true)
      load()
      setTimeout(() => setSent(false), 3000)
    } finally { setSending(false) }
  }

  const handleDelete = async (id) => {
    await apiDeleteMessage(id).catch(() => {})
    load()
  }

  const employees = users.filter(u => u.role === 'employee')

  return (
    <motion.div {...fadeUp(7)} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 16, padding: '22px 24px', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 99, background: '#EEF2FF', border: '1px solid #C7D2FE', fontSize: '0.68rem', fontWeight: 700, color: '#4338CA', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#818CF8', boxShadow: '0 0 4px #818CF8' }} />CEO
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>Message Employees</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>{messages.length} message{messages.length !== 1 ? 's' : ''} sent</div>
          </div>
        </div>
        <motion.button onClick={() => setComposing(c => !c)} whileTap={{ scale: 0.95 }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, border: '1px solid #C7D2FE', background: composing ? '#EEF2FF' : 'white', color: '#4338CA', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
          <Mail size={13} /> {composing ? 'Cancel' : 'New Message'}
        </motion.button>
      </div>

      {sent && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          style={{ padding: '10px 14px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 9, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle size={14} color="#22C55E" />
          <span style={{ fontSize: '0.82rem', color: '#166534', fontWeight: 600 }}>Message sent successfully!</span>
        </motion.div>
      )}

      <AnimatePresence>
        {composing && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} style={{ overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ padding: '16px', background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#4338CA', marginBottom: 4, display: 'block', letterSpacing: '0.04em' }}>TO</label>
                  <select value={form.recipient_email} onChange={e => setForm(f => ({ ...f, recipient_email: e.target.value }))}
                    style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid #C7D2FE', background: 'white', fontFamily: "'Outfit', sans-serif", fontSize: '0.84rem', outline: 'none' }}>
                    <option value="">All Employees (Broadcast)</option>
                    {employees.map(u => (
                      <option key={u.email} value={u.email}>{u.full_name} ({u.email})</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#4338CA', marginBottom: 4, display: 'block', letterSpacing: '0.04em' }}>SUBJECT</label>
                  <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder="Subject…"
                    style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid #C7D2FE', background: 'white', fontFamily: "'Outfit', sans-serif", fontSize: '0.84rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
              <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                placeholder="Write your message here…" rows={4}
                style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #C7D2FE', background: 'white', fontFamily: "'Outfit', sans-serif", fontSize: '0.84rem', outline: 'none', resize: 'vertical', lineHeight: 1.55 }} />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setComposing(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'white', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', color: 'var(--text-secondary)' }}>Cancel</button>
                <motion.button onClick={handleSend} disabled={sending || !form.body.trim()} whileTap={{ scale: 0.97 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, border: 'none', background: '#6366F1', color: 'white', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', opacity: sending || !form.body.trim() ? 0.6 : 1 }}>
                  {sending ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={13} />}
                  {sending ? 'Sending…' : 'Send Message'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: '12px 0' }}>Loading…</p>
      ) : messages.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>No messages sent yet</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {messages.map(msg => (
            <div key={msg.id}>
              <div onClick={() => setExpanded(expanded === msg.id ? null : msg.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 9, cursor: 'pointer', background: 'var(--surface)', border: '1px solid var(--border-soft)', transition: 'background 0.12s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#EEF2FF'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #818CF8, #6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
                  {msg.recipient[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    → {msg.recipient}
                    {msg.is_broadcast && <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#6366F1', background: '#EEF2FF', border: '1px solid #C7D2FE', padding: '1px 6px', borderRadius: 99 }}>Broadcast</span>}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msg.subject}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 1 }}>
                    {new Date(msg.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · {msg.read_count} read
                  </div>
                </div>
                <button onClick={e => { e.stopPropagation(); handleDelete(msg.id) }}
                  style={{ padding: '5px', borderRadius: 6, border: '1px solid #FECACA', background: '#FFF5F5', cursor: 'pointer', display: 'flex', flexShrink: 0 }}>
                  <Trash2 size={12} color="#EF4444" />
                </button>
              </div>
              <AnimatePresence>
                {expanded === msg.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
                    <div style={{ padding: '12px 14px', background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: '0 0 9px 9px', marginTop: -4, borderTop: 'none' }}>
                      <p style={{ fontSize: '0.84rem', color: 'var(--text-primary)', lineHeight: 1.65, whiteSpace: 'pre-wrap', margin: 0 }}>{msg.body}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  )
}

// ── Manager Task Panel ─────────────────────────────────────────────
const PRIORITY_STYLE = {
  high:   { bg: '#FFF5F5', border: '#FECACA', text: '#DC2626' },
  medium: { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E' },
  low:    { bg: '#F0FDF4', border: '#BBF7D0', text: '#166534' },
}

function ManagerTaskPanel({ users }) {
  const [tasks, setTasks]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [composing, setComposing] = useState(false)
  const [form, setForm]         = useState({ title: '', notes: '', priority: 'medium', due_date: '', assigned_to_email: '' })
  const [saving, setSaving]     = useState(false)
  const [filter, setFilter]     = useState('all')   // all | pending | done

  const load = useCallback(() => {
    apiGetTasks().then(r => setTasks(r.data.tasks || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      await apiCreateTask({ ...form, due_date: form.due_date || null, assigned_to_email: form.assigned_to_email || null })
      setForm({ title: '', notes: '', priority: 'medium', due_date: '', assigned_to_email: '' })
      setComposing(false)
      load()
    } finally { setSaving(false) }
  }

  const handleStatus = async (task, status) => {
    await apiUpdateTask(task.id, { status })
    load()
  }

  const handleDelete = async (id) => {
    await apiDeleteTask(id)
    load()
  }

  const employees = (users || []).filter(u => u.role === 'employee')

  const filtered = filter === 'all'
    ? tasks
    : filter === 'done'
    ? tasks.filter(t => t.status === 'done')
    : tasks.filter(t => t.status !== 'done')

  const pending = tasks.filter(t => t.status !== 'done').length

  return (
    <motion.div {...fadeUp(8)} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 16, padding: '22px 24px', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 99, background: '#FFFBEB', border: '1px solid #FDE68A', fontSize: '0.68rem', fontWeight: 700, color: '#92400E', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#FBBF24', boxShadow: '0 0 4px #FBBF24' }} />CREW
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
              Task Management {pending > 0 && <span style={{ fontSize: '0.72rem', color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', padding: '2px 8px', borderRadius: 99, marginLeft: 4 }}>{pending} open</span>}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>Assign and track tasks across your team</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ display: 'flex', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 3 }}>
            {['all', 'pending', 'done'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, textTransform: 'capitalize', background: filter === f ? 'white' : 'transparent', color: filter === f ? 'var(--text-primary)' : 'var(--text-muted)', boxShadow: filter === f ? 'var(--shadow-sm)' : 'none', transition: 'all 0.15s' }}>{f}</button>
            ))}
          </div>
          <motion.button onClick={() => setComposing(c => !c)} whileTap={{ scale: 0.95 }}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9, border: '1px solid #FDE68A', background: composing ? '#FFFBEB' : 'white', color: '#92400E', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
            <Plus size={12} /> {composing ? 'Cancel' : 'New Task'}
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {composing && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} style={{ overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ padding: '16px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Task title…" autoFocus
                style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #FDE68A', background: 'white', fontFamily: "'Outfit', sans-serif", fontSize: '0.9rem', fontWeight: 600, outline: 'none' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <select value={form.assigned_to_email} onChange={e => setForm(f => ({ ...f, assigned_to_email: e.target.value }))}
                  style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #FDE68A', background: 'white', fontFamily: "'Outfit', sans-serif", fontSize: '0.78rem', outline: 'none' }}>
                  <option value="">Assign to…</option>
                  {employees.map(u => <option key={u.email} value={u.email}>{u.full_name}</option>)}
                </select>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                  style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #FDE68A', background: 'white', fontFamily: "'Outfit', sans-serif", fontSize: '0.78rem', outline: 'none' }}>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                  style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #FDE68A', background: 'white', fontFamily: "'Outfit', sans-serif", fontSize: '0.78rem', outline: 'none' }} />
              </div>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Notes / instructions (optional)…"
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #FDE68A', background: 'white', fontFamily: "'Outfit', sans-serif", fontSize: '0.82rem', outline: 'none' }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={() => setComposing(false)} style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'white', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', color: 'var(--text-secondary)' }}>Cancel</button>
                <motion.button onClick={handleCreate} disabled={saving || !form.title.trim()} whileTap={{ scale: 0.97 }}
                  style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: '#F59E0B', color: 'white', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', opacity: saving || !form.title.trim() ? 0.6 : 1 }}>
                  {saving ? 'Creating…' : 'Create Task'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: '16px' }}>Loading tasks…</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          {filter === 'done' ? 'No completed tasks yet' : 'No tasks yet — create one above'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(task => {
            const ps = PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.medium
            const isDone = task.status === 'done'
            return (
              <motion.div key={task.id} layout
                style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 10, background: isDone ? '#F9FAFB' : ps.bg, border: `1px solid ${isDone ? '#E5E7EB' : ps.border}`, opacity: isDone ? 0.75 : 1 }}>
                <button onClick={() => handleStatus(task, isDone ? 'pending' : 'done')}
                  style={{ marginTop: 2, background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
                  {isDone
                    ? <CheckCircle size={16} color="#22C55E" />
                    : <CheckSquare size={16} color={ps.text} />}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-primary)', textDecoration: isDone ? 'line-through' : 'none', marginBottom: 2 }}>{task.title}</div>
                  {task.notes && <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: 4 }}>{task.notes}</div>}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    {task.assigned_to_email && <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#1D4ED8', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '1px 7px', borderRadius: 99 }}>→ {task.assigned_to_email.split('@')[0]}</span>}
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: ps.text, background: 'white', border: `1px solid ${ps.border}`, padding: '1px 6px', borderRadius: 99 }}>{task.priority}</span>
                    {task.due_date && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Due {task.due_date}</span>}
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', background: 'var(--surface)', border: '1px solid var(--border)', padding: '1px 6px', borderRadius: 99, textTransform: 'capitalize' }}>{task.status.replace('_', ' ')}</span>
                  </div>
                </div>
                <button onClick={() => handleDelete(task.id)}
                  style={{ padding: '5px', borderRadius: 6, border: '1px solid #FECACA', background: '#FFF5F5', cursor: 'pointer', display: 'flex', flexShrink: 0 }}>
                  <Trash2 size={12} color="#EF4444" />
                </button>
              </motion.div>
            )
          })}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
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
  const [data, setData]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [users, setUsers]           = useState([])
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(null)

  const loadData = useCallback(() => {
    apiDashboardManager()
      .then(res => setData(res.data))
      .catch(() =>
        apiGetLastOutput()
          .then(r => setData(r.data))
          .catch(() => setData(null))
      )
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadData()
    apiGetMessageUsers().then(r => setUsers(r.data.users || [])).catch(() => {})
  }, [loadData])

  const handleManualRefresh = useCallback(() => {
    setRefreshing(true)
    apiManualRefresh()
      .then(res => {
        setLastRefresh(res.data?.summary?.refreshed_at)
        return apiGetLastOutput()
      })
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setRefreshing(false))
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
          <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>CEO Dashboard</p>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem', letterSpacing: '0.06em', color: 'var(--text-primary)', lineHeight: 1 }}>Daily Operations</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {data
            ? <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 99 }}>
                <Activity size={12} color="#22C55E" />
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#166534' }}>
                  {lastRefresh ? `Updated ${new Date(lastRefresh).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}` : 'Live Data'}
                </span>
              </div>
            : <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: 'var(--yellow-50)', border: '1px solid var(--yellow-200)', borderRadius: 99 }}><RefreshCw size={12} color="#92400E" /><span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400E' }}>Demo Mode</span></div>
          }
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 99, border: '1px solid #A78BFA',
              background: refreshing ? '#F3F0FF' : 'linear-gradient(135deg,#7C3AED,#6D28D9)',
              color: refreshing ? '#7C3AED' : '#fff',
              fontSize: '0.72rem', fontWeight: 700, cursor: refreshing ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <RefreshCw size={11} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            {refreshing ? 'Refreshing…' : 'Refresh Data'}
          </button>
        </div>
      </motion.div>

      <AlertsBanner alerts={alerts} />

      {/* ── Stat row ─── */}
      {(() => {
        const ci = d?.cost_intelligence || {}
        const monthlyRev = ci.monthly_revenue || d?.dataset?.monthly_revenue
        const laborPct   = ci.labor_pct_of_revenue ?? ci.labor_cost_pct
        const weekLabor  = ci.weekly_labor_cost
        const devPct     = d?.deviation_pct
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            <StatCard icon={Heart}      label="Health Score"       value={d?.health_score != null ? `${d.health_score}/100` : null}  sub="Business vitality"  accent="#22C55E" index={0} />
            <StatCard icon={DollarSign} label="Monthly Revenue"    value={monthlyRev ? `$${Number(monthlyRev).toLocaleString()}` : null} sub={d?.dataset?.business_id ? d.dataset.business_id.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()) : 'Business'} accent="#3B82F6" index={1} trend={devPct != null ? Math.round(devPct) : null} />
            <StatCard icon={TrendingUp} label="Weekly Labor Cost"  value={weekLabor ? `$${Number(weekLabor).toLocaleString()}` : null} sub={laborPct != null ? `${Number(laborPct).toFixed(1)}% of revenue` : 'vs revenue'} accent={laborPct > 35 ? '#EF4444' : '#FBBF24'} index={2} />
            <StatCard icon={Users}      label="Active Employees"   value={employees.length || null}                                  sub="On roster"          accent="#8B5CF6" index={3} />
          </div>
        )
      })()}

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

      {/* ── Messaging + Tasks row ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <MessagingPanel />
        <ManagerTaskPanel users={users} />
      </div>

    </div>
  )
}
