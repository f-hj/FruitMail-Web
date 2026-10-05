import {
  Content,
  Header,
  HeaderGlobalAction,
  HeaderGlobalBar,
  HeaderMenuButton,
  HeaderName,
  IconButton,
  Search,
  SideNav,
  SideNavItems,
  SideNavMenu,
  SideNavMenuItem,
  SkipToContent,
} from '@carbon/react'
import { Edit, Renew, User } from '@carbon/icons-react'
import { observer } from 'mobx-react-lite'
import { useEffect, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'

import { getToken, redirectToOauth } from './api'
import type { FolderDto } from './client'
import store, { type MailCategory } from './store'

interface FolderGroupProps {
  title: string
  category: MailCategory
  folders: Array<FolderDto>
}

function decodePathname(pathname: string): string {
  try {
    return decodeURIComponent(pathname)
  } catch {
    // malformed percent-encoding: compare against the raw pathname
    return pathname
  }
}

/** True when the current route shows the given folder (with or without a selected mail). */
function isFolderActive(pathname: string, category: MailCategory, folderName: string): boolean {
  const decoded = decodePathname(pathname)
  const base = `/${category}/${folderName}`
  return decoded === base || decoded.startsWith(`${base}/`)
}

const FolderGroup = observer(function FolderGroup({
  title,
  category,
  folders,
}: FolderGroupProps) {
  const collapsed = store.collapsed[category]
  const { pathname } = useLocation()

  // SideNavMenu manages its expansion internally; sync the persisted
  // collapsed state when its toggle button is clicked (but not when a
  // folder link inside the menu is clicked).
  function handleClick(event: ReactMouseEvent<HTMLLIElement>) {
    if ((event.target as HTMLElement | null)?.closest('button[aria-expanded]')) {
      store.toggleCategory(category)
    }
  }

  return (
    <SideNavMenu title={title} defaultExpanded={!collapsed} onClick={handleClick}>
      {folders.map((folder) => {
        const active = isFolderActive(pathname, category, folder.name)
        return (
          <SideNavMenuItem
            key={`${category}_${folder.name}`}
            as={Link}
            to={`/${category}/${encodeURIComponent(folder.name)}`}
            isActive={active}
            aria-current={active ? 'page' : undefined}
          >
            <span className="folder-name">{folder.name}</span>
            <span className="folder-count">{folder.count ?? 0}</span>
          </SideNavMenuItem>
        )
      })}
    </SideNavMenu>
  )
})

/** The signed-in user, shown as a tooltip on the user icon in the header. */
const HeaderUser = observer(function HeaderUser() {
  const name = store.userName
  const mail = store.userMail
  return (
    <IconButton
      kind="ghost"
      size="lg"
      align="bottom-end"
      className="header-user"
      label={
        <>
          {name || 'Not signed in'}
          {mail && <span className="header-user-mail">{mail}</span>}
        </>
      }
    >
      <User size={20} />
    </IconButton>
  )
})

/**
 * Application shell: Carbon UIShell with a top header (title, actions, user)
 * and a left side navigation holding the folder menus. Redirects to the OAuth
 * flow when there is no token.
 */
const App = observer(function App() {
  const navigate = useNavigate()
  // only meaningful below the `lg` breakpoint, where the side nav overlays
  // the content and starts closed
  const [isSideNavExpanded, setIsSideNavExpanded] = useState(false)

  useEffect(() => {
    if (getToken() === null) {
      redirectToOauth()
      return
    }
    store.getFolders()
    store.getUserConfig()
  }, [])

  /** On small screens, close the overlaying side nav after a link is followed. */
  function handleSideNavClick(event: ReactMouseEvent<HTMLElement>) {
    if ((event.target as HTMLElement | null)?.closest('a')) {
      setIsSideNavExpanded(false)
    }
  }

  return (
    <>
      <Header aria-label="Fruit'mail">
        <SkipToContent />
        <HeaderMenuButton
          aria-label={isSideNavExpanded ? 'Close folders' : 'Open folders'}
          isActive={isSideNavExpanded}
          onClick={() => setIsSideNavExpanded((value) => !value)}
        />
        <HeaderName as={Link} to="/" prefix="">
          Fruit&apos;mail
        </HeaderName>
        <HeaderGlobalBar>
          <HeaderGlobalAction
            aria-label="Write a mail"
            onClick={() => navigate('/writeMail')}
          >
            <Edit size={20} />
          </HeaderGlobalAction>
          <HeaderGlobalAction
            aria-label="Refresh folders"
            onClick={() => {
              if (!store.isGettingFolders) {
                store.getFolders()
              }
            }}
          >
            <Renew size={20} className={store.isGettingFolders ? 'spinning' : undefined} />
          </HeaderGlobalAction>
          <HeaderUser />
        </HeaderGlobalBar>
        <SideNav
          aria-label="Folders"
          expanded={isSideNavExpanded}
          onClick={handleSideNavClick}
          onOverlayClick={() => setIsSideNavExpanded(false)}
        >
          <div className="folder-search">
            <Search
              id="folder-search-input"
              size="sm"
              labelText="Filter folders"
              placeholder="Filter folders"
              onChange={(event) => store.filterFolders(event.target.value)}
            />
          </div>
          <SideNavItems>
            <FolderGroup title="Fresh" category="new" folders={store.folders.newP} />
            <FolderGroup title="Read" category="read" folders={store.folders.readP} />
            <FolderGroup title="Done" category="done" folders={store.folders.doneP} />
          </SideNavItems>
        </SideNav>
      </Header>
      <Content className="app-content" id="main-content">
        <Outlet />
      </Content>
    </>
  )
})

export default App
