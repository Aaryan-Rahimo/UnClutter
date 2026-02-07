/**
 * Auth token for backend (Gmail OAuth). Stored in sessionStorage.
 */
const KEY = 'unclutter_auth_token'

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001'

export function getToken() {
  return sessionStorage.getItem(KEY)
}

export function setToken(token) {
  if (token) sessionStorage.setItem(KEY, token)
  else sessionStorage.removeItem(KEY)
}

export function clearToken() {
  sessionStorage.removeItem(KEY)
}

export function getAuthHeaders() {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}
