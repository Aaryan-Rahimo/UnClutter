import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import MainLayout from '../components/layout/MainLayout'
import InboxSidebar from '../components/layout/InboxSidebar'
import CategoryTabs from '../components/layout/CategoryTabs'
import EmailList from '../components/layout/EmailList'
import GroupedEmailList from '../components/layout/GroupedEmailList'
import SortControls from '../components/layout/SortControls'
import EmailDetail from '../components/email/EmailDetail'
import ChatbotSidebar from '../components/layout/ChatbotSidebar'
import Toast from '../components/layout/Toast'
import GroupEditModal from '../components/layout/GroupEditModal'
import { getSessionId, setSessionId, clearSession } from '../utils/auth'
import {
  fetchMe,
  syncEmails,
  fetchEmails,
  fetchEmail,
  mapEmailFromBackend,
  categorizeEmail,
} from '../utils/gmailApi'
import { fetchGroups, updateGroup, deleteGroup } from '../utils/groupsApi'
import '../styles/home.css'

const CATEGORY_TABS = [
  { id: 'Primary', label: 'Primary', color: '#1a73e8' },
  { id: 'School', label: 'School', color: '#4285f4' },
  { id: 'Finance', label: 'Finance', color: '#34a853' },
  { id: 'Work', label: 'Work', color: '#f9ab00' },
  { id: 'Personal', label: 'Personal', color: '#ea4335' },
  { id: 'Other', label: 'Updates', color: '#5f6368' },
]

function parseEmailDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return Number.isNaN(d.getTime()) ? null : d.getTime()
}

function getSortRangeCutoff(sortRange) {
  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  switch (sortRange) {
    case 'Last 7 days':
      return now - 7 * day
    case 'Last 30 days':
      return now - 30 * day
    case 'Last 90 days':
      return now - 90 * day
    default:
      return 0
  }
}

function filterAndSortByDate(emailList, sortRange) {
  const cutoff = getSortRangeCutoff(sortRange)
  const dateKey = (e) => e.received_at || e.date
  return emailList
    .filter((e) => {
      const ts = parseEmailDate(dateKey(e))
      return ts != null && (cutoff === 0 || ts >= cutoff)
    })
    .sort((a, b) => (parseEmailDate(dateKey(b)) || 0) - (parseEmailDate(dateKey(a)) || 0))
}

function formatDate(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  const now = new Date()
  const diff = now - d
  if (diff < 60 * 1000) return 'Just now'
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 24 * 60 * 60 * 1000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (diff < 7 * 24 * 60 * 60 * 1000) return d.toLocaleDateString([], { weekday: 'short' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEmailId, setSelectedEmailId] = useState(null)
  const [selectedEmail, setSelectedEmail] = useState(null)
  const [sortRange, setSortRange] = useState('All time')
  const [viewMode, setViewMode] = useState('tabs')
  const [activeTab, setActiveTab] = useState('Primary')
  const [syncing, setSyncing] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [lastSynced, setLastSynced] = useState(null)

  const [user, setUser] = useState(null)
  const [emails, setEmails] = useState([])
  const [userGroups, setUserGroups] = useState([])
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Toast state
  const [toasts, setToasts] = useState([])

  // Group edit modal
  const [editingGroup, setEditingGroup] = useState(null)
  const [deletingGroup, setDeletingGroup] = useState(null)

  const sessionId = getSessionId()

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev.slice(-4), { ...toast, id }])
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const categorizeEmails = useCallback(async (emailList) => {
    const uncategorized = emailList.filter((e) => !e.ai_category || e.ai_category === 'Other')
    const toCategorize = uncategorized.slice(0, 5)
    if (toCategorize.length === 0) return
    for (const email of toCategorize) {
      try {
        await categorizeEmail(email.id)
        await new Promise((r) => setTimeout(r, 1500))
      } catch (err) {
        console.error('Categorize error:', err)
      }
    }
    try {
      const res = await fetchEmails()
      const list = (res?.emails ?? []).map(mapEmailFromBackend).map((e) => ({
        ...e,
        date: formatDate(e.received_at || e.date) || '',
      }))
      setEmails(list)
    } catch (err) {
      console.error('Refresh after categorize error:', err)
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const auth = params.get('auth')
    const sid = params.get('session_id')
    if (auth === 'ok' && sid) {
      setSessionId(sid)
      setRefreshTrigger((t) => t + 1)
    }
  }, [])

  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    fetchGroups()
      .then((groups) => {
        if (!cancelled) setUserGroups(groups)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [sessionId, refreshTrigger])

  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        setError('Request timed out. Is the backend running on port 3001?')
        setLoading(false)
      }
    }, 30000)
    Promise.all([fetchMe(), fetchEmails()])
      .then(([meRes, emailsRes]) => {
        if (cancelled) return
        clearTimeout(timeoutId)
        setUser(meRes?.user?.email ?? meRes?.user?.full_name ?? null)
        const list = (emailsRes?.emails ?? []).map(mapEmailFromBackend).map((e) => ({
          ...e,
          date: formatDate(e.received_at || e.date) || '',
        }))
        setEmails(list)
        setLoading(false)
        setLastSynced(new Date())
        syncEmails().then(() => fetchEmails()).then((res) => {
          if (cancelled) return
          const updated = (res?.emails ?? []).map(mapEmailFromBackend).map((e) => ({
            ...e,
            date: formatDate(e.received_at || e.date) || '',
          }))
          setEmails(updated)
          setLastSynced(new Date())
          categorizeEmails(updated)
        }).catch(() => {})
      })
      .catch((err) => {
        if (!cancelled) {
          clearTimeout(timeoutId)
          setError(err.message || 'Failed to load emails')
          setLoading(false)
        }
      })
    return () => { cancelled = true; clearTimeout(timeoutId) }
  }, [sessionId, refreshTrigger])

  const handleEmailClick = useCallback(async (emailOrId) => {
    const emailId = typeof emailOrId === 'object' ? emailOrId?.id : emailOrId
    if (!emailId) return
    setSelectedEmailId(emailId)
    setDetailLoading(true)
    setSelectedEmail(null)
    try {
      const data = await fetchEmail(emailId)
      const mapped = mapEmailFromBackend(data)
      const displayEmail = {
        ...mapped,
        sender: mapped.from_address || mapped.sender,
        date: formatDate(mapped.received_at) || mapped.date,
        body: mapped.body_plain || mapped.snippet,
        labels: mapped.label_ids || [],
      }
      setSelectedEmail(displayEmail)
    } catch (err) {
      console.error('Error fetching email:', err)
      setSelectedEmail(null)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const handleSync = useCallback(async () => {
    setSyncing(true)
    setError(null)
    try {
      await syncEmails()
      const emailsRes = await fetchEmails()
      const list = (emailsRes?.emails ?? []).map(mapEmailFromBackend).map((e) => ({
        ...e,
        date: formatDate(e.received_at || e.date) || '',
      }))
      setEmails(list)
      setLastSynced(new Date())
      const newCount = list.length - emails.length
      addToast({
        type: 'success',
        message: newCount > 0 ? `Synced ${newCount} new email${newCount !== 1 ? 's' : ''}` : 'Inbox is up to date',
      })
      await categorizeEmails(list)
    } catch (err) {
      setError(err.message || 'Sync failed')
      addToast({ type: 'error', message: 'Sync failed' })
    } finally {
      setSyncing(false)
    }
  }, [categorizeEmails, emails.length, addToast])

  const handleEditGroup = useCallback((group) => {
    setEditingGroup(group)
  }, [])

  const handleSaveGroup = useCallback(async (updates) => {
    if (!editingGroup) return
    try {
      await updateGroup(editingGroup.id, updates)
      const groups = await fetchGroups()
      setUserGroups(groups)
      setEditingGroup(null)
      addToast({ type: 'success', message: `Group "${updates.name}" updated` })
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to update group' })
    }
  }, [editingGroup, addToast])

  const handleDeleteGroup = useCallback((group) => {
    setDeletingGroup(group)
  }, [])

  const confirmDeleteGroup = useCallback(async () => {
    if (!deletingGroup) return
    try {
      await deleteGroup(deletingGroup.id)
      const groups = await fetchGroups()
      setUserGroups(groups)
      setDeletingGroup(null)
      addToast({ type: 'success', message: `Group "${deletingGroup.name}" deleted` })
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to delete group' })
    }
  }, [deletingGroup, addToast])

  // ---------- Filtered / sorted emails ----------

  const filteredEmails = useMemo(() => {
    if (!searchQuery.trim()) return emails
    const q = searchQuery.trim().toLowerCase()
    return emails.filter(
      (e) =>
        (e.sender || '').toLowerCase().includes(q) ||
        (e.from_address || '').toLowerCase().includes(q) ||
        (e.subject || '').toLowerCase().includes(q) ||
        (e.snippet || '').toLowerCase().includes(q)
    )
  }, [emails, searchQuery])

  const sortedEmails = useMemo(
    () => filterAndSortByDate(filteredEmails, sortRange),
    [filteredEmails, sortRange]
  )

  const tabCounts = useMemo(() => ({
      Primary: sortedEmails.filter((e) =>
        ['School', 'Work', 'Personal'].includes(e.ai_category || '') || !e.ai_category
      ).length,
      School: sortedEmails.filter((e) => e.ai_category === 'School').length,
      Finance: sortedEmails.filter((e) => e.ai_category === 'Finance').length,
      Work: sortedEmails.filter((e) => e.ai_category === 'Work').length,
      Personal: sortedEmails.filter((e) => e.ai_category === 'Personal').length,
      Other: sortedEmails.filter((e) => !e.ai_category || e.ai_category === 'Other').length,
  }), [sortedEmails])

  const displayedEmails = useMemo(() => {
    if (viewMode === 'grouped') return sortedEmails
    if (activeTab === 'Primary') {
      return sortedEmails.filter((e) =>
        ['School', 'Work', 'Personal'].includes(e.ai_category || '') || !e.ai_category
      )
    }
    if (activeTab === 'Other') {
      return sortedEmails.filter((e) => !e.ai_category || e.ai_category === 'Other')
    }
    return sortedEmails.filter((e) => (e.ai_category || 'Other') === activeTab)
  }, [sortedEmails, viewMode, activeTab])

  const categoryTabsWithCounts = useMemo(
    () =>
      CATEGORY_TABS.map((t) => ({
        ...t,
        count: tabCounts[t.id] || 0,
      })),
    [tabCounts]
  )

  // ---------- Keyboard shortcuts ----------

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      switch (e.key) {
        case 'j': { // Next email
          const idx = sortedEmails.findIndex((em) => em.id === selectedEmailId)
          if (idx < sortedEmails.length - 1) {
            handleEmailClick(sortedEmails[idx + 1])
          } else if (idx === -1 && sortedEmails.length) {
            handleEmailClick(sortedEmails[0])
          }
          break
        }
        case 'k': { // Previous email
          const idx = sortedEmails.findIndex((em) => em.id === selectedEmailId)
          if (idx > 0) {
            handleEmailClick(sortedEmails[idx - 1])
          }
          break
        }
        case 'Escape':
          if (selectedEmail) {
            setSelectedEmailId(null)
            setSelectedEmail(null)
          } else if (chatOpen) {
            setChatOpen(false)
          }
          break
        case 'c':
          setChatOpen((o) => !o)
          break
        case '/':
          e.preventDefault()
          document.querySelector('.top-bar__search')?.focus()
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedEmailId, selectedEmail, chatOpen, sortedEmails, handleEmailClick])

  const handleLogout = () => {
    clearSession()
    setUser(null)
    setEmails([])
    setSelectedEmailId(null)
    setSelectedEmail(null)
    window.location.href = '/login'
  }

  const displayEmail = selectedEmail
    ? {
        ...selectedEmail,
        sender: selectedEmail.sender || selectedEmail.from_address,
        date: selectedEmail.date || formatDate(selectedEmail.received_at),
        body: selectedEmail.body || selectedEmail.body_plain || selectedEmail.snippet,
        labels: selectedEmail.labels || selectedEmail.label_ids || [],
      }
    : null

  const lastSyncedText = lastSynced
    ? `Last synced ${formatDate(lastSynced.toISOString())}`
    : null

  // Build CSS class for dashboard
  const dashClasses = [
    'dashboard dashboard--gmail',
    chatOpen ? 'dashboard--chat-open' : '',
    sidebarCollapsed ? 'dashboard--sidebar-collapsed' : '',
  ].filter(Boolean).join(' ')

  return (
    <MainLayout
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onRunSort={handleSync}
      user={user}
      onLogout={handleLogout}
      syncing={syncing}
      lastSynced={lastSyncedText}
      chatOpen={chatOpen}
      onToggleChat={() => setChatOpen((o) => !o)}
      onToggleSidebar={() => setSidebarCollapsed((c) => !c)}
      sidebarCollapsed={sidebarCollapsed}
    >
      {syncing && (
        <div className="sorting-banner" role="status">
          <span className="loading-spinner" aria-hidden="true" />
          Syncing inbox...
        </div>
      )}
      {sessionId && error && (
        <div className="error-banner" role="alert">
          {error}
          <button
            type="button"
            className="error-banner__dismiss"
            onClick={() => setError(null)}
            aria-label="Dismiss"
          >
            &times;
          </button>
        </div>
      )}
      <div className={dashClasses}>
        <div className="dashboard__sidebar">
          <InboxSidebar
            emailCount={sortedEmails.length}
            totalCount={emails.length}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            userGroups={userGroups}
          />
        </div>
        <div className="dashboard__list-area">
          <SortControls
            sortRange={sortRange}
            onSortRangeChange={setSortRange}
            emailCount={sortedEmails.length}
            totalCount={emails.length}
          />
          {viewMode === 'tabs' && (
            <CategoryTabs
              tabs={categoryTabsWithCounts}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          )}
          <div className="dashboard__list-scroll">
            {loading ? (
              <div className="loading-state">
                <div className="skeleton-card" />
                <div className="skeleton-card" />
                <div className="skeleton-card" />
                <div className="skeleton-card" />
                <div className="skeleton-card" />
              </div>
            ) : displayedEmails.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon">&#128233;</div>
                <p className="empty-state__title">
                  {searchQuery ? 'No emails match your search' : 'No emails found'}
                </p>
                <p className="empty-state__hint">
                  {searchQuery
                    ? 'Try different keywords or clear your search'
                    : 'Sync your inbox to get started'}
                </p>
                {!searchQuery && (
                  <button type="button" className="empty-state__btn" onClick={handleSync} disabled={syncing}>
                    Sync Emails
                  </button>
                )}
              </div>
            ) : viewMode === 'grouped' ? (
              <GroupedEmailList
                emails={sortedEmails}
                userGroups={userGroups}
                selectedEmailId={selectedEmailId}
                onSelectEmail={handleEmailClick}
                onEditGroup={handleEditGroup}
                onDeleteGroup={handleDeleteGroup}
              />
            ) : (
              <EmailList
                emails={displayedEmails}
                selectedEmailId={selectedEmailId}
                onSelectEmail={handleEmailClick}
                showKeywordChips={false}
              />
            )}
          </div>
        </div>
        <div className="dashboard__detail">
          {detailLoading ? (
            <div className="email-detail-empty">
              <span className="loading-spinner" aria-hidden="true" />
              <p>Loading...</p>
            </div>
          ) : displayEmail ? (
            <EmailDetail
              email={displayEmail}
              onBack={() => {
                setSelectedEmailId(null)
                setSelectedEmail(null)
              }}
            />
          ) : (
            <div className="email-detail-empty">
              <div className="empty-state__icon" aria-hidden="true">&#128232;</div>
              <p className="email-detail-empty__title">Select an email to read</p>
              <p className="empty-state__hint">Click an email from the list or press J/K to navigate</p>
            </div>
          )}
        </div>
        <div className={`dashboard__chat ${!chatOpen ? 'is-closed' : ''}`}>
          <ChatbotSidebar
            isOpen={chatOpen}
            onClose={() => setChatOpen(false)}
            selectedEmail={selectedEmail}
            emails={emails}
            onGroupsChange={() => fetchGroups().then(setUserGroups)}
            onToast={addToast}
          />
        </div>
      </div>

      {/* Toast notifications */}
      <Toast toasts={toasts} onDismiss={dismissToast} />

      {/* Group edit modal */}
      {editingGroup && (
        <GroupEditModal
          group={editingGroup}
          onSave={handleSaveGroup}
          onCancel={() => setEditingGroup(null)}
        />
      )}

      {/* Delete confirmation */}
      {deletingGroup && (
        <div className="modal-overlay" onClick={() => setDeletingGroup(null)}>
          <div className="modal modal--small" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Confirm delete">
            <div className="modal__header">
              <h3 className="modal__title">Delete Group</h3>
            </div>
            <div className="modal__body">
              <p>Delete group &ldquo;{deletingGroup.name}&rdquo;? Emails won&rsquo;t be deleted, only the grouping.</p>
            </div>
            <div className="modal__footer">
              <button type="button" className="modal__btn modal__btn--secondary" onClick={() => setDeletingGroup(null)}>Cancel</button>
              <button type="button" className="modal__btn modal__btn--danger" onClick={confirmDeleteGroup}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}

export default Home
