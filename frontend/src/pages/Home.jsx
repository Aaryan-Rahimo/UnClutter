import { useState, useMemo, useEffect } from 'react'
import MainLayout from '../components/layout/MainLayout'
import SortControls from '../components/layout/SortControls'
import CardGrid from '../components/cards/CardGrid'
import EmailDetail from '../components/email/EmailDetail'
import ChatbotSidebar from '../components/layout/ChatbotSidebar'
import { getToken, setToken, clearToken } from '../utils/auth'
import { fetchMe, fetchEmails, fetchEmail, logout as apiLogout } from '../utils/gmailApi'
import {
  categories,
  emails,
  getEmailsByCategory,
  getEmailById,
} from '../utils/dummyData'
import '../styles/home.css'

const INBOX_CATEGORY = { id: 'inbox', title: 'Inbox', description: 'Your Gmail inbox' }

/** Parse email date string (e.g. "Feb 7", "Fri, 7 Feb 2025 12:00:00 -0500") to timestamp; null if unparseable. */
function parseEmailDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null
  const d = new Date(dateStr.trim())
  return Number.isNaN(d.getTime()) ? null : d.getTime()
}

/** Cutoff timestamp for sort range (emails >= cutoff are included). */
function getSortRangeCutoff(sortRange) {
  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  switch (sortRange) {
    case 'Last 7 days': return now - 7 * day
    case 'Last 30 days': return now - 30 * day
    case 'Last 90 days': return now - 90 * day
    default: return 0 // All time
  }
}

/** Filter emails by sort range and sort by date descending (newest first). */
function filterAndSortByDate(emailList, sortRange) {
  const cutoff = getSortRangeCutoff(sortRange)
  return emailList
    .filter((e) => {
      const ts = parseEmailDate(e.date)
      return ts != null && (cutoff === 0 || ts >= cutoff)
    })
    .sort((a, b) => (parseEmailDate(b.date) || 0) - (parseEmailDate(a.date) || 0))
}

function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEmailId, setSelectedEmailId] = useState(null)
  const [sortRange, setSortRange] = useState('Last 7 days')
  const [showKeywordChips, setShowKeywordChips] = useState(true)
  const [isSortingRunning, setIsSortingRunning] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

  const [user, setUser] = useState(null)
  const [gmailEmails, setGmailEmails] = useState([])
  const [gmailLoading, setGmailLoading] = useState(false)
  const [gmailError, setGmailError] = useState(null)
  const [selectedEmailFull, setSelectedEmailFull] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const token = getToken()
  const [urlTokenApplied, setUrlTokenApplied] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const t = params.get('token')
    if (t) {
      setToken(t)
      setUrlTokenApplied(true)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  useEffect(() => {
    const authToken = getToken()
    if (!authToken) return
    let cancelled = false
    setGmailLoading(true)
    setGmailError(null)
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        setGmailError('Request timed out. Is the backend running on port 5001?')
        setGmailLoading(false)
      }
    }, 15000)
    Promise.all([
      fetchMe(),
      fetchEmails(50, searchQuery.trim() || undefined),
    ])
      .then(([meRes, emailsRes]) => {
        if (cancelled) return
        setUser(meRes?.email ?? null)
        setGmailEmails(emailsRes?.emails ?? [])
      })
      .catch((err) => {
        if (!cancelled) setGmailError(err.message || 'Failed to load emails')
      })
      .finally(() => {
        if (!cancelled) setGmailLoading(false)
        clearTimeout(timeoutId)
      })
    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [token, urlTokenApplied, searchQuery, refreshTrigger])

  useEffect(() => {
    if (!selectedEmailId || !getToken()) {
      setSelectedEmailFull(null)
      return
    }
    let cancelled = false
    setDetailLoading(true)
    fetchEmail(selectedEmailId)
      .then((data) => {
        if (!cancelled) {
          setSelectedEmailFull({
            id: data.id,
            sender: data.sender,
            subject: data.subject,
            snippet: data.snippet,
            date: data.date,
            body: data.body,
            labels: data.labelIds || [],
          })
        }
      })
      .catch(() => {
        if (!cancelled) setSelectedEmailFull(null)
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false)
      })
    return () => { cancelled = true }
  }, [selectedEmailId, token])

  const filteredEmails = useMemo(() => {
    if (!searchQuery.trim()) return emails
    const q = searchQuery.trim().toLowerCase()
    return emails.filter(
      (e) =>
        e.sender.toLowerCase().includes(q) ||
        e.subject.toLowerCase().includes(q) ||
        (e.snippet && e.snippet.toLowerCase().includes(q)) ||
        (e.body && e.body.toLowerCase().includes(q))
    )
  }, [searchQuery])

  const categoriesWithEmails = useMemo(() => {
    if (token && gmailEmails.length >= 0) {
      const list = gmailEmails.map((e) => ({
        id: e.id,
        sender: e.sender,
        subject: e.subject,
        snippet: e.snippet,
        date: e.date,
        detectedKeywords: [],
      }))
      const filtered = filterAndSortByDate(list, sortRange)
      return [{ category: INBOX_CATEGORY, emails: filtered }]
    }
    if (!searchQuery.trim()) {
      const byCat = getEmailsByCategory()
      return categories.map((cat) => {
        const categoryEmails = byCat[cat.id] || []
        const filtered = filterAndSortByDate(categoryEmails, sortRange)
        return { category: cat, emails: filtered }
      })
    }
    const byCategoryId = {}
    filteredEmails.forEach((email) => {
      const cat = categories.find((c) => c.id === email.categoryId)
      if (cat) {
        if (!byCategoryId[cat.id]) byCategoryId[cat.id] = { category: cat, emails: [] }
        byCategoryId[cat.id].emails.push(email)
      }
    })
    return Object.values(byCategoryId).map(({ category, emails: catEmails }) => ({
      category,
      emails: filterAndSortByDate(catEmails, sortRange),
    }))
  }, [token, gmailEmails, searchQuery, filteredEmails, sortRange])

  const selectedEmail = token
    ? selectedEmailFull
    : selectedEmailId
      ? getEmailById(selectedEmailId)
      : null

  const handleRunSort = () => {
    setIsSortingRunning(true)
    if (token) setRefreshTrigger((t) => t + 1)
    setTimeout(() => setIsSortingRunning(false), 1500)
  }

  const handleLogout = async () => {
    try {
      await apiLogout()
    } catch (_) {}
    clearToken()
    setUser(null)
    setGmailEmails([])
    setSelectedEmailId(null)
    setSelectedEmailFull(null)
    window.location.href = '/login'
  }

  return (
    <MainLayout
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onRunSort={handleRunSort}
      user={user}
      onLogout={handleLogout}
    >
      {isSortingRunning && (
        <div className="sorting-banner" role="status">
          Sorting your inbox…
        </div>
      )}
      {token && gmailError && (
        <div className="sorting-banner" style={{ background: '#fce8e6', color: '#c5221f' }}>
          {gmailError}
        </div>
      )}
      <div className={`dashboard ${chatOpen ? 'dashboard--chat-open' : ''}`}>
        <div className="dashboard__left">
          <button type="button" className="compose-btn">
            Run Sort
          </button>
          <SortControls
            sortRange={sortRange}
            onSortRangeChange={setSortRange}
            showKeywordChips={showKeywordChips}
            onShowKeywordChipsChange={setShowKeywordChips}
            onRunSort={handleRunSort}
          />
          <div className="dashboard__cards-scroll">
            {token && gmailLoading ? (
              <p className="gmail-loading">Loading inbox…</p>
            ) : (
              <CardGrid
                categoriesWithEmails={categoriesWithEmails}
                selectedEmailId={selectedEmailId}
                onSelectEmail={(email) => setSelectedEmailId(email?.id ?? null)}
                showKeywordChips={!token && showKeywordChips}
                isSearchResults={!!searchQuery.trim()}
              />
            )}
          </div>
        </div>
        <div className="dashboard__center">
          {detailLoading ? (
            <div className="email-detail-empty">
              <p>Loading…</p>
            </div>
          ) : selectedEmail ? (
            <EmailDetail
              email={selectedEmail}
              onBack={() => {
                setSelectedEmailId(null)
                setSelectedEmailFull(null)
              }}
            />
          ) : (
            <div className="email-detail-empty">
              <p>Select an email to view details</p>
            </div>
          )}
        </div>
        <div className={`dashboard__right ${!chatOpen ? 'is-closed' : ''}`}>
          <ChatbotSidebar onClose={() => setChatOpen(false)} />
        </div>
      </div>
      <button
        type="button"
        className={`chat-fab ${chatOpen ? 'chat-fab--active' : ''}`}
        onClick={() => setChatOpen((o) => !o)}
        aria-label={chatOpen ? 'Close chat' : 'Open chat'}
      >
        <span className="chat-fab__icon" aria-hidden="true" />
        <span className="chat-fab__label">Chat</span>
      </button>
    </MainLayout>
  )
}

export default Home
