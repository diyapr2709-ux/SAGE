import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import DashboardShell from './components/layout/DashboardShell'
import ManagerDashboard from './pages/ManagerDashboard'
import EmployeeDashboard from './pages/EmployeeDashboard'
import AdminDashboard from './pages/AdminDashboard'
import RevenuePage from './pages/RevenuePage'
import SchedulingPage from './pages/SchedulingPage'
import ReviewsPage from './pages/ReviewsPage'
import CostIntelPage from './pages/CostIntelPage'
import TeamPage from './pages/TeamPage'
import DataInputPage from './pages/DataInputPage'
import ReportsPage from './pages/ReportsPage'
import './index.css'

function ProtectedRoute({ children, allowedRoles }) {
  const { token, user } = useAuth()
  // Check localStorage too: setToken() is async, but localStorage.setItem is synchronous,
  // so the token is always there immediately after login() even before React commits state.
  const isAuthenticated = !!token || !!localStorage.getItem('sage_token')
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (allowedRoles && user && !allowedRoles.includes(user.role)) return <RoleRedirect />
  return children
}

function RoleRedirect() {
  const { user } = useAuth()
  // Fallback: decode token from localStorage if user state not yet committed
  const role = user?.role || (() => {
    try {
      const t = localStorage.getItem('sage_token')
      if (!t) return null
      return JSON.parse(atob(t.split('.')[1]))?.role
    } catch { return null }
  })()
  if (!role) return <Navigate to="/login" replace />
  if (role === 'admin' || role === 'manager' || role === 'ceo') return <Navigate to="/dashboard/overview" replace />
  return <Navigate to="/dashboard/employee" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardShell /></ProtectedRoute>}>
            <Route index element={<RoleRedirect />} />
            <Route path="overview"   element={<ProtectedRoute allowedRoles={['ceo','manager','admin']}><ManagerDashboard /></ProtectedRoute>} />
            <Route path="employee"   element={<ProtectedRoute allowedRoles={['employee','ceo','manager','admin']}><EmployeeDashboard /></ProtectedRoute>} />
            <Route path="admin"      element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="revenue"    element={<ProtectedRoute allowedRoles={['ceo','manager','admin']}><RevenuePage /></ProtectedRoute>} />
            <Route path="scheduling" element={<ProtectedRoute allowedRoles={['ceo','manager','admin']}><SchedulingPage /></ProtectedRoute>} />
            <Route path="reviews"    element={<ProtectedRoute allowedRoles={['ceo','manager','admin']}><ReviewsPage /></ProtectedRoute>} />
            <Route path="costintel"  element={<ProtectedRoute allowedRoles={['ceo','manager','admin']}><CostIntelPage /></ProtectedRoute>} />
            <Route path="team"       element={<ProtectedRoute allowedRoles={['ceo','manager','admin']}><TeamPage /></ProtectedRoute>} />
            <Route path="data"       element={<ProtectedRoute allowedRoles={['ceo','manager','admin','employee']}><DataInputPage /></ProtectedRoute>} />
            <Route path="reports"    element={<ProtectedRoute allowedRoles={['ceo','manager','admin']}><ReportsPage /></ProtectedRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
