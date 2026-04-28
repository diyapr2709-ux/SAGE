import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

function decodeToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) return null
    return { email: payload.sub, role: payload.role }
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('sage_token'))
  const [user, setUser]   = useState(() => {
    const t = localStorage.getItem('sage_token')
    return t ? decodeToken(t) : null
  })

  useEffect(() => {
    if (token) {
      const decoded = decodeToken(token)
      if (decoded) {
        setUser(decoded)
      } else {
        // Token invalid/expired
        localStorage.removeItem('sage_token')
        setToken(null)
        setUser(null)
      }
    } else {
      setUser(null)
    }
  }, [token])

  const login = useCallback((accessToken) => {
    localStorage.setItem('sage_token', accessToken)
    setToken(accessToken)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('sage_token')
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
