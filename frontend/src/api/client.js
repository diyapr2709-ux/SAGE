import axios from 'axios'

const client = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

// Attach JWT to every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('sage_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
}, (err) => Promise.reject(err))

// Handle 401 globally
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('sage_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────
export const apiLogin = (email, password) =>
  client.post('/auth/login', new URLSearchParams({ username: email, password }), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })

export const apiRegister = (data) =>
  client.post('/auth/register', data)

export const apiMe = () =>
  client.get('/auth/me')

// ── Dashboard ─────────────────────────────────────────────────────
export const apiDashboardSummary  = () => client.get('/dashboard/summary')
export const apiDashboardEmployee = () => client.get('/dashboard/employee')
export const apiDashboardManager  = () => client.get('/dashboard/manager')
export const apiDashboardCrew     = () => client.get('/dashboard/crew')
export const apiDashboardAdmin    = () => client.get('/dashboard/admin')

// ── Employee shifts ───────────────────────────────────────────────
export const apiEmployeeShifts = () => client.get('/dashboard/employee/shifts')
export const apiSubmitShiftRequest = (data) => client.post('/dashboard/employee/shift-request', data)
export const apiGetShiftRequests = () => client.get('/dashboard/employee/shift-requests')
export const apiActionShiftRequest = (data) => client.put('/dashboard/employee/shift-request/action', data)
export const apiNotifications = () => client.get('/dashboard/notifications')

// ── Shift log (cash / tips) ────────────────────────────────────────
export const apiGetShiftLog  = ()     => client.get('/dashboard/shift-log')
export const apiPostShiftLog = (data) => client.post('/dashboard/shift-log', data)

// ── Clock in / out ────────────────────────────────────────────────
export const apiClock          = (data) => client.post('/dashboard/clock', data)
export const apiGetAttendance  = ()     => client.get('/dashboard/attendance')

// ── Owner preference learning ─────────────────────────────────────
export const apiRecordFeedback   = (data) => client.post('/run/feedback', data)
export const apiGetPreferences   = ()     => client.get('/run/preferences')

// ── Shift log summary (manager view) ──────────────────────────────
export const apiGetShiftLogSummary = () => client.get('/dashboard/shift-log-summary')

// ── Data status ────────────────────────────────────────────────────
export const apiGetDataStatus   = ()     => client.get('/run/data-status')
export const apiGetLastOutput   = ()     => client.get('/run/last-output')

// ── Run FRANK ─────────────────────────────────────────────────────
export const apiRunFrank = () =>
  client.post('/run')

// ── Dataset upload / info ──────────────────────────────────────────
export const apiUploadDataset = (dataset) =>
  client.post('/run/dataset', dataset)

export const apiGetDataset = () =>
  client.get('/run/dataset')

export default client
