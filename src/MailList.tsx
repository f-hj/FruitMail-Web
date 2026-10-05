import { ClickableTile, InlineLoading } from '@carbon/react'
import { observer } from 'mobx-react-lite'
import { useEffect, useRef, useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'

import { bimiLogoUrl } from './api'
import { formatAddresses, formatDate } from './format'
import store, { isMailCategory } from './store'

/**
 * Verified BIMI brand logo. List endpoints do not include the logo itself,
 * so it is loaded from `GET /msg/{id}/bimi-logo` and hidden if unavailable.
 */
function BimiLogo({ mailId }: { mailId: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return null
  }
  return (
    <img
      className="bimi-logo"
      src={bimiLogoUrl(mailId)}
      alt="Verified brand logo"
      title="BIMI verified sender"
      width={16}
      height={16}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}

/**
 * Scrollable list of the mails of the current folder, with infinite scrolling
 * (pages of 15 mails, from the newest to the oldest).
 */
const MailList = observer(function MailList() {
  const { type, folder, id: selectedId } = useParams()
  const category = isMailCategory(type) ? type : 'new'
  const [loadingMore, setLoadingMore] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!folder) {
      return
    }
    store.getMails(category, folder)
  }, [category, folder])

  async function handleScroll() {
    const node = scrollRef.current
    if (!node || loadingMore || !folder) {
      return
    }
    // scrolled to the bottom?
    if (node.scrollHeight - node.scrollTop - node.offsetHeight >= 1) {
      return
    }
    setLoadingMore(true)
    try {
      await store.getMails(category, folder, true)
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="mail-list" ref={scrollRef} onScroll={handleScroll}>
      {store.currentFolderMails.map((msg) => {
        const active = selectedId === msg.id
        const to = `/${category}/${encodeURIComponent(folder ?? '')}/${encodeURIComponent(msg.id)}`
        return (
          <ClickableTile
            key={msg.id}
            className={`mail-tile${active ? ' mail-tile--selected' : ''}`}
            href={to}
            aria-current={active ? 'page' : undefined}
            // ClickableTile does not declare the polymorphic props of its
            // underlying link, but spreads everything onto it: render the
            // tile as a react-router NavLink for client-side navigation
            {...{ as: NavLink, to }}
          >
            <div className="mail-tile-subject">{msg.subject || '(no subject)'}</div>
            <div className="mail-tile-from">
              {msg.bimi?.verified && <BimiLogo mailId={msg.id} />}
              {formatAddresses(msg.from)}
            </div>
            <time className="mail-tile-date" dateTime={new Date(msg.date).toISOString()}>
              {formatDate(msg.date)}
            </time>
          </ClickableTile>
        )
      })}
      {store.currentFolderMails.length === 0 && !loadingMore && (
        <div className="mail-list-empty">No mails in this folder</div>
      )}
      {loadingMore && (
        <InlineLoading className="mail-list-loading" description="Loading more mails…" />
      )}
    </div>
  )
})

export default MailList
