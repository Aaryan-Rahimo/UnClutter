import { createContext, useContext, useState, useEffect } from 'react'
import { checkAuth } from '../utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(null)

  useEffect(() => {
    checkAuth().then(setIsLoggedIn)
  }, [])

  const value = {
    isLoggedIn,
    refreshAuth: () => checkAuth().then(setIsLoggedIn),
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
