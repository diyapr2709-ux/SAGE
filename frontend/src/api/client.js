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

// ── Run FRANK ─────────────────────────────────────────────────────
export const apiRunFrank = (payload = {}) =>
  client.post('/run', payload)

export default client
