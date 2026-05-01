import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { apiGetDataset, apiUploadDataset, apiSubmitShiftRequest, apiGetDataStatus } from '../api/client'
import {
  Save, Plus, Trash2, RefreshCw, CheckCircle, AlertTriangle,
  Users, DollarSign, Building2, MessageSquare, Calendar,
  HardDrive, FileText, Clock,
} from 'lucide-react'

const fadeUp = (i = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.06, duration: 0.38, ease: [0.22, 1, 0.36, 1] },
})

function SectionCard({ icon: Icon, title, color = '#3B82F6', children, index }) {
  return (
    <motion.div {...fadeUp(index)} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 22px', borderBottom: '1px solid var(--border-soft)', background: 'var(--off-white)' }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={15} color={color} />
        </div>
        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{title}</span>
      </div>
      <div style={{ padding: '20px 22px' }}>{children}</div>
    </motion.div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontFamily: "'Outfit', sans-serif", fontSize: '0.85rem', color: 'var(--text-primary)', outline: 'none', background: 'var(--surface)', transition: 'border 0.15s' }}
        onFocus={e => e.target.style.borderColor = 'var(--blue-400)'}
        onBlur={e => e.target.style.borderColor = 'var(--border)'}
      />
    </div>
  )
}

// ── Employee Feedback Form (for employees) ─────────────────────────
function EmployeeFeedbackForm() {
  const [shiftId, setShiftId]   = useState('')
  const [reqType, setReqType]   = useState('note')
  const [note, setNote]         = useState('')
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)

  const submit = async () => {
    if (!shiftId.trim() || !note.trim()) return
    setSaving(true)
    try {
      await apiSubmitShiftRequest({ shift_id: shiftId, request_type: reqType, note })
      setSaved(true); setNote(''); setShiftId('')
      setTimeout(() => setSaved(false), 3000)
    } finally { setSaving(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Field label="Shift ID (e.g. fri_evening_01)" value={shiftId} onChange={setShiftId} placeholder="fri_evening_01" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Request Type</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[['swap','Swap'],['unavailable',"Can't make it"],['available','Available'],['note','Note']].map(([k, l]) => (
            <button key={k} onClick={() => setReqType(k)} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${reqType===k ? 'var(--blue-400)' : 'var(--border)'}`, background: reqType===k ? 'var(--blue-50)' : 'white', color: reqType===k ? 'var(--blue-600)' : 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Note / Message</label>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Describe your request or add context…" style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontFamily: "'Outfit', sans-serif", fontSize: '0.85rem', color: 'var(--text-primary)', outline: 'none', resize: 'vertical' }} />
      </div>
      <SubmitButton onClick={submit} saving={saving} saved={saved} label="Submit Request" />
    </div>
  )
}

function SubmitButton({ onClick, saving, saved, label = 'Save Changes' }) {
  return (
    <motion.button onClick={onClick} disabled={saving || saved} whileTap={{ scale: 0.97 }}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 20px', borderRadius: 10, border: 'none', cursor: saving || saved ? 'default' : 'pointer', background: saved ? '#22C55E' : 'var(--blue-600)', color: 'white', fontFamily: "'Outfit', sans-serif", fontSize: '0.85rem', fontWeight: 700, transition: 'background 0.2s', opacity: saving ? 0.8 : 1 }}>
      {saving ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />Saving…</>
       : saved  ? <><CheckCircle size={14} />Saved!</>
       : <><Save size={14} />{label}</>}
    </motion.button>
  )
}

// ── Data Storage Status ────────────────────────────────────────────
function DataStorageStatus() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    apiGetDataStatus().then(r => setStatus(r.data)).catch(() => setStatus(null)).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const FILE_META = {
    active_dataset:     { label: 'Active Dataset',      icon: Building2,  color: '#3B82F6', desc: 'Business info & employees' },
    active_llm_dataset: { label: 'LLM Dataset',         icon: FileText,   color: '#8B5CF6', desc: 'Pre-computed AI outputs' },
    shift_requests:     { label: 'Shift Requests',       icon: Calendar,   color: '#F97316', desc: 'Employee swap/claim requests' },
    shift_log:          { label: 'Shift Log',             icon: DollarSign, color: '#22C55E', desc: 'Cash drawer & tips entries' },
    attendance:         { label: 'Attendance',            icon: Clock,      color: '#14B8A6', desc: 'Clock-in/out records' },
    owner_feedback:     { label: 'Owner Feedback',        icon: MessageSquare, color: '#EC4899', desc: 'Approval/rejection history' },
    preference_model:   { label: 'Preference Model',      icon: HardDrive,  color: '#6366F1', desc: 'Learned IRL model' },
  }

  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', borderBottom: '1px solid var(--border-soft)', background: 'var(--off-white)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: '#EFF6FF', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HardDrive size={15} color="#3B82F6" />
          </div>
          <div>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Data Storage Status</span>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}>All files stored in <code style={{ background: 'var(--surface)', padding: '1px 5px', borderRadius: 4, fontSize: '0.68rem' }}>sage/data/</code></div>
          </div>
        </div>
        <button onClick={load} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'white', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
          <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />Refresh
        </button>
      </div>

      {/* Active dataset highlight */}
      {status?.dataset?.business_id && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 22px', background: '#EFF6FF', borderBottom: '1px solid #BFDBFE' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1rem', flexShrink: 0 }}>
            {status.dataset.business_id[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1D4ED8' }}>
              {status.dataset.business_id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              {status.dataset.business_type && <span style={{ fontSize: '0.72rem', fontWeight: 400, color: '#60A5FA', marginLeft: 8 }}>· {status.dataset.business_type}</span>}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#3B82F6', marginTop: 2 }}>
              {status.dataset.location && `${status.dataset.location} · `}
              {status.dataset.employee_count} employees · {status.dataset.source === 'llm_dataset' ? 'LLM dataset loaded' : 'Plain dataset loaded'}
            </div>
          </div>
          <div style={{ padding: '4px 10px', borderRadius: 99, background: '#F0FDF4', border: '1px solid #BBF7D0', fontSize: '0.68rem', fontWeight: 700, color: '#166534' }}>Active</div>
        </div>
      )}

      <div style={{ padding: '18px 22px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>Loading…</div>
        ) : status?.files ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {Object.entries(FILE_META).map(([key, meta]) => {
              const fileInfo = status.files[key] || {}
              const Icon = meta.icon
              return (
                <div key={key} style={{
                  padding: '12px 14px', borderRadius: 11,
                  background: fileInfo.exists ? 'var(--off-white)' : '#F9FAFB',
                  border: `1px solid ${fileInfo.exists ? 'var(--border)' : 'var(--border-soft)'}`,
                  opacity: fileInfo.exists ? 1 : 0.55,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 7, background: `${meta.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={13} color={meta.color} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-primary)', lineHeight: 1.2 }}>{meta.label}</div>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 5 }}>{meta.desc}</div>
                  {fileInfo.exists ? (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {fileInfo.count != null && (
                        <div style={{ padding: '2px 7px', borderRadius: 99, background: `${meta.color}15`, fontSize: '0.65rem', fontWeight: 700, color: meta.color }}>
                          {fileInfo.count} {fileInfo.count === 1 ? 'record' : 'records'}
                        </div>
                      )}
                      <div style={{ padding: '2px 7px', borderRadius: 99, background: 'var(--surface)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                        {fileInfo.size_kb}KB
                      </div>
                      {fileInfo.modified && (
                        <div style={{ padding: '2px 7px', borderRadius: 99, background: 'var(--surface)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                          {new Date(fileInfo.modified).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.65rem', color: '#9CA3AF', fontStyle: 'italic' }}>Not created yet</div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            Could not load status — make sure the backend is running
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}


// ── Manager/CEO dataset editor ─────────────────────────────────────
function DatasetEditor() {
  const [dataset, setDataset] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState('')

  // Business fields
  const [bizName, setBizName]       = useState('')
  const [bizType, setBizType]       = useState('')
  const [location, setLocation]     = useState('')
  const [monthlyRev, setMonthlyRev] = useState('')
  const [employees, setEmployees]   = useState([])

  useEffect(() => {
    apiGetDataset()
      .then(res => {
        const d = res.data
        setDataset(d)
        setBizName(d.business_id || '')
        setBizType(d.business_type || '')
        setLocation(d.location || '')
        setMonthlyRev(d.monthly_revenue || '')
        setEmployees(d.employees || [])
      })
      .catch(() => {
        setEmployees([])
      })
      .finally(() => setLoading(false))
  }, [])

  const addEmployee = () => setEmployees(e => [...e, { name: '', role: '', hourly_rate: '', hours_per_week: '' }])
  const removeEmployee = (i) => setEmployees(e => e.filter((_, idx) => idx !== i))
  const updateEmployee = (i, field, val) => setEmployees(e => e.map((emp, idx) => idx === i ? { ...emp, [field]: val } : emp))

  const save = async () => {
    setSaving(true); setError('')
    try {
      const payload = {
        business_id:   bizName || 'marathon_deli',
        business_type: bizType || 'deli',
        location:      location || '',
        monthly_revenue: monthlyRev ? Number(monthlyRev) : undefined,
        employees: employees.map(e => ({
          ...e,
          hourly_rate:    e.hourly_rate    ? Number(e.hourly_rate)    : undefined,
          hours_per_week: e.hours_per_week ? Number(e.hours_per_week) : undefined,
        })).filter(e => e.name),
      }
      await apiUploadDataset(payload)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Save failed — check all required fields')
    } finally { setSaving(false) }
  }

  if (loading) return <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading dataset…</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* Business Info */}
      <SectionCard icon={Building2} title="Business Information" color="#3B82F6" index={0}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Business Name / ID" value={bizName} onChange={setBizName} placeholder="marathon_deli" />
          <Field label="Business Type" value={bizType} onChange={setBizType} placeholder="deli / restaurant / cafe" />
          <Field label="Location" value={location} onChange={setLocation} placeholder="College Park, MD" />
          <Field label="Monthly Revenue ($)" value={monthlyRev} onChange={setMonthlyRev} type="number" placeholder="85000" />
        </div>
      </SectionCard>

      {/* Employees */}
      <SectionCard icon={Users} title="Employee Roster" color="#8B5CF6" index={1}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {employees.map((emp, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px 120px 36px', gap: 10, alignItems: 'end' }}>
              <Field label={i === 0 ? 'Name' : ''} value={emp.name} onChange={v => updateEmployee(i,'name',v)} placeholder="Jane Doe" />
              <Field label={i === 0 ? 'Role' : ''} value={emp.role} onChange={v => updateEmployee(i,'role',v)} placeholder="Cashier / Cook" />
              <Field label={i === 0 ? '$/hr' : ''} value={emp.hourly_rate} onChange={v => updateEmployee(i,'hourly_rate',v)} type="number" placeholder="14" />
              <Field label={i === 0 ? 'hrs/week' : ''} value={emp.hours_per_week} onChange={v => updateEmployee(i,'hours_per_week',v)} type="number" placeholder="20" />
              <button onClick={() => removeEmployee(i)} style={{ height: 36, width: 36, borderRadius: 8, border: '1px solid #FECACA', background: '#FFF5F5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: i === 0 ? 20 : 0 }}>
                <Trash2 size={14} color="#EF4444" />
              </button>
            </div>
          ))}
          <button onClick={addEmployee} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 9, border: '1px dashed var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={14} />Add Employee
          </button>
        </div>
      </SectionCard>

      {error && (
        <div style={{ display: 'flex', gap: 8, padding: '12px 16px', background: '#FFF5F5', border: '1px solid #FECACA', borderRadius: 10 }}>
          <AlertTriangle size={15} color="#EF4444" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: '0.82rem', color: '#B91C1C' }}>{error}</span>
        </div>
      )}

      <SubmitButton onClick={save} saving={saving} saved={saved} />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────
export default function DataInputPage() {
  const { user } = useAuth()
  const isManager = user?.role === 'ceo' || user?.role === 'manager' || user?.role === 'admin'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 860 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <motion.div {...fadeUp(0)}>
        <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Data Management</p>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem', letterSpacing: '0.06em', color: 'var(--text-primary)', lineHeight: 1 }}>
          {isManager ? 'Business Data Input' : 'My Requests'}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 6 }}>
          {isManager
            ? 'Edit business info, employee roster, and financial targets. Changes are saved to the active dataset and used by all agents.'
            : 'Submit shift requests, availability updates, or notes to your manager.'}
        </p>
      </motion.div>

      {isManager ? (
        <>
          <DataStorageStatus />
          <DatasetEditor />
        </>
      ) : (
        <SectionCard icon={Calendar} title="Shift Request" color="#3B82F6" index={1}>
          <EmployeeFeedbackForm />
        </SectionCard>
      )}
    </div>
  )
}
