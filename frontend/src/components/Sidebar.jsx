import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, BarChart3, MessageSquare,
  Calendar, Settings, Zap, LogOut,
} from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = {
  admin: [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/users', label: 'Users', icon: Users },
    { to: '/reports', label: 'Reports', icon: BarChart3 },
    { to: '/settings', label: 'Settings', icon: Settings },
  ],
  manager: [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/staff', label: 'Staff', icon: Users },
    { to: '/schedule', label: 'Schedule', icon: Calendar },
    { to: '/reviews', label: 'Reviews', icon: MessageSquare },
  ],
  employee: [
    { to: '/', label: 'My Dashboard', icon: LayoutDashboard },
    { to: '/schedule', label: 'My Schedule', icon: Calendar },
  ],
};

const AGENT_DOTS = [
  { label: 'FRANK', color: 'bg-indigo-500' },
  { label: 'PULSE', color: 'bg-blue-500' },
  { label: 'VOICE', color: 'bg-purple-500' },
  { label: 'SHELF', color: 'bg-emerald-500' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const items = navItems[user?.role] || navItems.employee;

  return (
    <aside className="w-56 bg-[#080d1a] border-r border-white/[0.05] flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-5 py-6">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Zap size={17} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-none tracking-tight">SAGE</p>
            <p className="text-slate-600 text-[10px] mt-0.5 font-medium">Growth Engine</p>
          </div>
        </motion.div>
      </div>

      {/* Active agents */}
      <div className="px-5 pb-5">
        <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.05]">
          <p className="text-[10px] text-slate-600 font-semibold uppercase tracking-widest mb-2">Active Agents</p>
          <div className="grid grid-cols-2 gap-1.5">
            {AGENT_DOTS.map(a => (
              <div key={a.label} className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${a.color} animate-pulse`} />
                <span className="text-[11px] text-slate-400 font-medium">{a.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        <p className="px-3 text-[10px] text-slate-600 font-semibold uppercase tracking-widest mb-2">Navigation</p>
        {items.map((item, i) => (
          <motion.div
            key={item.to}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/20'
                    : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-300'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={16} className={isActive ? 'text-indigo-400' : ''} />
                  {item.label}
                </>
              )}
            </NavLink>
          </motion.div>
        ))}
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-white/[0.05]">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user?.full_name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-300 text-xs font-semibold truncate">{user?.full_name}</p>
            <p className="text-slate-600 text-[10px] capitalize">{user?.role}</p>
          </div>
          <button onClick={logout} className="text-slate-600 hover:text-red-400 transition-colors p-1">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
