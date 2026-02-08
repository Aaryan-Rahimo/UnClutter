const API_URL = import.meta.env.VITE_APP_API_URL || 'http://localhost:5000'

export async function checkAuth() {
  const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include' })
  const data = await res.json()
  return data.logged_in === true
}

export async function fetchEmails(query = '', max = 50) {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  params.set('max', max)
  const res = await fetch(`${API_URL}/api/emails?${params}`, { credentials: 'include' })
  if (!res.ok) throw new Error(res.status === 401 ? 'Not authenticated' : 'Failed to fetch emails')
  return res.json()
}

export function getLoginUrl() {
  return `${API_URL}/auth/login`
}

export async function logout() {
  await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' })
}
