import { motion } from 'framer-motion'
import { Shield } from 'lucide-react'
import ManagerDashboard from './ManagerDashboard'

// Admin view extends Manager view — add user management panel here when ready
export default function AdminDashboard() {
  return (
    <div>
      {/* Admin badge */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '6px 14px',
          background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)',
          borderRadius: 99, marginBottom: 20,
          boxShadow: '0 4px 12px rgba(37,99,235,0.35)',
        }}
      >
        <Shield size={13} color="white" />
        <span style={{ color: 'white', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em' }}>
          ADMIN VIEW
        </span>
      </motion.div>

      {/* Full manager view */}
      <ManagerDashboard />
    </div>
  )
}
