import { useState, useEffect, useRef } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Bell, RefreshCw, Zap, Users, TrendingUp, MessageSquare, Calendar, ShoppingCart, X, CheckCircle } from 'lucide-react'
import Sidebar from './Sidebar'
import { useAuth } from '../../context/AuthContext'
import { apiRunFrank, apiDashboardManager, apiNotifications, apiGetDataset } from '../../api/client'

// ── Search index builder ──────────────────────────────────────────
function buildIndex(d) {
  if (!d) return []
  const items = []

  // Employees
  const employees = d.employee_intelligence?.employees || d.employees || []
  employees.forEach(e => {
    items.push({
      type: 'employee', icon: Users, label: e.name,
      sub: `${e.role} · ${e.hourly_rate ? `$${e.hourly_rate}/hr` : e.monthly_cost ? `$${e.monthly_cost}/mo` : ''}`,
      route: '/dashboard/team', keywords: `${e.name} ${e.role}`.toLowerCase(),
    })
  })

  // Recommendations
  const recs = d.recommendations || []
  recs.forEach(r => {
    items.push({
      type: 'recommendation', icon: Zap, label: r.title,
      sub: `${r.agent} · ${r.urgency} urgency`,
      route: '/dashboard/overview', keywords: `${r.title} ${r.description || ''} ${r.agent}`.toLowerCase(),
    })
  })

  // Reviews
  const reviews = d.reviews || []
  reviews.forEach(r => {
    const text = r.reply_text || r.original_review || r.text || ''
    items.push({
      type: 'review', icon: MessageSquare, label: text.slice(0, 60) + (text.length > 60 ? '…' : ''),
      sub: `${r.platform || r.author || 'Review'} · ${r.rating ? `${r.rating}★` : r.sentiment || ''}`,
      route: '/dashboard/reviews', keywords: text.toLowerCase(),
    })
  })

  // Revenue / Goals
  if (d.goals) {
    items.push({
      type: 'metric', icon: TrendingUp, label: 'Revenue Goals & Forecast',
      sub: 'PULSE · 72-hour forecast',
      route: '/dashboard/revenue', keywords: 'revenue forecast goals pulse',
    })
  }

  // Shifts
  items.push({
    type: 'shift', icon: Calendar, label: 'Shift Schedule',
    sub: 'CREW · Workforce planning',
    route: '/dashboard/scheduling', keywords: 'shift schedule crew staffing hours',
  })

  // Cost intel
  if (d.cost_intelligence) {
    const ci = d.cost_intelligence
    if (ci.flagged_items) {
      ci.flagged_items.forEach(f => {
        items.push({
          type: 'cost', icon: ShoppingCart, label: f.item || 'Flagged item',
          sub: `Cost intel · ${f.urgency || ''} urgency`,
          route: '/dashboard/costintel', keywords: `${f.item || ''} ${f.root_cause || ''} ${f.recommended_action || ''}`.toLowerCase(),
        })
      })
    }
    items.push({
      type: 'cost', icon: ShoppingCart, label: 'Cost Intelligence',
      sub: `SHELF · Labor ${ci.labor_cost_pct ?? ci.labor_pct_of_revenue ?? ''}%`,
      route: '/dashboard/costintel', keywords: 'cost labor food margin delivery shelf',
    })
  }

  return items
}

const TYPE_COLOR = {
  employee:       { bg: '#EFF6FF', color: '#1D4ED8' },
  recommendation: { bg: '#FFFBEB', color: '#92400E' },
  review:         { bg: '#F0FDF4', color: '#166534' },
  metric:         { bg: '#EFF6FF', color: '#1D4ED8' },
  shift:          { bg: '#FFF7ED', color: '#9A3412' },
  cost:           { bg: '#FDF4FF', color: '#7E22CE' },
}

function SearchBox({ dashData }) {
  const [query, setQuery] = useState('')
  const [open, setOpen]   = useState(false)
  const ref               = useRef(null)
  const navigate          = useNavigate()
  const index             = buildIndex(dashData)

  const results = query.trim().length > 0
    ? index.filter(item => item.keywords.includes(query.toLowerCase())).slice(0, 8)
    : []

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (item) => {
    navigate(item.route)
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative', width: 260 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 14px',
        background: 'var(--surface)',
        border: `1px solid ${open ? 'var(--blue-400)' : 'var(--border)'}`,
        borderRadius: 10, cursor: 'text',
        transition: 'all 0.2s ease',
        boxShadow: open ? '0 0 0 3px rgba(59,130,246,0.1)' : 'none',
      }}>
        <Search size={15} color={open ? 'var(--blue-500)' : 'var(--text-muted)'} style={{ flexShrink: 0 }} />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Search employees, shifts, reviews…"
          style={{
            border: 'none', background: 'none', outline: 'none',
            fontFamily: "'Outfit', sans-serif",
            fontSize: '0.85rem', color: 'var(--text-primary)', width: '100%',
          }}
        />
        {query && (
          <button onClick={() => { setQuery(''); setOpen(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}>
            <X size={14} color="var(--text-muted)" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
              background: 'white', border: '1px solid var(--border)',
              borderRadius: 12, boxShadow: 'var(--shadow-lg)',
              zIndex: 200, overflow: 'hidden',
            }}
          >
            {results.map((item, i) => {
              const tc = TYPE_COLOR[item.type] || TYPE_COLOR.metric
              return (
                <motion.div
                  key={i}
                  onClick={() => handleSelect(item)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', cursor: 'pointer',
                    borderBottom: i < results.length - 1 ? '1px solid var(--border-soft)' : 'none',
                    transition: 'background 0.12s ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--off-white)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}
                >
                  <div style={{
                    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                    background: tc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <item.icon size={14} color={tc.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}>{item.sub}</div>
                  </div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: tc.color, background: tc.bg, padding: '2px 8px', borderRadius: 99, textTransform: 'capitalize', flexShrink: 0 }}>
                    {item.type}
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}
        {open && query.trim().length > 0 && results.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '16px', textAlign: 'center', boxShadow: 'var(--shadow-lg)', zIndex: 200 }}
          >
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No results for "{query}"</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Notification Bell ─────────────────────────────────────────────
function NotificationBell() {
  const [count, setCount]   = useState(0)
  const [items, setItems]   = useState([])
  const [open, setOpen]     = useState(false)
  const navigate            = useNavigate()
  const ref                 = useRef(null)

  useEffect(() => {
    const load = () => {
      apiNotifications()
        .then(res => { setCount(res.data.count || 0); setItems(res.data.items || []) })
        .catch(() => {})
    }
    load()
    const id = setInterval(load, 30000)  // poll every 30s
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <motion.button
        onClick={() => setOpen(o => !o)}
        className="btn-ghost"
        style={{ padding: '9px', borderRadius: 10, position: 'relative' }}
        whileTap={{ scale: 0.92 }}
      >
        <Bell size={18} />
        {count > 0 && (
          <div style={{
            position: 'absolute', top: 4, right: 4,
            minWidth: 16, height: 16, borderRadius: 99,
            background: '#EF4444', color: 'white',
            fontSize: '0.6rem', fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px', boxShadow: '0 0 6px rgba(239,68,68,0.5)',
          }}>{count > 9 ? '9+' : count}</div>
        )}
        {count === 0 && (
          <div style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: '50%', background: 'var(--yellow-400)', boxShadow: '0 0 8px rgba(251,191,36,0.6)' }} />
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              width: 320, background: 'white', border: '1px solid var(--border)',
              borderRadius: 14, boxShadow: 'var(--shadow-lg)', zIndex: 200, overflow: 'hidden',
            }}
          >
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>Notifications</span>
              {count > 0 && <div style={{ padding: '2px 8px', borderRadius: 99, background: '#FEE2E2', color: '#DC2626', fontSize: '0.68rem', fontWeight: 700 }}>{count} pending</div>}
            </div>
            {items.length > 0 ? (
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                {items.map((item, i) => (
                  <div key={i} onClick={() => { navigate('/dashboard/scheduling'); setOpen(false) }}
                    style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: i < items.length - 1 ? '1px solid var(--border-soft)' : 'none', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--off-white)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                    <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: 2 }}>
                      {item.name} — {item.request_type} request
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {item.shift_id}{item.note ? ` · "${item.note}"` : ''}
                    </div>
                    <div style={{ marginTop: 4, fontSize: '0.68rem', fontWeight: 700, color: item.status === 'pending' ? '#92400E' : item.status === 'approved' ? '#16A34A' : '#DC2626', background: item.status === 'pending' ? '#FFFBEB' : item.status === 'approved' ? '#F0FDF4' : '#FFF5F5', display: 'inline-block', padding: '1px 7px', borderRadius: 99, textTransform: 'capitalize' }}>
                      {item.status}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                <CheckCircle size={18} color="#22C55E" style={{ marginBottom: 8 }} />
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>All caught up</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Top Bar ───────────────────────────────────────────────────────
function TopBar({ onRunFrank, running, dashData, bizInfo }) {
  const { user } = useAuth()
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const bizName = bizInfo?.business_id
    ? bizInfo.business_id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : (dashData?.dataset?.business_id ? dashData.dataset.business_id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Your Business')
  const bizLoc = bizInfo?.location || dashData?.dataset?.location || ''

  return (
    <header style={{
      height: 68,
      background: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-soft)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 28px',
      gap: 16,
      position: 'sticky',
      top: 0,
      zIndex: 30,
      boxShadow: '0 1px 12px rgba(59,130,246,0.05)',
    }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>{dateStr}</p>
        <p style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: 1 }}>
          {bizName}{bizLoc ? ` · ${bizLoc}` : ''}
        </p>
      </div>

      <SearchBox dashData={dashData} />

      <motion.button
        onClick={onRunFrank}
        disabled={running}
        className="btn-primary"
        style={{ padding: '9px 18px', fontSize: '0.82rem', gap: 7, borderRadius: 10 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.96 }}
      >
        {running
          ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Running…</>
          : <><Zap size={14} /> Run FRANK</>
        }
      </motion.button>

      <NotificationBell />

      <div title={user?.full_name || user?.email} style={{
        width: 36, height: 36, borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--blue-600), var(--blue-400))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', fontSize: '0.85rem', fontWeight: 700,
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(59,130,246,0.3)',
        flexShrink: 0,
      }}>
        {(user?.full_name || user?.email || 'U')[0].toUpperCase()}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </header>
  )
}

// ── Dashboard Shell ───────────────────────────────────────────────
export default function DashboardShell() {
  const [collapsed, setCollapsed] = useState(false)
  const [running, setRunning]     = useState(false)
  const [frankData, setFrankData] = useState(null)
  const [dashData, setDashData]   = useState(null)
  const [bizInfo, setBizInfo]     = useState(null)
  const location                  = useLocation()

  // Pre-fetch dashboard data for search index and biz name
  useEffect(() => {
    apiDashboardManager().then(res => setDashData(res.data)).catch(() => {})
    apiGetDataset().then(res => setBizInfo(res.data)).catch(() => {})
  }, [])

  const sidebarWidth = collapsed ? 72 : 260

  const handleRunFrank = async () => {
    setRunning(true)
    try {
      const res = await apiRunFrank()
      setFrankData(res.data)
      setDashData(res.data)
    } catch (err) {
      console.error('FRANK run failed:', err)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--off-white)' }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />

      <main style={{
        flex: 1,
        marginLeft: sidebarWidth,
        transition: 'margin-left 0.28s cubic-bezier(0.4,0,0.2,1)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <TopBar onRunFrank={handleRunFrank} running={running} dashData={dashData} bizInfo={bizInfo} />

        <div style={{ flex: 1, padding: '28px 28px 40px' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              style={{ height: '100%' }}
            >
              <Outlet context={{ frankData, running, refetch: handleRunFrank }} />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
