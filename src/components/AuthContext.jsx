import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../api/index.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [farmer, setFarmer] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access')
    if (token) {
      authAPI.getMe()
        .then(r => setFarmer(r.data))
        .catch(() => {
          localStorage.removeItem('access')
          localStorage.removeItem('refresh')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (phone, password) => {
    try {
      const r = await authAPI.login(phone, password)
      localStorage.setItem('access', r.data.access)
      localStorage.setItem('refresh', r.data.refresh)
      const me = await authAPI.getMe()
      setFarmer(me.data)
      if (me.data.cooperative_code) {
      localStorage.setItem('cooperative_code', me.data.cooperative_code)
    }
      return null
    } catch (ex) {
      return ex.response?.data?.detail || 'Wrong phone or password. Use demo credentials below.'
    }
  }

  const logout = () => {
    localStorage.removeItem('access')
    localStorage.removeItem('refresh')
    setFarmer(null)
  }

  const isManager = farmer?.role === 'manager' || farmer?.role === 'nabard'

  return (
    <AuthContext.Provider value={{ farmer, loading, login, logout, isManager }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
