import { useState, useCallback } from 'react'
import EmailPreview from '../email/EmailPreview'
import { matchEmailToGroup } from '../../utils/groupsApi'

const CATEGORY_ORDER = ['Primary', 'School', 'Finance', 'Work', 'Personal', 'Other']
const CATEGORY_LABELS = { Primary: 'Primary', School: 'School', Finance: 'Finance', Work: 'Work', Personal: 'Personal', Other: 'Updates' }
const CATEGORY_COLORS = { Primary: '#1a73e8', School: '#4285f4', Finance: '#34a853', Work: '#f9ab00', Personal: '#ea4335', Other: '#5f6368' }

function getCategory(email) {
  const cat = email.ai_category
  if (!cat) return 'Primary'
  if (cat === 'Other') return 'Other'
  return cat
}

function groupByAiCategory(emails) {
  const groups = {}
  for (const e of emails) {
    const cat = getCategory(e)
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(e)
  }
  return CATEGORY_ORDER.filter((id) => groups[id]?.length).map((id) => ({
    id,
    name: CATEGORY_LABELS[id] || id,
    description: '',
    color: CATEGORY_COLORS[id] || '#5f6368',
    emails: groups[id] || [],
  }))
}

function groupByUserGroups(emails, userGroups) {
  const byGroup = {}
  for (const g of userGroups) {
    byGroup[g.id] = { ...g, emails: [] }
  }
  byGroup.__unsorted__ = { id: '__unsorted__', name: 'Unsorted', description: 'Emails not matching any group', color: '#9aa0a6', emails: [] }

  for (const e of emails) {
    let matched = false
    for (const g of userGroups) {
      if (matchEmailToGroup(e, g)) {
        byGroup[g.id].emails.push(e)
        matched = true
        break
      }
    }
    if (!matched) {
      byGroup.__unsorted__.emails.push(e)
    }
  }

  const list = userGroups.map((g) => byGroup[g.id]).concat(byGroup.__unsorted__)
  return list.filter((g) => g.emails.length > 0)
}

const PREVIEW_COUNT = 3 // Number of emails to show when collapsed

function GroupedEmailList({
  emails = [],
  userGroups = [],
  selectedEmailId,
  onSelectEmail,
  onEditGroup,
  onDeleteGroup,
}) {
  const groups = userGroups.length > 0
    ? groupByUserGroups(emails, userGroups)
    : groupByAiCategory(emails)

  // Groups start partially collapsed (showing only PREVIEW_COUNT emails)
  const [expandedGroups, setExpandedGroups] = useState({})

  const toggleGroup = useCallback((groupId) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }))
  }, [])

  return (
    <div className="grouped-grid">
      {groups.map((group) => {
        const isExpanded = expandedGroups[group.id] === true
        const isUserGroup = group.id !== '__unsorted__' && userGroups.some((g) => g.id === group.id)
        const unreadCount = group.emails.filter((e) => !e.is_read).length
        const visibleEmails = isExpanded ? group.emails : group.emails.slice(0, PREVIEW_COUNT)
        const hasMore = group.emails.length > PREVIEW_COUNT

        return (
          <section key={group.id} className="grouped-grid__card">
            <div className="grouped-grid__bar" style={{ backgroundColor: group.color || '#5f6368' }} />
            <div className="grouped-grid__content">
              <div className="grouped-grid__header">
                <div className="grouped-grid__header-left">
                  <h3 className="grouped-grid__name">{group.name}</h3>
                  <span className="grouped-grid__count">{group.emails.length}</span>
                  {unreadCount > 0 && (
                    <span className="grouped-grid__unread">{unreadCount} new</span>
                  )}
                </div>
                <div className="grouped-grid__header-right">
                  {isUserGroup && (
                    <>
                      <button
                        type="button"
                        className="grouped-grid__action-btn"
                        title="Edit group"
                        onClick={() => onEditGroup?.(group)}
                        aria-label={`Edit ${group.name}`}
                      >
                        &#9998;
                      </button>
                      <button
                        type="button"
                        className="grouped-grid__action-btn grouped-grid__action-btn--danger"
                        title="Delete group"
                        onClick={() => onDeleteGroup?.(group)}
                        aria-label={`Delete ${group.name}`}
                      >
                        &#128465;
                      </button>
                    </>
                  )}
                </div>
              </div>
              {group.description && (
                <p className="grouped-grid__desc">{group.description}</p>
              )}
              <div className={`grouped-grid__emails ${isExpanded ? 'grouped-grid__emails--expanded' : ''}`}>
                {visibleEmails.map((email) => (
                  <EmailPreview
                    key={email.id}
                    email={email}
                    isSelected={selectedEmailId === email.id}
                    onClick={onSelectEmail}
                    showKeywordChips={false}
                  />
                ))}
              </div>
              {hasMore && (
                <button
                  type="button"
                  className="grouped-grid__toggle"
                  onClick={() => toggleGroup(group.id)}
                >
                  {isExpanded
                    ? 'Show less'
                    : `View all ${group.emails.length} emails`}
                </button>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}

export default GroupedEmailList
