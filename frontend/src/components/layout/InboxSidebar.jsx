const DEFAULT_GROUP_NAMES = ['Promotions', 'Updates', 'Social']

/* SVG icons for each folder */
const FOLDER_ICONS = {
  inbox: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H4.99c-1.11 0-1.98.89-1.98 2L3 19c0 1.1.88 2 1.99 2H19c1.1 0 2-.9 2-2V5c0-1.11-.9-2-2-2zm0 12h-4c0 1.66-1.35 3-3 3s-3-1.34-3-3H4.99V5H19v10z"/></svg>,
  starred: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>,
  sent: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>,
  drafts: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M21.99 8c0-.72-.37-1.35-.94-1.7L12 1 2.95 6.3C2.38 6.65 2 7.28 2 8v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2l-.01-10zM12 13L3.74 7.84 12 3l8.26 4.84L12 13z"/></svg>,
  spam: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>,
  trash: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>,
  allmail: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>,
  archive: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"/></svg>,
}

const MAIL_FOLDERS = [
  { id: 'inbox', label: 'Inbox', icon: 'inbox' },
  { id: 'starred', label: 'Starred', icon: 'starred' },
  { id: 'sent', label: 'Sent', icon: 'sent' },
  { id: 'drafts', label: 'Drafts', icon: 'drafts' },
  { id: 'archive', label: 'Archive', icon: 'archive' },
  { id: 'spam', label: 'Spam', icon: 'spam' },
  { id: 'trash', label: 'Trash', icon: 'trash' },
]

function InboxSidebar({
  emailCount = 0,
  totalCount = 0,
  viewMode = 'tabs',
  onViewModeChange,
  userGroups = [],
  onDeleteGroup,
  onEditGroup,
  onGroupClick,
  activeFolder = 'inbox',
  onFolderChange,
  labelCounts = {},
}) {
  return (
    <aside className="inbox-sidebar">
      {/* Mail folders */}
      <nav className="inbox-sidebar__nav">
        {MAIL_FOLDERS.map((folder) => {
          const isActive = activeFolder === folder.id
          const count = folder.id === 'inbox'
            ? emailCount
            : (labelCounts[folder.id.toUpperCase()]?.total || labelCounts[folder.id.toUpperCase()]?.unread || 0)
          const unread = folder.id === 'inbox'
            ? undefined
            : labelCounts[folder.id.toUpperCase()]?.unread

          return (
            <button
              key={folder.id}
              type="button"
              className={`inbox-sidebar__item ${isActive ? 'inbox-sidebar__item--active' : ''}`}
              onClick={() => onFolderChange?.(folder.id)}
            >
              <span className="inbox-sidebar__icon" aria-hidden="true">
                {FOLDER_ICONS[folder.icon]}
              </span>
              <span className="inbox-sidebar__label">{folder.label}</span>
              {count > 0 && (
                <span className={`inbox-sidebar__count ${unread > 0 ? 'inbox-sidebar__count--unread' : ''}`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="inbox-sidebar__divider" />

      {/* View mode selector — always visible; clicking switches to Inbox and sets view */}
      <div className="inbox-sidebar__view-mode">
        <span className="inbox-sidebar__view-mode-label">View</span>
        <div className="inbox-sidebar__view-mode-btns" role="group">
          <button
            type="button"
            className={`inbox-sidebar__view-btn ${viewMode === 'tabs' && activeFolder === 'inbox' ? 'inbox-sidebar__view-btn--active' : ''}`}
            onClick={() => onViewModeChange?.('tabs')}
            title="Show emails with group tabs (Inbox)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: 4, verticalAlign: 'middle'}}><path d="M3 3h8v8H3V3zm0 10h8v8H3v-8zm10-10h8v8h-8V3zm0 10h8v8h-8v-8z"/></svg>
            Tabs
          </button>
          <button
            type="button"
            className={`inbox-sidebar__view-btn ${viewMode === 'grouped' && activeFolder === 'inbox' ? 'inbox-sidebar__view-btn--active' : ''}`}
            onClick={() => onViewModeChange?.('grouped')}
            title="Show emails in collapsible group cards (Inbox)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: 4, verticalAlign: 'middle'}}><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>
            Grouped
          </button>
        </div>
      </div>

      {userGroups.length > 0 && (
        <div className="inbox-sidebar__groups">
          <span className="inbox-sidebar__groups-label">Your Groups</span>
          {userGroups.map((g) => {
            const isDefault = DEFAULT_GROUP_NAMES.some((n) => n.toLowerCase() === (g.name || '').toLowerCase())
            return (
              <div
                key={g.id}
                className="inbox-sidebar__group-item"
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  if (!e.target.closest('.inbox-sidebar__group-actions')) onGroupClick?.(g)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    if (!e.target.closest('.inbox-sidebar__group-actions')) onGroupClick?.(g)
                  }
                }}
              >
                <span
                  className="inbox-sidebar__group-dot"
                  style={{ backgroundColor: g.color || '#5f6368' }}
                />
                <span className="inbox-sidebar__group-name">{g.name}</span>
                {!isDefault && (
                  <div className="inbox-sidebar__group-actions">
                    {onEditGroup && (
                      <button
                        type="button"
                        className="inbox-sidebar__group-btn"
                        title={`Edit ${g.name}`}
                        aria-label={`Edit ${g.name}`}
                        onClick={() => onEditGroup(g)}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                      </button>
                    )}
                    {onDeleteGroup && (
                      <button
                        type="button"
                        className="inbox-sidebar__group-btn inbox-sidebar__group-btn--danger"
                        title={`Delete ${g.name}`}
                        aria-label={`Delete ${g.name}`}
                        onClick={() => onDeleteGroup(g)}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {userGroups.length === 0 && activeFolder === 'inbox' && (
        <div className="inbox-sidebar__hint">
          <p className="inbox-sidebar__hint-text">
            No groups yet. Use the chatbot to create custom email groups.
          </p>
          <p className="inbox-sidebar__hint-example">
            Try: "Create a group for university emails"
          </p>
        </div>
      )}
    </aside>
  )
}

export default InboxSidebar
