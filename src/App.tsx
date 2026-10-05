import {
  Content,
  ErrorBoundary,
  ErrorBoundaryContext,
  Header,
  HeaderGlobalAction,
  HeaderGlobalBar,
  HeaderMenuButton,
  HeaderName,
  IconButton,
  InlineNotification,
  OverflowMenu,
  OverflowMenuItem,
  Search,
  SideNav,
  SideNavItems,
  SideNavMenu,
  SideNavMenuItem,
  SkipToContent,
  ToastNotification,
} from '@carbon/react'
import { Edit, Renew, User } from '@carbon/icons-react'
import { observer } from 'mobx-react-lite'
import {
  useEffect,
  useState,
  type ComponentProps,
  type ErrorInfo,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'

import { FRUITICE_ACCOUNT_URL, getToken, logout, redirectToOauth } from './api'
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

/** Logs render errors caught by the ErrorBoundary (the Carbon default drops the error). */
const errorBoundaryLogger = {
  log(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack)
  },
}

/** Shown instead of the routed page when rendering it crashed. */
const contentErrorFallback = (
  <InlineNotification
    className="content-error"
    kind="error"
    title="Something went wrong"
    subtitle="This page could not be displayed. Select another folder or message to continue."
    hideCloseButton
    lowContrast
  />
)

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

/** Toast notification raised through `store.showToast`; success toasts close on their own. */
const AppToast = observer(function AppToast() {
  const toast = store.toast
  if (!toast) {
    return null
  }
  return (
    <ToastNotification
      key={toast.id}
      className="app-toast"
      kind={toast.kind}
      title={toast.title}
      subtitle={toast.subtitle}
      timeout={toast.kind === 'success' ? 6000 : 0}
      onClose={() => store.dismissToast()}
    />
  )
})

/** Header-sized user icon for the account menu trigger. */
function UserIcon(props: ComponentProps<typeof User>) {
  return <User size={20} {...props} />
}

/**
 * Signed-in user at the top of the account menu. OverflowMenu injects its item
 * props (closeMenu, index, ...) into every child: they are deliberately not
 * forwarded to the DOM, and `disabled` makes keyboard navigation skip it.
 */
const AccountMenuUser = observer(function AccountMenuUser(_props: { disabled: true }) {
  const name = store.userName
  const mail = store.userMail
  return (
    <li className="account-menu-user" role="none">
      <span className="account-menu-name">{name || 'Not signed in'}</span>
      {mail && <span className="account-menu-mail">{mail}</span>}
    </li>
  )
})

/** Account menu under the user icon in the header. */
const AccountMenu = observer(function AccountMenu() {
  const navigate = useNavigate()
  return (
    <OverflowMenu
      className="account-menu"
      size="lg"
      flipped
      renderIcon={UserIcon}
      iconDescription={store.userMail || 'Account'}
      aria-label="Account"
    >
      <AccountMenuUser disabled />
      <OverflowMenuItem itemText="Settings" hasDivider onClick={() => navigate('/settings')} />
      <OverflowMenuItem
        itemText="Fruit'ice account"
        href={FRUITICE_ACCOUNT_URL}
        // anchor attributes, spread onto the link but missing from the props type
        {...{ target: '_blank', rel: 'noreferrer' }}
      />
      <OverflowMenuItem itemText="Log out" hasDivider onClick={logout} />
    </OverflowMenu>
  )
})

/**
 * Application shell: Carbon UIShell with a top header (title, actions, user)
 * and a left side navigation holding the folder menus. Redirects to the OAuth
 * flow when there is no token.
 */
const App = observer(function App() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
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
          <AccountMenu />
        </HeaderGlobalBar>
        <SideNav
          aria-label="Folders"
          expanded={isSideNavExpanded}
          onClick={handleSideNavClick}
          onOverlayClick={() => setIsSideNavExpanded(false)}
        >
          <div className="folder-toolbar">
            <Search
              id="folder-search-input"
              size="sm"
              labelText="Filter folders"
              placeholder="Filter folders"
              onChange={(event) => store.filterFolders(event.target.value)}
            />
            <IconButton
              kind="ghost"
              size="sm"
              align="bottom-end"
              label="Refresh folders"
              disabled={store.isGettingFolders}
              onClick={() => store.getFolders()}
            >
              <Renew className={store.isGettingFolders ? 'spinning' : undefined} />
            </IconButton>
          </div>
          <SideNavItems>
            <FolderGroup title="Fresh" category="new" folders={store.folders.newP} />
            <FolderGroup title="Read" category="read" folders={store.folders.readP} />
            <FolderGroup title="Done" category="done" folders={store.folders.doneP} />
          </SideNavItems>
        </SideNav>
      </Header>
      <Content className="app-content" id="main-content">
        <ErrorBoundaryContext.Provider value={errorBoundaryLogger}>
          {/* keyed by route so navigating to another page recovers from the error */}
          <ErrorBoundary key={pathname} fallback={contentErrorFallback}>
            <Outlet />
          </ErrorBoundary>
        </ErrorBoundaryContext.Provider>
      </Content>
      <AppToast />
    </>
  )
})

export default App
