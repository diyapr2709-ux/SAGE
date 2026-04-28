import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, ArrowRight, Loader2, Mail, Lock, User, Building2, ChevronLeft, Briefcase, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { apiLogin, apiRegister } from '../api/client'

function NavyPanel() {
  return (
    <div style={{
      position: 'relative', width: '48%',
      background: 'linear-gradient(145deg, #EFF6FF 0%, #DBEAFE 55%, #EFF6FF 100%)',
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
      justifyContent: 'space-between', padding: '52px 48px',
    }}>
      {[
        { w: 380, h: 380, top: '-80px', left: '-80px', blur: 90, opacity: 0.18, color: '#3B82F6' },
        { w: 260, h: 260, bottom: '60px', right: '-40px', blur: 80, opacity: 0.14, color: '#60A5FA' },
        { w: 160, h: 160, top: '38%', right: '15%', blur: 50, opacity: 0.10, color: '#FBBF24' },
      ].map((orb, i) => (
        <motion.div key={i} style={{
          position: 'absolute', width: orb.w, height: orb.h, borderRadius: '50%',
          background: orb.color, filter: `blur(${orb.blur}px)`, opacity: orb.opacity,
          top: orb.top, bottom: orb.bottom, left: orb.left, right: orb.right,
        }}
          animate={{ scale: [1, 1.06, 1], opacity: [orb.opacity, orb.opacity * 1.3, orb.opacity] }}
          transition={{ duration: 7 + i * 2, repeat: Infinity, ease: 'easeInOut', delay: i * 1.5 }}
        />
      ))}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.06,
        backgroundImage: 'radial-gradient(circle, #93C5FD 1px, transparent 1px)',
        backgroundSize: '28px 28px' }} />
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{ position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10,
            background: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(59,130,246,0.5)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L4 7v10l8 5 8-5V7L12 2z" stroke="white" strokeWidth="1.8" strokeLinejoin="round"/>
              <path d="M12 2v20M4 7l8 5 8-5" stroke="white" strokeWidth="1.8" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem', color: '#0F172A', letterSpacing: '0.08em' }}>SAGE</span>
        </div>
        <p style={{ color: '#64748B', fontSize: '0.8rem', marginTop: 6, letterSpacing: '0.06em' }}>
          SMALL BUSINESS AUTONOMOUS GROWTH ENGINE
        </p>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        style={{ position: 'relative', zIndex: 2 }}>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2.2rem, 3.5vw, 3rem)',
          letterSpacing: '0.08em', wordSpacing: '0.3em', color: '#0F172A', lineHeight: 1.12, marginBottom: 20 }}>
          Your business,<br />
          <span style={{ color: '#60A5FA' }}>on Autopilot.</span>
        </h1>
        <p style={{ color: '#334155', fontSize: '1rem', lineHeight: 1.65, maxWidth: 340 }}>
          Five intelligent agents. One daily briefing. Zero operational blind spots.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 32 }}>
          {[
            { name: 'FRANK', desc: 'Orchestrator', color: '#FBBF24' },
            { name: 'PULSE', desc: 'Revenue', color: '#60A5FA' },
            { name: 'VOICE', desc: 'Reputation', color: '#34D399' },
            { name: 'CREW', desc: 'Scheduling', color: '#F472B6' },
            { name: 'SHELF', desc: 'Cost Intel', color: '#A78BFA' },
          ].map((agent, i) => (
            <motion.div key={agent.name}
              initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(100,150,255,0.2)',
                borderRadius: 99, backdropFilter: 'blur(8px)' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: agent.color, boxShadow: `0 0 6px ${agent.color}` }} />
              <span style={{ color: '#0F172A', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.05em' }}>{agent.name}</span>
              <span style={{ color: '#64748B', fontSize: '0.72rem' }}>{agent.desc}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.6 }} style={{ position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px',
          background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(100,150,255,0.15)', borderRadius: 10 }}>
          <Building2 size={14} color="#60A5FA" />
          <span style={{ color: '#475569', fontSize: '0.78rem' }}>
            Demo: <strong style={{ color: '#1E293B' }}>Marathon Deli</strong> · College Park, MD
          </span>
        </div>
        <p style={{ color: '#94A3B8', fontSize: '0.72rem', marginTop: 24 }}>
          University of Maryland · SAGE Research Project
        </p>
      </motion.div>
    </div>
  )
}

function RolePicker({ onSelect }) {
  const roles = [
    { key: 'employee', icon: Users, title: 'Employee',
      desc: 'View your schedule, tasks, feedback and daily briefing',
      color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE' },
    { key: 'manager', icon: Briefcase, title: 'Manager / Admin',
      desc: 'Full access - revenue, staffing, cost intel, and agent insights',
      color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  ]
  return (
    <motion.div key="role-picker"
      initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{ width: '100%', maxWidth: 420 }}>
      <div style={{ marginBottom: 36 }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem',
          letterSpacing: '0.06em', color: '#0F172A', marginBottom: 8 }}>Who are you?</h2>
        <p style={{ color: '#64748B', fontSize: '0.9rem' }}>Select your role to get started</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {roles.map((r, i) => (
          <motion.button key={r.key} onClick={() => onSelect(r.key)}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
            style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '22px 24px',
              background: 'white', border: `1.5px solid ${r.border}`, borderRadius: 16,
              cursor: 'pointer', textAlign: 'left',
              boxShadow: '0 2px 12px rgba(59,130,246,0.07)', transition: 'box-shadow 0.2s ease, border-color 0.2s ease' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = r.color; e.currentTarget.style.boxShadow = `0 4px 20px ${r.color}22` }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = r.border; e.currentTarget.style.boxShadow = '0 2px 12px rgba(59,130,246,0.07)' }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              background: r.bg, border: `1px solid ${r.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <r.icon size={22} color={r.color} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A', marginBottom: 4 }}>{r.title}</div>
              <div style={{ fontSize: '0.82rem', color: '#64748B', lineHeight: 1.5 }}>{r.desc}</div>
            </div>
            <ArrowRight size={18} color="#CBD5E1" style={{ flexShrink: 0 }} />
          </motion.button>
        ))}
      </div>
      <p style={{ textAlign: 'center', color: '#CBD5E1', fontSize: '0.78rem', marginTop: 32 }}>
        University of Maryland · SAGE Research Project · 2025
      </p>
    </motion.div>
  )
}

function Field({ icon: Icon, label, type, value, onChange, error, showToggle, onToggle, show }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.02em' }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
          color: error ? '#EF4444' : 'var(--text-muted)', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}>
          <Icon size={16} />
        </div>
        <input type={showToggle ? (show ? 'text' : 'password') : type} value={value} onChange={onChange}
          className="sage-input"
          style={{ paddingLeft: 42, paddingRight: showToggle ? 44 : 14,
            borderColor: error ? '#FECACA' : undefined, background: error ? '#FFF5F5' : undefined }}
          placeholder={label}
          autoComplete={type === 'password' ? 'current-password' : type === 'email' ? 'email' : 'name'} />
        {showToggle && (
          <button type="button" onClick={onToggle}
            style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2, transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--blue-500)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            style={{ color: '#EF4444', fontSize: '0.78rem', fontWeight: 500 }}>{error}</motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

function TabSwitch({ active, onChange }) {
  return (
    <div style={{ display: 'flex', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 4, gap: 2 }}>
      {['login', 'register'].map(tab => (
        <button key={tab} onClick={() => onChange(tab)}
          style={{ flex: 1, padding: '9px 0', border: 'none', borderRadius: 9,
            fontFamily: "'Outfit', sans-serif", fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: active === tab ? 'white' : 'transparent',
            color: active === tab ? 'var(--text-primary)' : 'var(--text-muted)',
            boxShadow: active === tab ? 'var(--shadow-sm)' : 'none' }}>
          {tab === 'login' ? 'Sign In' : 'Register'}
        </button>
      ))}
    </div>
  )
}

function AuthForm({ selectedRole, onBack }) {
  const [tab, setTab]           = useState('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [fieldErr, setFieldErr] = useState({})
  const { login }               = useAuth()
  const navigate                = useNavigate()

  const isManager   = selectedRole === 'manager'
  const accentColor = isManager ? '#7C3AED' : '#3B82F6'
  const roleLabel   = isManager ? 'Manager / Admin' : 'Employee'

  const validate = () => {
    const errs = {}
    if (!email)    errs.email = 'Email is required'
    if (!password) errs.password = 'Password is required'
    if (tab === 'register' && !fullName) errs.fullName = 'Name is required'
    setFieldErr(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true); setError('')
    try {
      // DEV MOCK — remove when backend is ready

      if (tab === 'login') {
       const res = await apiLogin(email, password)
       login(res.data.access_token)
       navigate('/dashboard', { replace: true })
    } else {
     const registerRole = selectedRole === 'manager' ? 'manager' : 'employee'
     await apiRegister({ email, password, full_name: fullName, role: registerRole })
     const res = await apiLogin(email, password)
     login(res.data.access_token)
     navigate('/dashboard', { replace: true })
    }
   } catch (err) {
      const msg = err.response?.data?.detail
      setError(typeof msg === 'string' ? msg : 'Something went wrong. Please try again.')
    } finally { setLoading(false) }
  }

  const switchTab = (t) => { setTab(t); setError(''); setFieldErr({}) }

  return (
    <motion.div key="auth-form"
      initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{ width: '100%', maxWidth: 420 }}>
      <motion.button onClick={onBack} whileTap={{ scale: 0.95 }}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
          cursor: 'pointer', color: '#94A3B8', fontSize: '0.82rem', fontWeight: 500,
          padding: '0 0 24px 0', transition: 'color 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.color = '#475569'}
        onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}>
        <ChevronLeft size={15} /> Back
      </motion.button>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px',
        background: isManager ? '#F5F3FF' : '#EFF6FF',
        border: `1px solid ${isManager ? '#DDD6FE' : '#BFDBFE'}`,
        borderRadius: 99, marginBottom: 16 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: accentColor }} />
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: accentColor, letterSpacing: '0.04em' }}>{roleLabel}</span>
      </div>

      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem',
          letterSpacing: '0.06em', color: '#0F172A', marginBottom: 6 }}>
          {tab === 'login' ? 'Welcome back' : 'Create account'}
        </h2>
        <p style={{ color: '#64748B', fontSize: '0.9rem' }}>
          {tab === 'login' ? `Sign in to your ${roleLabel} dashboard` : `Register as ${roleLabel}`}
        </p>
      </div>

      <div style={{ marginBottom: 24 }}><TabSwitch active={tab} onChange={switchTab} /></div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <AnimatePresence mode="wait">
          {tab === 'register' && (
            <motion.div key="name" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22 }} style={{ overflow: 'hidden' }}>
              <Field icon={User} label="Full Name" type="text" value={fullName}
                onChange={e => setFullName(e.target.value)} error={fieldErr.fullName} />
            </motion.div>
          )}
        </AnimatePresence>
        <Field icon={Mail} label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} error={fieldErr.email} />
        <Field icon={Lock} label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)}
          error={fieldErr.password} showToggle onToggle={() => setShowPass(p => !p)} show={showPass} />
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              style={{ padding: '12px 16px', background: '#FFF5F5', border: '1px solid #FECACA',
                borderRadius: 10, color: '#B91C1C', fontSize: '0.85rem', fontWeight: 500 }}>
              {error}
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button type="submit" className="btn-primary"
          style={{ marginTop: 4, padding: '14px 24px', fontSize: '0.95rem', borderRadius: 12, width: '100%',
            background: accentColor, boxShadow: `0 4px 14px ${accentColor}55` }}
          whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }} disabled={loading}>
          {loading
            ? <><Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> Signing in…</>
            : <>{tab === 'login' ? 'Sign In' : 'Create Account'} <ArrowRight size={17} /></>}
        </motion.button>
      </form>

      <p style={{ textAlign: 'center', color: '#CBD5E1', fontSize: '0.78rem', marginTop: 28 }}>
        University of Maryland · SAGE Research Project · 2025
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  )
}

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState(null)
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--white)' }}>
      <NavyPanel />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', background: 'var(--white)' }}>
        <AnimatePresence mode="wait">
          {selectedRole === null
            ? <RolePicker key="picker" onSelect={setSelectedRole} />
            : <AuthForm key="form" selectedRole={selectedRole} onBack={() => setSelectedRole(null)} />}
        </AnimatePresence>
      </div>
    </div>
  )
}
