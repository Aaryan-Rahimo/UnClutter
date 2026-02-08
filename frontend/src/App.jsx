import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Home from './pages/Home'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default landing page */}
        <Route path="/" element={<Landing />} />

        {/* Login route */}
        <Route path="/login" element={<Login />} />

        {/* Home / inbox */}
        <Route path="/home" element={<Home />} />

        {/* Redirect unknown routes to landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App