import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../api/index.js'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [farmer, setFarmer] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access')
    if (token) {
      authAPI.getMe()
        .then(r => setFarmer(r.data))
        .catch(() => localStorage.clear())
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (phone, password) => {
    const r = await authAPI.login(phone, password)
    localStorage.setItem('access', r.data.access)
    localStorage.setItem('refresh', r.data.refresh)
    const me = await authAPI.getMe()
    setFarmer(me.data)
    return me.data
  }

  const logout = () => {
    localStorage.clear()
    setFarmer(null)
    window.location.href = '/login'
  }

  const isManager = farmer?.role === 'manager' || farmer?.role === 'nabard'

  return (
    <Ctx.Provider value={{ farmer, login, logout, loading, isManager }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)