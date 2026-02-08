function CategoryTabs({ tabs = [], activeTab, onTabChange }) {
  return (
    <div className="category-tabs" role="tablist">
      {tabs.map(({ id, label, count }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={activeTab === id}
          className={`category-tabs__tab ${activeTab === id ? 'category-tabs__tab--active' : ''}`}
          onClick={() => onTabChange?.(id)}
        >
          <span className="category-tabs__label">{label}</span>
          {count > 0 && (
            <span className="category-tabs__badge">{count}</span>
          )}
        </button>
      ))}
    </div>
  )
}

export default CategoryTabs
