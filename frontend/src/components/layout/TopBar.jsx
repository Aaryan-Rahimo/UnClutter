function TopBar({ searchQuery = '', onSearchChange }) {
  return (
    <header className="top-bar">
      <div className="top-bar__app-name">UnClutter</div>
      <input
        type="search"
        className="top-bar__search"
        placeholder="Search emails..."
        value={searchQuery}
        onChange={(e) => onSearchChange?.(e.target.value)}
        aria-label="Search emails"
      />
    </header>
  )
}

export default TopBar
