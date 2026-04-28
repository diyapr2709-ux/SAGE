import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Bell, RefreshCw, Zap } from 'lucide-react'
import Sidebar from './Sidebar'
import { useAuth } from '../../context/AuthContext'
import { apiRunFrank } from '../../api/client'

// ── Top Bar ───────────────────────────────────────────────────────
function TopBar({ onRunFrank, running }) {
  const { user } = useAuth()
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

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
      {/* Date */}
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>{dateStr}</p>
        <p style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: 1 }}>
          Marathon Deli · College Park, MD
        </p>
      </div>

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 16px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        width: 220,
        cursor: 'text',
        transition: 'all 0.2s ease',
      }}>
        <Search size={15} color="var(--text-muted)" />
        <input
          placeholder="Search…"
          style={{
            border: 'none', background: 'none', outline: 'none',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '0.875rem', color: 'var(--text-primary)', width: '100%',
          }}
        />
        <kbd style={{
          fontSize: '0.65rem', color: 'var(--text-muted)',
          background: 'var(--border)', padding: '2px 6px', borderRadius: 5,
          fontFamily: 'monospace',
        }}>⌘K</kbd>
      </div>

      {/* Run FRANK */}
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

      {/* Bell */}
      <motion.button
        className="btn-ghost"
        style={{ padding: '9px', borderRadius: 10, position: 'relative' }}
        whileTap={{ scale: 0.92 }}
      >
        <Bell size={18} />
        <div style={{
          position: 'absolute', top: 6, right: 6,
          width: 7, height: 7, borderRadius: '50%',
          background: 'var(--yellow-400)',
          boxShadow: '0 0 8px rgba(251,191,36,0.6)',
        }} />
      </motion.button>

      {/* Avatar */}
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--blue-600), var(--blue-400))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', fontSize: '0.85rem', fontWeight: 700,
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(59,130,246,0.3)',
        flexShrink: 0,
      }}>
        {user?.email?.[0]?.toUpperCase() || 'U'}
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
  const location                  = useLocation()

  const sidebarWidth = collapsed ? 72 : 260

  const handleRunFrank = async () => {
    setRunning(true)
    try {
      const res = await apiRunFrank()
      setFrankData(res.data)
    } catch (err) {
      console.error('FRANK run failed:', err)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--off-white)' }}>
      {/* Sidebar */}
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />

      {/* Main */}
      <main style={{
        flex: 1,
        marginLeft: sidebarWidth,
        transition: 'margin-left 0.28s cubic-bezier(0.4,0,0.2,1)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <TopBar onRunFrank={handleRunFrank} running={running} />

        {/* Page content with transition */}
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
              {/* Pass frankData down via context or prop drilling as needed */}
              <Outlet context={{ frankData, running, refetch: handleRunFrank }} />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
