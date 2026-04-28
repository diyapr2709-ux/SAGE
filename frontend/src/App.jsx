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
import './index.css'

function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (allowedRoles && user && !allowedRoles.includes(user.role)) return <RoleRedirect />
  return children
}

function RoleRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'admin')   return <Navigate to="/dashboard/overview" replace />
  if (user.role === 'manager') return <Navigate to="/dashboard/overview" replace />
  return                              <Navigate to="/dashboard/employee"  replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardShell /></ProtectedRoute>}>
            <Route index element={<RoleRedirect />} />
            <Route path="overview"   element={<ProtectedRoute allowedRoles={['manager','admin']}><ManagerDashboard /></ProtectedRoute>} />
            <Route path="employee"   element={<ProtectedRoute allowedRoles={['employee','manager','admin']}><EmployeeDashboard /></ProtectedRoute>} />
            <Route path="admin"      element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="revenue"    element={<ProtectedRoute allowedRoles={['manager','admin']}><RevenuePage /></ProtectedRoute>} />
            <Route path="scheduling" element={<ProtectedRoute allowedRoles={['manager','admin']}><SchedulingPage /></ProtectedRoute>} />
            <Route path="reviews"    element={<ProtectedRoute allowedRoles={['manager','admin']}><ReviewsPage /></ProtectedRoute>} />
            <Route path="costintel"  element={<ProtectedRoute allowedRoles={['manager','admin']}><CostIntelPage /></ProtectedRoute>} />
            <Route path="team"       element={<ProtectedRoute allowedRoles={['manager','admin']}><TeamPage /></ProtectedRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
