import TopBar from './TopBar'
import '../../styles/home.css'

function MainLayout({
  children,
  searchQuery = '',
  onSearchChange,
  onRunSort,
  user = null,
  onLogout,
}) {
  return (
    <div className="main-layout">
      <TopBar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onRunSort={onRunSort}
        user={user}
        onLogout={onLogout}
      />
      <main className="main-layout__content">{children}</main>
    </div>
  )
}

export default MainLayout
