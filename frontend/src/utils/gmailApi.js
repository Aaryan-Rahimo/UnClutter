/**
 * Gmail API calls via our backend (requires auth token).
 */
import { API_BASE, getAuthHeaders } from './auth'

export async function fetchMe() {
  const res = await fetch(`${API_BASE}/api/auth/me`, { headers: getAuthHeaders() })
  if (!res.ok) return null
  return res.json()
}

export async function fetchEmails(maxResults = 50, q = '') {
  const params = new URLSearchParams({ maxResults: String(maxResults) })
  if (q) params.set('q', q)
  const res = await fetch(`${API_BASE}/api/emails?${params}`, { headers: getAuthHeaders() })
  if (!res.ok) throw new Error('Failed to fetch emails')
  return res.json()
}

export async function fetchEmail(id) {
  const res = await fetch(`${API_BASE}/api/emails/${id}`, { headers: getAuthHeaders() })
  if (!res.ok) throw new Error('Failed to fetch email')
  return res.json()
}

export async function logout() {
  await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', headers: getAuthHeaders() })
}
