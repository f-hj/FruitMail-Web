import { observer } from 'mobx-react-lite'
import { useEffect } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'

import { getToken, redirectToOauth } from './api'
import type { FolderDto } from './client'
import { ChevronIcon, NewIcon, RefreshIcon, UserIcon } from './icons'
import store, { type MailCategory } from './store'

interface FolderGroupProps {
  title: string
  category: MailCategory
  folders: Array<FolderDto>
}

const FolderGroup = observer(function FolderGroup({
  title,
  category,
  folders,
}: FolderGroupProps) {
  const collapsed = store.collapsed[category]
  return (
    <section className="folder-group">
      <button
        type="button"
        className="folder-group-toggle"
        aria-expanded={!collapsed}
        title={collapsed ? `Expand ${title}` : `Collapse ${title}`}
        onClick={() => store.toggleCategory(category)}
      >
        <ChevronIcon size={14} />
        {title}
      </button>
      {!collapsed && (
        <ul className="folder-list">
          {folders.map((folder) => (
            <li key={`${category}_${folder.name}`}>
              <NavLink
                className={({isActive }) => `folder-item${isActive ? ' active' : ''}`}
                to={`/${category}/${encodeURIComponent(folder.name)}`}
              >
                <span className="folder-name">{folder.name}</span>
                <span className="folder-count">{folder.count ?? 0}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
})

/**
 * Application shell: folder sidebar on the left, routed content on the right.
 * Redirects to the OAuth flow when there is no token.
 */
const App = observer(function App() {
  useEffect(() => {
    if (getToken() === null) {
      redirectToOauth()
      return
    }
    store.getFolders()
    store.getUserConfig()
  }, [])

  return (
    <div className="app">
      <aside className="sidebar">
        <header className="sidebar-header">
          <span className="sidebar-title">Fruit&apos;mail</span>
          <div className="sidebar-header-actions">
            <Link className="icon-button" to="/writeMail" title="Write a mail">
              <NewIcon />
            </Link>
            <button
              type="button"
              className="icon-button"
              title="Refresh folders"
              disabled={store.isGettingFolders}
              onClick={() => store.getFolders()}
            >
              <RefreshIcon className={store.isGettingFolders ? 'spinning' : undefined} />
            </button>
          </div>
        </header>
        <div className="sidebar-search">
          <input
            type="search"
            placeholder="Folder"
            aria-label="Filter folders"
            onChange={(event) => store.filterFolders(event.target.value)}
          />
        </div>
        <nav className="sidebar-nav">
          <FolderGroup title="Fresh" category="new" folders={store.folders.newP} />
          <FolderGroup title="Read" category="read" folders={store.folders.readP} />
          <FolderGroup title="Done" category="done" folders={store.folders.doneP} />
        </nav>
        <footer className="sidebar-footer">
          <UserIcon size={18} />
          <div className="sidebar-user">
            <span className="sidebar-user-name">{store.userName || 'Not signed in'}</span>
            {store.userMail && <span className="sidebar-user-mail">{store.userMail}</span>}
          </div>
        </footer>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
})

export default App
