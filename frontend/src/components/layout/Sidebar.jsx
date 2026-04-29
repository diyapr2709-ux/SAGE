import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, TrendingUp, Calendar,
  MessageSquare, ShoppingCart, Settings, LogOut,
  ChevronLeft, ChevronRight, Database, FileBarChart,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const NAV_ITEMS = {
  employee: [
    { icon: LayoutDashboard, label: 'My Dashboard', to: '/dashboard/employee' },
    { icon: Database,        label: 'My Requests',  to: '/dashboard/data'     },
  ],
  manager: [
    { icon: LayoutDashboard, label: 'Overview',    to: '/dashboard/overview'   },
    { icon: Users,           label: 'Team',         to: '/dashboard/team'       },
    { icon: TrendingUp,      label: 'Revenue',      to: '/dashboard/revenue'    },
    { icon: Calendar,        label: 'Scheduling',   to: '/dashboard/scheduling' },
    { icon: MessageSquare,   label: 'Reviews',      to: '/dashboard/reviews'    },
    { icon: ShoppingCart,    label: 'Cost Intel',   to: '/dashboard/costintel'  },
    { icon: FileBarChart,    label: 'Reports',      to: '/dashboard/reports'    },
    { icon: Database,        label: 'Data Input',   to: '/dashboard/data'       },
  ],
  admin: [
    { icon: LayoutDashboard, label: 'Overview',    to: '/dashboard/overview'   },
    { icon: Users,           label: 'Team',         to: '/dashboard/team'       },
    { icon: TrendingUp,      label: 'Revenue',      to: '/dashboard/revenue'    },
    { icon: Calendar,        label: 'Scheduling',   to: '/dashboard/scheduling' },
    { icon: MessageSquare,   label: 'Reviews',      to: '/dashboard/reviews'    },
    { icon: ShoppingCart,    label: 'Cost Intel',   to: '/dashboard/costintel'  },
    { icon: FileBarChart,    label: 'Reports',      to: '/dashboard/reports'    },
    { icon: Database,        label: 'Data Input',   to: '/dashboard/data'       },
    { icon: Settings,        label: 'Admin',        to: '/dashboard/admin'      },
  ],
}

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const items = NAV_ITEMS[user?.role] || NAV_ITEMS.employee

  const handleLogout = () => { logout(); navigate('/login', { replace: true }) }

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      style={{
        background: 'linear-gradient(180deg, var(--navy) 0%, var(--navy-mid) 100%)',
        height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 50,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '4px 0 24px rgba(0,0,0,0.18)',
        borderRight: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      {/* Logo */}
      <div style={{
        padding: collapsed ? '24px 0' : '24px 20px',
        display: 'flex', alignItems: 'center', gap: 12,
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        minHeight: 76, flexShrink: 0,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(59,130,246,0.45)',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L4 7v10l8 5 8-5V7L12 2z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M12 2v20M4 7l8 5 8-5" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
          </svg>
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.2 }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.35rem', color: 'white', letterSpacing: '0.08em', lineHeight: 1 }}>SAGE</div>
              <div style={{ fontSize: '0.62rem', color: 'rgba(148,180,255,0.6)', letterSpacing: '0.08em', marginTop: 2 }}>GROWTH ENGINE</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Collapse toggle */}
      <button onClick={onToggle} style={{
        position: 'absolute', top: 24, right: -14,
        width: 28, height: 28, borderRadius: '50%',
        background: 'var(--navy-mid)', border: '1.5px solid rgba(255,255,255,0.12)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'rgba(200,220,255,0.7)', zIndex: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        transition: 'all 0.15s ease',
      }}
        onMouseEnter={e => { e.currentTarget.style.background = '#3B82F6'; e.currentTarget.style.color = 'white' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--navy-mid)'; e.currentTarget.style.color = 'rgba(200,220,255,0.7)' }}
      >
        {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
      </button>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', overflowX: 'hidden' }}>
        <AnimatePresence>
          {!collapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(120,150,200,0.5)', padding: '4px 8px 10px' }}>
              Navigation
            </motion.div>
          )}
        </AnimatePresence>

        {items.map((item) => (
          <NavLink key={item.to} to={item.to} end style={{ textDecoration: 'none' }}>
            {({ isActive }) => (
              <motion.div
                className={`sidebar-nav-item${isActive ? ' active' : ''}`}
                style={{ justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? '11px 0' : '11px 16px' }}
                whileHover={{ x: collapsed ? 0 : 2 }}
                whileTap={{ scale: 0.97 }}
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={18} className="nav-icon" style={{ flexShrink: 0 }} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.18 }} style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </NavLink>
        ))}

        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '12px 6px' }} />
      </nav>

      {/* User footer */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: collapsed ? '16px 10px' : '16px', flexShrink: 0 }}>
        <AnimatePresence>
          {!collapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, var(--blue-500), var(--blue-400))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.82rem', fontWeight: 700, color: 'white' }}>
                  {(user?.full_name || user?.email || 'U')[0].toUpperCase()}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ color: 'rgba(220,235,255,0.9)', fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.full_name || user?.email}</div>
                  <div style={{ color: 'rgba(120,160,220,0.6)', fontSize: '0.7rem', textTransform: 'capitalize' }}>{user?.role}</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button onClick={handleLogout} className="sidebar-nav-item" style={{ justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? '11px 0' : '11px 16px', width: '100%' }} whileTap={{ scale: 0.97 }}>
          <LogOut size={16} style={{ flexShrink: 0 }} />
          <AnimatePresence>
            {!collapsed && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>Sign Out</motion.span>}
          </AnimatePresence>
        </motion.button>
      </div>
    </motion.aside>
  )
}
