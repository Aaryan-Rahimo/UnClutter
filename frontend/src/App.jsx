import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Home from './pages/Home'
import { getSessionId, setSessionId } from './utils/auth'

function App() {
  const [sessionChecked, setSessionChecked] = useState(false)
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const auth = params.get('auth')
    const sid = params.get('session_id')
    if (auth === 'ok' && sid) {
      setSessionId(sid)
      setHasSession(true)
      window.history.replaceState({}, '', window.location.pathname + window.location.hash)
    } else {
      setHasSession(!!getSessionId())
    }
    setSessionChecked(true)
  }, [])

  if (!sessionChecked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f6f8fc' }}>
        <p style={{ color: '#5f6368' }}>Loading…</p>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/home" element={hasSession ? <Home /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
