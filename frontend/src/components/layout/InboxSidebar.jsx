function InboxSidebar({
  emailCount = 0,
  totalCount = 0,
  viewMode = 'tabs',
  onViewModeChange,
  userGroups = [],
}) {
  return (
    <aside className="inbox-sidebar">
      <nav className="inbox-sidebar__nav">
        <div className="inbox-sidebar__item inbox-sidebar__item--active">
          <span className="inbox-sidebar__icon inbox-sidebar__icon--inbox" aria-hidden="true" />
          <span className="inbox-sidebar__label">Inbox</span>
          <span className="inbox-sidebar__count">
            {emailCount !== totalCount ? `${emailCount} / ${totalCount}` : emailCount}
          </span>
        </div>
      </nav>

      <div className="inbox-sidebar__view-mode">
        <span className="inbox-sidebar__view-mode-label">View</span>
        <div className="inbox-sidebar__view-mode-btns" role="group">
          <button
            type="button"
            className={`inbox-sidebar__view-btn ${viewMode === 'tabs' ? 'inbox-sidebar__view-btn--active' : ''}`}
            onClick={() => onViewModeChange?.('tabs')}
            title="Show emails in category tabs"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: 4, verticalAlign: 'middle'}}><path d="M3 3h8v8H3V3zm0 10h8v8H3v-8zm10-10h8v8h-8V3zm0 10h8v8h-8v-8z"/></svg>
            Tabs
          </button>
          <button
            type="button"
            className={`inbox-sidebar__view-btn ${viewMode === 'grouped' ? 'inbox-sidebar__view-btn--active' : ''}`}
            onClick={() => onViewModeChange?.('grouped')}
            title="Show emails grouped by category"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: 4, verticalAlign: 'middle'}}><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>
            Grouped
          </button>
        </div>
      </div>

      {userGroups.length > 0 && (
        <div className="inbox-sidebar__groups">
          <span className="inbox-sidebar__groups-label">Groups</span>
          {userGroups.map((g) => (
            <div key={g.id} className="inbox-sidebar__group-item">
              <span
                className="inbox-sidebar__group-dot"
                style={{ backgroundColor: g.color || '#5f6368' }}
              />
              <span className="inbox-sidebar__group-name">{g.name}</span>
            </div>
          ))}
        </div>
      )}
    </aside>
  )
}

export default InboxSidebar
