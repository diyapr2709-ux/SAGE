import { useState, useEffect, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Star, CheckSquare, Clock, Zap, AlertTriangle, CheckCircle,
  Calendar, RefreshCw, XCircle, MessageSquare,
  Flame, Plus, ChevronDown, ChevronUp, User, DollarSign, Users,
  LogIn, LogOut,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  apiDashboardEmployee, apiEmployeeShifts,
  apiSubmitShiftRequest, apiGetShiftRequests,
  apiGetShiftLog, apiPostShiftLog,
  apiClock, apiGetAttendance,
} from '../api/client'

const fadeUp = (i = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
})

function fmt24(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const p = h >= 12 ? 'PM' : 'AM'
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${h12}:${String(m).padStart(2,'0')} ${p}`
}

function shiftHours(start, end) {
  if (!start || !end) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return Math.max(0, (eh + em / 60) - (sh + sm / 60))
}

const STATUS_STYLE = {
  understaffed: { bg: '#FFF5F5', border: '#FECACA', text: '#DC2626', dot: '#EF4444', label: 'Understaffed' },
  overstaffed:  { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', dot: '#FBBF24', label: 'Overstaffed'  },
  balanced:     { bg: '#F0FDF4', border: '#BBF7D0', text: '#16A34A', dot: '#22C55E', label: 'Balanced'     },
  optimal:      { bg: '#F0FDF4', border: '#BBF7D0', text: '#16A34A', dot: '#22C55E', label: 'Optimal'      },
}

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8', dot: '#60A5FA', label: status || 'Scheduled' }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 99, background: s.bg, border: `1px solid ${s.border}`, fontSize: '0.68rem', fontWeight: 700, color: s.text, textTransform: 'capitalize', flexShrink: 0 }}>
      <div style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot }} />
      {s.label}
    </div>
  )
}

// ── My Shift Card (shifts I'm already on) ──────────────────────────
function MyShiftCard({ shift, request }) {
  const hrs = shiftHours(shift.shift_start, shift.shift_end)
  const reqStatusColor = { pending: '#3B82F6', approved: '#22C55E', rejected: '#EF4444' }[request?.status] || null

  return (
    <div style={{
      background: 'white',
      border: '2px solid #BFDBFE',
      borderRadius: 14, padding: '14px 18px',
      boxShadow: '0 2px 12px rgba(59,130,246,0.08)',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Calendar size={18} color="#3B82F6" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{shift.shift_date || shift.shift_id}</div>
        <div style={{ fontSize: '0.77rem', color: 'var(--text-muted)', marginTop: 2 }}>
          {fmt24(shift.shift_start)} – {fmt24(shift.shift_end)}
          {hrs > 0 && <span style={{ marginLeft: 8, fontWeight: 600, color: '#3B82F6' }}>{hrs.toFixed(1)}h</span>}
        </div>
        {(shift.employees || []).map((e, i) => e.name).join(', ') && (
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 3 }}>
            With: {(shift.employees || []).map(e => e.name).join(', ')}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
        <div style={{ padding: '3px 10px', borderRadius: 99, background: '#EFF6FF', border: '1px solid #BFDBFE', fontSize: '0.68rem', fontWeight: 700, color: '#1D4ED8' }}>
          Your Shift
        </div>
        {request && (
          <div style={{ padding: '3px 10px', borderRadius: 99, background: `${reqStatusColor}15`, border: `1px solid ${reqStatusColor}50`, fontSize: '0.68rem', fontWeight: 700, color: reqStatusColor, textTransform: 'capitalize' }}>
            {request.request_type} · {request.status}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Open Shift Card (claim only 1) ─────────────────────────────────
function OpenShiftCard({ shift, myRequests, onRequest, index, alreadyClaimed }) {
  const [submitting, setSub] = useState(false)
  const [note, setNote]      = useState('')
  const [showNote, setShowNote] = useState(false)
  const existing = myRequests.find(r => r.shift_id === shift.shift_id)
  const claimed  = !!existing

  const handle = async () => {
    setSub(true)
    try {
      await onRequest({ shift_id: shift.shift_id, request_type: 'available', note: note || `Available for ${shift.shift_date}` })
    } finally { setSub(false) }
  }

  const hrs = shiftHours(shift.shift_start, shift.shift_end)

  return (
    <motion.div {...fadeUp(index)} style={{
      background: claimed ? '#F0FDF4' : 'white',
      border: `1.5px solid ${claimed ? '#86EFAC' : '#FECACA'}`,
      borderRadius: 14, padding: '16px 18px',
      boxShadow: claimed ? '0 2px 12px rgba(34,197,94,0.1)' : '0 2px 12px rgba(239,68,68,0.08)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: claimed ? '#22C55E' : '#EF4444', boxShadow: `0 0 6px ${claimed ? '#22C55E' : '#EF4444'}` }} />
            <span style={{ fontSize: '0.67rem', fontWeight: 700, letterSpacing: '0.08em', color: claimed ? '#166534' : '#991B1B', textTransform: 'uppercase' }}>
              {claimed ? 'Request Submitted' : 'Open — Coverage Needed'}
            </span>
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{shift.shift_date || shift.shift_id}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {fmt24(shift.shift_start)} – {fmt24(shift.shift_end)}
            {hrs > 0 && <span style={{ marginLeft: 8, fontWeight: 600, color: claimed ? '#166534' : '#EF4444' }}>{hrs.toFixed(1)}h</span>}
          </div>
          {(shift.employees || []).length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {shift.employees.map((e, i) => (
                <div key={i} style={{ padding: '2px 8px', borderRadius: 99, fontSize: '0.67rem', fontWeight: 600, background: 'var(--surface)', border: '1px solid var(--border-soft)', color: 'var(--text-secondary)' }}>
                  {e.name} · {e.role}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action */}
        {claimed ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 99, background: '#F0FDF4', border: '1px solid #BBF7D0', fontSize: '0.72rem', fontWeight: 700, color: '#16A34A', flexShrink: 0 }}>
            <CheckCircle size={12} /> Submitted
          </div>
        ) : alreadyClaimed ? (
          <div style={{ padding: '6px 12px', borderRadius: 99, background: '#F5F5F5', border: '1px solid #E5E7EB', fontSize: '0.72rem', fontWeight: 600, color: '#9CA3AF', flexShrink: 0 }}>
            Already claimed one
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
            <motion.button
              onClick={handle}
              disabled={submitting}
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: 'none', background: '#EF4444', color: 'white', fontFamily: "'Outfit', sans-serif", fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 3px 12px rgba(239,68,68,0.35)' }}
            >
              {submitting ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
              {submitting ? 'Claiming…' : 'Claim Shift'}
            </motion.button>
            <button onClick={() => setShowNote(n => !n)} style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
              {showNote ? 'hide note' : '+ add note'}
            </button>
          </div>
        )}
      </div>

      {showNote && !claimed && !alreadyClaimed && (
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add a note to your claim…"
            style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--off-white)', fontFamily: "'Outfit', sans-serif", fontSize: '0.8rem', outline: 'none' }}
          />
        </div>
      )}

      {shift.adjustment && (
        <div style={{ marginTop: 10, fontSize: '0.75rem', color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 6, padding: '5px 10px' }}>
          {shift.adjustment}
        </div>
      )}
    </motion.div>
  )
}

// ── Full Schedule Row ──────────────────────────────────────────────
function ShiftRow({ shift, myRequests, onRequest, isMyShift }) {
  const [open, setOpen]       = useState(false)
  const [reqType, setReqType] = useState('unavailable')
  const [note, setNote]       = useState('')
  const [submitting, setSub]  = useState(false)
  const [done, setDone]       = useState(false)

  const existing = myRequests.find(r => r.shift_id === shift.shift_id)
  const hrs      = shiftHours(shift.shift_start, shift.shift_end)

  const reqStatusColor = { pending: '#3B82F6', approved: '#22C55E', rejected: '#EF4444' }

  const handle = async () => {
    setSub(true)
    try {
      await onRequest({ shift_id: shift.shift_id, request_type: reqType, note })
      setDone(true); setOpen(false); setNote('')
    } finally { setSub(false) }
  }

  return (
    <div style={{ background: isMyShift ? '#F8FAFF' : 'white', border: `1px solid ${isMyShift ? '#BFDBFE' : 'var(--border)'}`, borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px' }}>

        <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: isMyShift ? '#DBEAFE' : 'var(--surface)', border: `1px solid ${isMyShift ? '#BFDBFE' : 'var(--border-soft)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isMyShift ? <User size={15} color="#3B82F6" /> : <Calendar size={15} color="var(--text-muted)" />}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.87rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            {shift.shift_date || shift.shift_id}
            {isMyShift && <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#3B82F6', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '1px 6px', borderRadius: 99 }}>Your shift</span>}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 1 }}>
            {fmt24(shift.shift_start)} – {fmt24(shift.shift_end)}
            {hrs > 0 && <span style={{ marginLeft: 6, fontWeight: 600 }}>{hrs.toFixed(1)}h</span>}
            {shift.employees?.length > 0 && <span style={{ marginLeft: 6 }}>· {shift.employees.length} staff</span>}
          </div>
        </div>

        <StatusBadge status={shift.staffing_status} />

        {done || existing ? (
          <div style={{ padding: '4px 10px', borderRadius: 99, background: `${reqStatusColor[existing?.status] || '#3B82F6'}15`, border: `1px solid ${reqStatusColor[existing?.status] || '#3B82F6'}50`, fontSize: '0.7rem', fontWeight: 700, color: reqStatusColor[existing?.status] || '#3B82F6', flexShrink: 0, textTransform: 'capitalize' }}>
            {done ? 'Submitted' : `${existing.request_type} · ${existing.status}`}
          </div>
        ) : isMyShift ? (
          <motion.button
            onClick={() => setOpen(o => !o)}
            whileTap={{ scale: 0.95 }}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: `1px solid ${open ? '#3B82F6' : 'var(--border)'}`, background: open ? '#EFF6FF' : 'white', color: open ? '#3B82F6' : 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
          >
            {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Request Change
          </motion.button>
        ) : null}
      </div>

      {/* Staff chips */}
      {shift.employees?.length > 0 && (
        <div style={{ padding: '0 16px 10px', display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {shift.employees.map((e, i) => (
            <div key={i} style={{ padding: '2px 8px', borderRadius: 99, fontSize: '0.67rem', fontWeight: 600, background: 'var(--surface)', border: '1px solid var(--border-soft)', color: 'var(--text-secondary)' }}>
              {e.name}{e.role ? ` · ${e.role}` : ''}
            </div>
          ))}
        </div>
      )}

      {/* Change request panel — only for my shifts */}
      <AnimatePresence>
        {open && isMyShift && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden', borderTop: '1px solid var(--border-soft)' }}>
            <div style={{ padding: '14px 16px', background: 'var(--off-white)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: '0.67rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Request Type</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[
                  { key: 'unavailable', icon: XCircle,       label: "Can't make it", color: '#EF4444' },
                  { key: 'available',   icon: CheckCircle,   label: 'Confirm Available', color: '#22C55E' },
                  { key: 'note',        icon: MessageSquare, label: 'Send Note',     color: '#8B5CF6' },
                ].map(({ key, icon: Icon, label, color }) => (
                  <button key={key} onClick={() => setReqType(key)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, background: reqType === key ? `${color}18` : 'white', border: `1px solid ${reqType === key ? color : 'var(--border)'}`, color: reqType === key ? color : 'var(--text-muted)', transition: 'all 0.15s' }}>
                    <Icon size={12} />{label}
                  </button>
                ))}
              </div>
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note (optional)…" style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'white', fontFamily: "'Outfit', sans-serif", fontSize: '0.82rem', color: 'var(--text-primary)', outline: 'none' }} />
              <motion.button onClick={handle} disabled={submitting} whileTap={{ scale: 0.97 }} style={{ padding: '9px 0', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#3B82F6', color: 'white', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: submitting ? 0.7 : 1 }}>
                {submitting ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Submitting…</> : 'Submit Request'}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Clock In / Out Panel ──────────────────────────────────────────
function ClockInPanel({ myShifts, user }) {
  const [attendance, setAttendance] = useState([])
  const [acting, setActing]         = useState(null)
  const [note, setNote]             = useState('')

  const load = useCallback(() => {
    apiGetAttendance().then(r => setAttendance(r.data.attendance || [])).catch(() => {})
  }, [])

  useEffect(() => {
    load()
    const iv = setInterval(load, 20000)
    return () => clearInterval(iv)
  }, [load])

  const now = new Date()

  const handleClock = async (shiftId, action) => {
    setActing(`${shiftId}-${action}`)
    try {
      await apiClock({ shift_id: shiftId, action, note })
      setNote('')
      load()
    } catch (e) {
      alert(e.response?.data?.detail || `Could not clock ${action}`)
    } finally { setActing(null) }
  }

  const eligibleShifts = myShifts.map(shift => {
    const [sh, sm] = shift.shift_start.split(':').map(Number)
    const [eh, em] = shift.shift_end.split(':').map(Number)
    const shiftDate = new Date(shift.shift_date + 'T00:00:00')
    const startDt   = new Date(shiftDate); startDt.setHours(sh, sm, 0)
    const endDt     = new Date(shiftDate); endDt.setHours(eh, em, 0)
    if (eh < sh) endDt.setDate(endDt.getDate() + 1) // overnight

    const minsToStart = (startDt - now) / 60000
    const isActive    = now >= startDt && now <= endDt
    const isUpcoming  = minsToStart > 0 && minsToStart <= 30
    const isPast      = now > endDt

    const clIn  = attendance.find(r => r.shift_id === shift.shift_id && r.clock_in && !r.clock_out)
    const clOut = attendance.find(r => r.shift_id === shift.shift_id && r.clock_out)

    let elapsed = null
    if (clIn) {
      const mins = Math.round((now - new Date(clIn.clock_in)) / 60000)
      elapsed = mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`
    }

    return { ...shift, startDt, endDt, minsToStart, isActive, isUpcoming, isPast, clIn, clOut, elapsed }
  }).filter(s => !s.isPast || s.clIn || s.clOut) // hide past unclocked shifts

  if (eligibleShifts.length === 0) return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', boxShadow: 'var(--shadow-xs)', textAlign: 'center' }}>
      <Clock size={18} color="var(--text-muted)" style={{ marginBottom: 8 }} />
      <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No active or upcoming shifts to clock into</p>
    </div>
  )

  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', boxShadow: 'var(--shadow-xs)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <LogIn size={15} color="#3B82F6" />
        <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#1D4ED8' }}>Clock In / Out</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {eligibleShifts.map((s, i) => {
          const actKey = `${s.shift_id}-${s.clIn ? 'out' : 'in'}`
          const isWorking = actKey && acting === actKey

          return (
            <div key={i} style={{ border: `1.5px solid ${s.clIn ? '#BBF7D0' : s.isUpcoming ? '#BFDBFE' : 'var(--border)'}`, borderRadius: 12, padding: '12px 14px', background: s.clIn ? '#F0FDF4' : s.isUpcoming ? '#EFF6FF' : 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: s.clIn ? 6 : 0 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    {s.shift_id}
                    {s.isUpcoming && <span style={{ marginLeft: 6, fontSize: '0.65rem', color: '#3B82F6', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '1px 6px', borderRadius: 99 }}>starts in {Math.round(s.minsToStart)}m</span>}
                    {s.isActive && !s.clIn && <span style={{ marginLeft: 6, fontSize: '0.65rem', color: '#16A34A', background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '1px 6px', borderRadius: 99 }}>ACTIVE</span>}
                    {s.clIn && <span style={{ marginLeft: 6, fontSize: '0.65rem', color: '#16A34A', background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '1px 6px', borderRadius: 99 }}>● Working · {s.elapsed}</span>}
                    {s.clOut && <span style={{ marginLeft: 6, fontSize: '0.65rem', color: '#6B7280', background: '#F9FAFB', border: '1px solid #E5E7EB', padding: '1px 6px', borderRadius: 99 }}>Done · {s.clOut.duration_min}min</span>}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {s.shift_date} · {fmt24(s.shift_start)} – {fmt24(s.shift_end)}
                  </div>
                </div>

                {!s.clOut && (s.isActive || s.isUpcoming || s.clIn) && (
                  <motion.button
                    onClick={() => handleClock(s.shift_id, s.clIn ? 'out' : 'in')}
                    disabled={!!acting}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 16px', borderRadius: 9, border: 'none', cursor: 'pointer',
                      fontFamily: "'Outfit', sans-serif", fontSize: '0.82rem', fontWeight: 700,
                      background: s.clIn ? '#EF4444' : '#3B82F6',
                      color: 'white', flexShrink: 0,
                      boxShadow: s.clIn ? '0 3px 12px rgba(239,68,68,0.3)' : '0 3px 12px rgba(59,130,246,0.3)',
                      opacity: acting ? 0.7 : 1,
                    }}
                  >
                    {isWorking
                      ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                      : s.clIn ? <LogOut size={14} /> : <LogIn size={14} />}
                    {isWorking ? '…' : s.clIn ? 'Clock Out' : 'Clock In'}
                  </motion.button>
                )}
              </div>

              {s.clIn && (
                <input
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Add a note before clocking out (optional)…"
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'white', fontFamily: "'Outfit', sans-serif", fontSize: '0.78rem', outline: 'none', boxSizing: 'border-box', marginTop: 2 }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Weekly View ──────────────────────────────────────────────────
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function WeeklyView({ allShifts, myShifts, myRequests, onRequest, alreadyClaimed }) {
  const [claiming, setClaiming] = useState(null)

  // Group shifts by day-of-week
  const byDay = {}
  for (const shift of allShifts) {
    if (!shift.shift_date) continue
    try {
      const d = new Date(shift.shift_date)
      const dayIdx = (d.getDay() + 6) % 7 // Mon=0 … Sun=6
      if (!byDay[dayIdx]) byDay[dayIdx] = []
      byDay[dayIdx].push(shift)
    } catch {}
  }

  const isMyShift = (s) => myShifts.some(m => m.shift_id === s.shift_id)
  const hasRequest = (s) => myRequests.find(r => r.shift_id === s.shift_id)

  const handleClaim = async (shift) => {
    setClaiming(shift.shift_id)
    try {
      await onRequest({ shift_id: shift.shift_id, request_type: 'available', note: `Available for ${shift.shift_date}` })
    } finally { setClaiming(null) }
  }

  return (
    <div>
      <div style={{ padding: '10px 16px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, marginBottom: 14, fontSize: '0.8rem', color: '#1D4ED8', fontWeight: 600 }}>
        Week at a glance — <span style={{ background: '#DBEAFE', borderRadius: 4, padding: '1px 6px' }}>Blue</span> = your shifts · <span style={{ background: '#FEE2E2', borderRadius: 4, padding: '1px 6px' }}>Red</span> = needs coverage · <span style={{ background: '#F3F4F6', borderRadius: 4, padding: '1px 6px' }}>Gray</span> = filled
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {DAYS.map((day, idx) => {
          const shifts = byDay[idx] || []
          return (
            <div key={day}>
              <div style={{
                textAlign: 'center', padding: '7px 4px',
                fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.06em',
                color: shifts.length > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                background: shifts.length > 0 ? 'var(--surface)' : 'transparent',
                borderRadius: '8px 8px 0 0', border: shifts.length > 0 ? '1px solid var(--border)' : 'none',
                borderBottom: 'none',
              }}>
                {DAY_SHORT[idx]}
              </div>
              <div style={{
                minHeight: 80, border: '1px solid var(--border)',
                borderRadius: shifts.length > 0 ? '0 0 8px 8px' : 8,
                background: 'white', padding: 4,
                display: 'flex', flexDirection: 'column', gap: 4,
              }}>
                {shifts.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.65rem' }}>—</div>
                ) : (
                  shifts.map((shift, si) => {
                    const mine     = isMyShift(shift)
                    const req      = hasRequest(shift)
                    const isOpen   = shift.staffing_status === 'understaffed'
                    const isClaiming = claiming === shift.shift_id

                    let bg = '#F3F4F6', border = '#E5E7EB', text = '#6B7280'
                    if (mine)       { bg = '#DBEAFE'; border = '#93C5FD'; text = '#1D4ED8' }
                    else if (req)   { bg = '#EFF6FF'; border = '#BFDBFE'; text = '#3B82F6' }
                    else if (isOpen){ bg = '#FEE2E2'; border = '#FCA5A5'; text = '#DC2626' }

                    return (
                      <div
                        key={si}
                        onClick={() => { if (isOpen && !req && !alreadyClaimed) handleClaim(shift) }}
                        style={{
                          background: bg, border: `1px solid ${border}`,
                          borderRadius: 5, padding: '4px 6px', cursor: isOpen && !req && !alreadyClaimed ? 'pointer' : 'default',
                        }}
                        title={`${shift.shift_date} ${shift.shift_start}–${shift.shift_end} · ${shift.staffing_status}`}
                      >
                        <div style={{ fontSize: '0.6rem', fontWeight: 700, color: text, lineHeight: 1.3 }}>
                          {fmt24(shift.shift_start)}
                        </div>
                        <div style={{ fontSize: '0.58rem', color: text, opacity: 0.8 }}>
                          {fmt24(shift.shift_end)}
                        </div>
                        {mine && <div style={{ fontSize: '0.55rem', color: '#1D4ED8', fontWeight: 700, marginTop: 1 }}>YOU</div>}
                        {req && !mine && <div style={{ fontSize: '0.55rem', color: '#3B82F6', fontWeight: 700, marginTop: 1 }}>PENDING</div>}
                        {isOpen && !req && !mine && (
                          <div style={{ fontSize: '0.55rem', color: '#DC2626', fontWeight: 700, marginTop: 1 }}>
                            {isClaiming ? '…' : alreadyClaimed ? 'FULL' : 'OPEN'}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ marginTop: 10, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        Click a <span style={{ color: '#DC2626', fontWeight: 600 }}>red open shift</span> to claim it. Only one claim at a time.
      </div>
    </div>
  )
}

// ── Shift Log (cash / tips) ───────────────────────────────────────
function ShiftLogPanel({ shifts, user }) {
  const [logs, setLogs]         = useState([])
  const [selected, setSelected] = useState('')
  const [form, setForm]         = useState({ opening_cash: '', closing_cash: '', tips: '', notes: '' })
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)

  useEffect(() => {
    apiGetShiftLog().then(r => setLogs(r.data.logs || [])).catch(() => {})
  }, [saved])

  const myLog = logs.find(l => l.shift_id === selected)

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await apiPostShiftLog({
        shift_id: selected,
        opening_cash: form.opening_cash ? parseFloat(form.opening_cash) : null,
        closing_cash: form.closing_cash ? parseFloat(form.closing_cash) : null,
        tips:         form.tips         ? parseFloat(form.tips)         : null,
        notes:        form.notes,
      })
      setSaved(s => !s)
      setForm({ opening_cash: '', closing_cash: '', tips: '', notes: '' })
    } finally { setSaving(false) }
  }

  const totalTips = logs.reduce((acc, l) => acc + (l.tips || 0), 0)
  const totalNet  = logs.reduce((acc, l) => acc + (l.net_cash || 0), 0)

  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', boxShadow: 'var(--shadow-xs)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <DollarSign size={15} color="#22C55E" />
        <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#166534' }}>Cash & Tips Log</p>
      </div>

      {/* Totals row */}
      {logs.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1, textAlign: 'center', padding: '8px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8 }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#16A34A' }}>${totalTips.toFixed(2)}</div>
            <div style={{ fontSize: '0.68rem', color: '#166534' }}>Total Tips</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center', padding: '8px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8 }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1D4ED8' }}>${totalNet.toFixed(2)}</div>
            <div style={{ fontSize: '0.68rem', color: '#1D4ED8' }}>Net Cash</div>
          </div>
        </div>
      )}

      {/* Past logs */}
      {logs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          {logs.slice(-3).map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: 8, fontSize: '0.78rem' }}>
              <div style={{ flex: 1, fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.75rem' }}>{l.shift_id}</div>
              {l.opening_cash != null && <div style={{ color: 'var(--text-muted)' }}>Open: <strong>${l.opening_cash}</strong></div>}
              {l.closing_cash != null && <div style={{ color: 'var(--text-muted)' }}>Close: <strong>${l.closing_cash}</strong></div>}
              {l.tips != null && <div style={{ color: '#16A34A', fontWeight: 700 }}>Tips: ${l.tips}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Log form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <select
          value={selected}
          onChange={e => setSelected(e.target.value)}
          style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--off-white)', fontFamily: "'Outfit', sans-serif", fontSize: '0.8rem', outline: 'none' }}
        >
          <option value="">Select shift to log…</option>
          {(shifts || []).map((s, i) => (
            <option key={i} value={s.shift_id}>{s.shift_id} — {s.shift_date} {s.shift_start}–{s.shift_end}</option>
          ))}
        </select>
        {selected && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                { key: 'opening_cash', label: 'Opening Cash ($)' },
                { key: 'closing_cash', label: 'Closing Cash ($)' },
                { key: 'tips',         label: 'Tips Earned ($)' },
              ].map(({ key, label }) => (
                <input
                  key={key}
                  type="number"
                  placeholder={label}
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'white', fontFamily: "'Outfit', sans-serif", fontSize: '0.8rem', outline: 'none' }}
                />
              ))}
            </div>
            <input
              placeholder="Notes (optional)…"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'white', fontFamily: "'Outfit', sans-serif", fontSize: '0.8rem', outline: 'none' }}
            />
            <motion.button
              onClick={handleSave}
              disabled={saving}
              whileTap={{ scale: 0.97 }}
              style={{ padding: '9px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#22C55E', color: 'white', fontSize: '0.82rem', fontWeight: 700, opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Saving…' : 'Log Shift'}
            </motion.button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Team Today Board ──────────────────────────────────────────────
function TeamBoard({ teamToday, allShifts }) {
  if (!teamToday?.length) return null

  // Build a quick map of role → shift today
  const shiftByEmployee = {}
  for (const shift of allShifts || []) {
    for (const emp of shift.employees || []) {
      if (!shiftByEmployee[emp.name]) {
        shiftByEmployee[emp.name] = shift
      }
    }
  }

  const ROLE_COLOR = {
    cashier:          { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8' },
    cook:             { bg: '#FFF7ED', border: '#FED7AA', text: '#C2410C' },
    shift_supervisor: { bg: '#F5F3FF', border: '#DDD6FE', text: '#7C3AED' },
    front_desk:       { bg: '#F0FDF4', border: '#BBF7D0', text: '#166534' },
    delivery_driver:  { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E' },
  }
  const roleColor = (role) => {
    const k = (role || '').toLowerCase().replace(' ', '_')
    return ROLE_COLOR[k] || { bg: '#F9FAFB', border: '#E5E7EB', text: '#374151' }
  }

  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', boxShadow: 'var(--shadow-xs)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Users size={15} color="#6366F1" />
        <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4338CA' }}>Team Today</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {teamToday.map((member, i) => {
          const c = roleColor(member.role)
          const shift = shiftByEmployee[member.name]
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: c.border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.78rem', color: c.text, flexShrink: 0 }}>
                {member.name[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.83rem', color: 'var(--text-primary)' }}>{member.name}</div>
                <div style={{ fontSize: '0.7rem', color: c.text, fontWeight: 600 }}>{member.role}</div>
              </div>
              {shift ? (
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 600 }}>{fmt24(shift.shift_start)} – {fmt24(shift.shift_end)}</div>
                  <div>{shift.shift_date}</div>
                </div>
              ) : (
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', padding: '2px 7px', borderRadius: 99, background: 'rgba(0,0,0,0.04)' }}>
                  {member.shift_start} – {member.shift_end}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TaskItem({ text }) {
  const [done, setDone] = useState(false)
  return (
    <motion.div onClick={() => setDone(d => !d)} whileTap={{ scale: 0.98 }}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 9, cursor: 'pointer', background: done ? '#F0FDF4' : 'var(--surface)', border: `1px solid ${done ? '#BBF7D0' : 'var(--border-soft)'}`, transition: 'all 0.15s ease' }}>
      <CheckSquare size={15} color={done ? '#22C55E' : 'var(--blue-400)'} />
      <span style={{ fontSize: '0.85rem', color: done ? '#16A34A' : 'var(--text-primary)', textDecoration: done ? 'line-through' : 'none', flex: 1 }}>{text}</span>
      {done && <CheckCircle size={13} color="#22C55E" />}
    </motion.div>
  )
}

// ── Main ──────────────────────────────────────────────────────────
export function EmployeeDashboard() {
  const { frankData }  = useOutletContext() || {}
  const { user }       = useAuth()
  const [data, setData]             = useState(null)
  const [shifts, setShifts]         = useState(null)
  const [myRequests, setMyReqs]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [shiftsLoading, setShiftsL] = useState(true)
  const [activeTab, setActiveTab]   = useState('mine')  // 'mine' | 'open' | 'all'

  useEffect(() => {
    apiDashboardEmployee()
      .then(res => setData(res.data)).catch(() => setData(null))
      .finally(() => setLoading(false))
    apiEmployeeShifts()
      .then(res => setShifts(res.data)).catch(() => setShifts(null))
      .finally(() => setShiftsL(false))
    apiGetShiftRequests()
      .then(res => setMyReqs(res.data.requests || [])).catch(() => setMyReqs([]))
  }, [])

  const handleShiftRequest = useCallback(async (payload) => {
    await apiSubmitShiftRequest(payload)
    const res = await apiGetShiftRequests()
    setMyReqs(res.data.requests || [])
  }, [])

  const d            = frankData || data
  const eotw         = d?.employee_of_the_week || {}
  const warnings     = d?.warnings || []
  const recognitions = d?.recognitions || []
  const teamToday    = d?.team_today || []
  const rushHours    = d?.rush_hours || []
  const allShifts    = shifts?.shifts || []

  // Role-aware tasks: try to find this user's tasks from the role_tasks_map
  const roleTasksMap = d?.role_tasks_map || {}
  const myTasksFromMap = user?.full_name ? roleTasksMap[user.full_name] : null
  const tasks = myTasksFromMap || d?.tasks || []

  // Match my shifts by name (dataset doesn't carry email)
  const myName   = user?.full_name || ''
  const myShifts = allShifts.filter(s =>
    s.employees?.some(e =>
      myName && (e.name?.toLowerCase().includes(myName.split(' ')[0]?.toLowerCase() || '') ||
      myName.toLowerCase().includes((e.name || '').split(' ')[0]?.toLowerCase() || ''))
    )
  )
  const openShifts   = allShifts.filter(s => s.staffing_status === 'understaffed')
  const totalHours   = myShifts.reduce((acc, s) => acc + shiftHours(s.shift_start, s.shift_end), 0)
  const hasClaimed   = myRequests.some(r => r.request_type === 'available')
  const reqMap       = Object.fromEntries(myRequests.map(r => [r.shift_id, r]))

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} style={{ display: 'inline-block', marginBottom: 16 }}>
          <Zap size={32} color="var(--blue-500)" />
        </motion.div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading your dashboard…</p>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 1000 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Header ────────────────────────────────────────── */}
      <motion.div {...fadeUp(0)} style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Employee Dashboard</p>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem', letterSpacing: '0.06em', color: 'var(--text-primary)', lineHeight: 1 }}>
            My Dashboard
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 4 }}>
            {user?.full_name || user?.email} · Marathon Deli
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ textAlign: 'center', padding: '10px 18px', background: 'white', border: '2px solid #BFDBFE', borderRadius: 12 }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#3B82F6', lineHeight: 1 }}>{myShifts.length}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>My Shifts</div>
          </div>
          <div style={{ textAlign: 'center', padding: '10px 18px', background: 'white', border: '2px solid #BFDBFE', borderRadius: 12 }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#3B82F6', lineHeight: 1 }}>{totalHours.toFixed(0)}h</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>Hours Covered</div>
          </div>
          <div style={{ textAlign: 'center', padding: '10px 18px', background: 'white', border: `2px solid ${openShifts.length > 0 ? '#FECACA' : 'var(--border)'}`, borderRadius: 12 }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: openShifts.length > 0 ? '#EF4444' : '#22C55E', lineHeight: 1 }}>{openShifts.length}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>Open Shifts</div>
          </div>
          <div style={{ textAlign: 'center', padding: '10px 18px', background: 'white', border: `2px solid ${myRequests.length > 0 ? '#BFDBFE' : 'var(--border)'}`, borderRadius: 12 }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: myRequests.length > 0 ? '#3B82F6' : 'var(--text-primary)', lineHeight: 1 }}>{myRequests.length}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>My Requests</div>
          </div>
        </div>
      </motion.div>

      {/* ── FRANK line ────────────────────────────────────── */}
      {d?.frank_line && (
        <motion.div {...fadeUp(1)} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 18px', borderLeft: '3px solid #FBBF24', boxShadow: 'var(--shadow-xs)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', padding: '3px 8px', borderRadius: 99, flexShrink: 0, marginTop: 1 }}>FRANK</div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.65, margin: 0 }}>{d.frank_line}</p>
        </motion.div>
      )}

      {/* ── Clock In/Out ─────────────────────────────────── */}
      {myShifts.length > 0 && (
        <motion.div {...fadeUp(2)}>
          <ClockInPanel myShifts={myShifts} user={user} />
        </motion.div>
      )}

      {/* ── Scheduling ────────────────────────────────────── */}
      <motion.div {...fadeUp(3)}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>CREW Agent</p>
            <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.05em', color: 'var(--text-primary)', lineHeight: 1 }}>Shift Scheduling</h3>
          </div>
          <div style={{ display: 'flex', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 3, gap: 2 }}>
            {[
              { key: 'mine',  label: `My Shifts${myShifts.length > 0 ? ` (${myShifts.length})` : ''}` },
              { key: 'week',  label: 'Weekly View' },
              { key: 'open',  label: `Open Shifts${openShifts.length > 0 ? ` (${openShifts.length})` : ''}` },
              { key: 'all',   label: `Full Schedule (${allShifts.length})` },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontFamily: "'Outfit', sans-serif", fontSize: '0.78rem', fontWeight: 600,
                background: activeTab === tab.key ? 'white' : 'transparent',
                color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: activeTab === tab.key ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.15s ease',
              }}>{tab.label}</button>
            ))}
          </div>
        </div>

        {shiftsLoading && (
          <div style={{ padding: '32px', textAlign: 'center', background: 'white', border: '1px solid var(--border)', borderRadius: 14 }}>
            <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)', marginBottom: 8 }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading schedule…</p>
          </div>
        )}

        {/* My Shifts tab */}
        {!shiftsLoading && activeTab === 'mine' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {myShifts.length > 0 ? (
              <>
                <div style={{ padding: '10px 16px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Clock size={14} color="#3B82F6" />
                  <span style={{ fontSize: '0.8rem', color: '#1D4ED8', fontWeight: 600 }}>
                    You're scheduled for <strong>{myShifts.length} shift{myShifts.length > 1 ? 's' : ''}</strong> covering <strong>{totalHours.toFixed(1)} hours</strong>
                  </span>
                </div>
                {myShifts.map((shift, i) => (
                  <MyShiftCard key={shift.shift_id || i} shift={shift} request={reqMap[shift.shift_id]} />
                ))}
                {myRequests.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>My Requests</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {myRequests.map((r, i) => {
                        const c = { pending: '#3B82F6', approved: '#22C55E', rejected: '#EF4444' }[r.status] || '#6B7280'
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'white', border: `1px solid ${c}30`, borderRadius: 10 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0 }} />
                            <div style={{ flex: 1, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                              <strong>{r.shift_id}</strong> — {r.request_type}
                              {r.note && <span style={{ color: 'var(--text-muted)' }}> · "{r.note}"</span>}
                            </div>
                            <div style={{ padding: '3px 10px', borderRadius: 99, background: `${c}15`, border: `1px solid ${c}40`, fontSize: '0.68rem', fontWeight: 700, color: c, textTransform: 'capitalize' }}>
                              {r.status}
                            </div>
                            {r.manager_note && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Manager: "{r.manager_note}"</div>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ padding: '48px 32px', textAlign: 'center', background: 'white', border: '1px solid var(--border)', borderRadius: 16 }}>
                <Calendar size={28} color="var(--text-muted)" style={{ marginBottom: 12 }} />
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: 4 }}>No shifts assigned yet</div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Check Open Shifts to claim available slots</p>
              </div>
            )}
          </div>
        )}

        {/* Weekly View tab */}
        {!shiftsLoading && activeTab === 'week' && (
          <WeeklyView allShifts={allShifts} myShifts={myShifts} myRequests={myRequests} onRequest={handleShiftRequest} alreadyClaimed={hasClaimed} />
        )}

        {/* Open Shifts tab */}
        {!shiftsLoading && activeTab === 'open' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {openShifts.length > 0 ? (
              <>
                {hasClaimed && !openShifts.every(s => myRequests.find(r => r.shift_id === s.shift_id)) && (
                  <div style={{ padding: '10px 16px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <AlertTriangle size={14} color="#F59E0B" />
                    <span style={{ fontSize: '0.8rem', color: '#92400E', fontWeight: 600 }}>
                      You've already submitted a claim — you can only claim one shift at a time. Cancel your existing request to claim another.
                    </span>
                  </div>
                )}
                {!hasClaimed && (
                  <div style={{ padding: '10px 16px', background: '#FFF5F5', border: '1px solid #FECACA', borderRadius: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <AlertTriangle size={14} color="#EF4444" />
                    <span style={{ fontSize: '0.8rem', color: '#B91C1C', fontWeight: 600 }}>
                      {openShifts.length} shift{openShifts.length > 1 ? 's' : ''} need coverage — you can claim <strong>one</strong>
                    </span>
                  </div>
                )}
                {openShifts.map((shift, i) => (
                  <OpenShiftCard
                    key={shift.shift_id}
                    shift={shift}
                    myRequests={myRequests}
                    onRequest={handleShiftRequest}
                    index={i}
                    alreadyClaimed={hasClaimed && !myRequests.find(r => r.shift_id === shift.shift_id)}
                  />
                ))}
              </>
            ) : (
              <div style={{ padding: '48px 32px', textAlign: 'center', background: 'white', border: '1px solid var(--border)', borderRadius: 16 }}>
                <CheckCircle size={28} color="#22C55E" style={{ marginBottom: 12 }} />
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: 4 }}>All shifts are fully staffed</div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No open slots right now</p>
              </div>
            )}
          </div>
        )}

        {/* Full Schedule tab */}
        {!shiftsLoading && activeTab === 'all' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {allShifts.length > 0 ? (
              <>
                <div style={{ padding: '10px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Full schedule · <span style={{ color: '#3B82F6', fontWeight: 600 }}>Blue rows = your shifts</span> · You can only request changes on your own shifts
                </div>
                {allShifts.map((shift, i) => {
                  const isMine = myShifts.some(s => s.shift_id === shift.shift_id)
                  return (
                    <ShiftRow key={shift.shift_id || i} shift={shift} myRequests={myRequests} onRequest={handleShiftRequest} isMyShift={isMine} />
                  )
                })}
              </>
            ) : (
              <div style={{ padding: '48px 32px', textAlign: 'center', background: 'white', border: '1px solid var(--border)', borderRadius: 16, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No shifts scheduled — run FRANK to generate the schedule
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* ── Bottom grid ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>

        {/* My Tasks */}
        <motion.div {...fadeUp(3)} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', boxShadow: 'var(--shadow-xs)' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>My Tasks</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {tasks.length > 0
              ? tasks.map((t, i) => <TaskItem key={i} text={t} />)
              : <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No tasks assigned</p>
            }
          </div>
        </motion.div>

        {/* Team Today */}
        <motion.div {...fadeUp(4)}>
          <TeamBoard teamToday={teamToday} allShifts={allShifts} />
        </motion.div>

        {/* Cash & Tips */}
        <motion.div {...fadeUp(5)}>
          <ShiftLogPanel shifts={allShifts} user={user} />
        </motion.div>
      </div>

      {/* ── Alerts + Rush + EOTW row ─────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        {/* Warnings / Recognitions */}
        <motion.div {...fadeUp(6)} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {warnings.length > 0 && (
            <div style={{ background: 'white', border: '1px solid #FECACA', borderRadius: 14, padding: '16px 18px', boxShadow: 'var(--shadow-xs)' }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10 }}>
                <AlertTriangle size={13} color="#F59E0B" />
                <p style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#92400E' }}>Warnings</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {warnings.map((w, i) => (
                  <div key={i} style={{ padding: '8px 10px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, fontSize: '0.78rem', color: '#92400E', lineHeight: 1.5 }}>
                    <strong>{w.employee || ''}</strong>{w.employee ? ' — ' : ''}{typeof w === 'string' ? w : w.message || ''}
                  </div>
                ))}
              </div>
            </div>
          )}
          {recognitions.length > 0 && (
            <div style={{ background: 'white', border: '1px solid #BBF7D0', borderRadius: 14, padding: '16px 18px', boxShadow: 'var(--shadow-xs)' }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10 }}>
                <Star size={13} color="#FBBF24" />
                <p style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#166534' }}>Recognitions</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {recognitions.map((r, i) => (
                  <div key={i} style={{ padding: '8px 10px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, fontSize: '0.78rem', color: '#166534', lineHeight: 1.5 }}>
                    <strong>{r.employee || ''}</strong>{r.employee ? ' — ' : ''}{typeof r === 'string' ? r : r.message || ''}
                  </div>
                ))}
              </div>
            </div>
          )}
          {warnings.length === 0 && recognitions.length === 0 && (
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: '24px', textAlign: 'center', boxShadow: 'var(--shadow-xs)' }}>
              <CheckCircle size={18} color="#22C55E" style={{ marginBottom: 8 }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No alerts today</p>
            </div>
          )}
        </motion.div>

        {/* Rush Hours */}
        {rushHours.length > 0 && (
          <motion.div {...fadeUp(7)} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px', boxShadow: 'var(--shadow-xs)' }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10 }}>
              <Flame size={13} color="#F59E0B" />
              <p style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#92400E' }}>Rush Windows</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {rushHours.map((h, i) => (
                <div key={i} style={{ display: 'flex', gap: 7, alignItems: 'center', padding: '6px 10px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, fontSize: '0.77rem', fontWeight: 600, color: '#92400E' }}>
                  <Clock size={11} />{typeof h === 'string' ? h : h?.window || ''}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* EOTW */}
        {eotw?.name && (
          <motion.div {...fadeUp(8)} style={{ background: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)', border: '1px solid #FDE68A', borderRadius: 14, padding: '16px 18px', boxShadow: '0 4px 16px rgba(251,191,36,0.12)' }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10 }}>
              <Star size={13} fill="#FBBF24" color="#FBBF24" />
              <p style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#92400E' }}>Employee of the Week</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #FBBF24, #F59E0B)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1rem', boxShadow: '0 0 12px rgba(251,191,36,0.5)', flexShrink: 0 }}>{eotw.name[0]}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#78350F' }}>{eotw.name}</div>
                <div style={{ fontSize: '0.72rem', color: '#B45309' }}>{eotw.role || 'Team Member'}</div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default EmployeeDashboard
