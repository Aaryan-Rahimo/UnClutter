import { API_BASE, getAuthHeaders } from './auth'

export async function fetchGroups() {
  const res = await fetch(`${API_BASE}/api/groups`, { headers: getAuthHeaders() })
  if (!res.ok) throw new Error('Failed to fetch groups')
  const data = await res.json()
  return data.groups || []
}

export async function createGroup(group) {
  const res = await fetch(`${API_BASE}/api/groups`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(group),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to create group')
  }
  return res.json()
}

export async function createGroupFromIntent(intent) {
  const res = await fetch(`${API_BASE}/api/ai/create-group`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ intent }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to create group')
  }
  return res.json()
}

export async function updateGroup(id, updates) {
  const res = await fetch(`${API_BASE}/api/groups/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to update group')
  }
  return res.json()
}

export async function deleteGroup(id) {
  const res = await fetch(`${API_BASE}/api/groups/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to delete group')
  }
  return res.json()
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Match email against a group's rules using word-boundary matching.
 * - Keywords use word boundary regex to avoid false positives
 * - Domains match against the sender's domain
 * - Senders match against the full from address
 */
export function matchEmailToGroup(email, group) {
  const searchText = [
    email.subject,
    email.snippet,
    email.body_plain,
    email.body,
  ].filter(Boolean).join(' ').toLowerCase()

  const from = (email.from_address || email.sender || '').toLowerCase()
  const domain = from.includes('@') ? from.split('@').pop().replace(/>$/, '') : ''

  // Check keywords with word boundary matching
  for (const kw of group.match_keywords || []) {
    if (!kw) continue
    const kwLower = String(kw).toLowerCase().trim()
    if (!kwLower) continue

    // For short keywords (<=3 chars), require exact word boundary
    // For longer keywords, also use word boundary to avoid false matches
    try {
      const regex = new RegExp(`\\b${escapeRegex(kwLower)}\\b`, 'i')
      if (regex.test(searchText) || regex.test(from)) return true
    } catch {
      // Fallback to includes if regex fails
      if (searchText.includes(kwLower)) return true
    }
  }

  // Check domains - match against sender domain
  for (const d of group.match_domains || []) {
    if (!d) continue
    const domainLower = String(d).toLowerCase().trim()
    if (!domainLower) continue
    // Domain match: exact or subdomain (e.g., "mcmaster.ca" matches "mail.mcmaster.ca")
    if (domain === domainLower || domain.endsWith('.' + domainLower)) return true
  }

  // Check senders - match against full from address
  for (const s of group.match_senders || []) {
    if (!s) continue
    if (from.includes(String(s).toLowerCase())) return true
  }

  return false
}
