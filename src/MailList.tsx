import { observer } from 'mobx-react-lite'
import { useEffect, useRef, useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'

import { formatAddresses, formatDate } from './format'
import store, { isMailCategory } from './store'

/**
 * Scrollable list of the mails of the current folder, with infinite scrolling
 * (pages of 15 mails, from the newest to the oldest).
 */
const MailList = observer(function MailList() {
  const { type, folder } = useParams()
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
      {store.currentFolderMails.map((msg) => (
        <NavLink
          key={msg.id}
          to={`/${category}/${encodeURIComponent(folder ?? '')}/${encodeURIComponent(msg.id)}`}
          className={({ isActive }) => `mail-list-item${isActive ? ' selected' : ''}`}
        >
          <div className="mail-list-item-subject">{msg.subject || '(no subject)'}</div>
          <div className="mail-list-item-from">{formatAddresses(msg.from)}</div>
          <time className="mail-list-item-date" dateTime={new Date(msg.date).toISOString()}>
            {formatDate(msg.date)}
          </time>
        </NavLink>
      ))}
      {store.currentFolderMails.length === 0 && !loadingMore && (
        <div className="mail-list-empty">No mails in this folder</div>
      )}
      {loadingMore && <div className="mail-list-loading">Loading more mails…</div>}
    </div>
  )
})

export default MailList
