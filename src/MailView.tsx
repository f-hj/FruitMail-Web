import { observer } from 'mobx-react-lite'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { attachmentUrl, handleApiError, messageViewUrl } from './api'
import { mailsControllerApplyAction, mailsControllerGetMessage } from './client'
import { escapeHtml, formatAddresses } from './format'
import { AttachmentIcon, CheckIcon, PrintIcon, ReplyIcon } from './icons'
import store, { type Mail } from './store'

/**
 * Prints the body of a message through a transient same-origin iframe
 * (the displayed iframe points at the API server and is cross-origin, so it
 * cannot be printed from here). Scripts stay disabled via the sandbox.
 */
function printMessage(msg: Mail): void {
  const body =
    msg.html ??
    `<pre class="plain">${escapeHtml(msg.text ?? msg.htmlText ?? '')}</pre>`
  const iframe = document.createElement('iframe')
  iframe.setAttribute('sandbox', 'allow-same-origin allow-modals')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument
  const win = iframe.contentWindow
  if (!doc || !win) {
    iframe.remove()
    return
  }
  doc.open()
  doc.write(
    `<!doctype html><html><head><title>${escapeHtml(msg.subject || 'mail')}</title>` +
      '<style>body{font-family:\'Atkinson Hyperlegible\',sans-serif}pre.plain{white-space:pre-wrap;font-family:inherit}</style>' +
      `</head><body>${body}</body></html>`,
  )
  doc.close()

  const cleanup = () => iframe.remove()
  win.addEventListener('afterprint', cleanup, { once: true })
  // let the iframe render before opening the print dialog
  setTimeout(() => {
    win.focus()
    win.print()
    // fallback cleanup for browsers without `afterprint` support
    setTimeout(cleanup, 30_000)
  }, 100)
}

/** Header + body of the selected message. */
const MailView = observer(function MailView() {
  const { id } = useParams()
  const [msg, setMsg] = useState<Mail | null>(null)
  const [failed, setFailed] = useState(false)
  const [showAttachments, setShowAttachments] = useState(false)

  useEffect(() => {
    setMsg(null)
    setFailed(false)
    setShowAttachments(false)
    if (!id) {
      return
    }
    let cancelled = false
    mailsControllerGetMessage({ path: { id } })
      .then(({ data, error }) => {
        if (cancelled) {
          return
        }
        if (error) {
          handleApiError(error)
          setFailed(true)
          return
        }
        if (data) {
          setMsg(data as Mail)
          if (!data.read) {
            mailsControllerApplyAction({ path: { id, act: 'setAsRead' } })
              .then((result) => {
                if (result.error) {
                  handleApiError(result.error)
                }
              })
              .catch(console.error)
          }
        }
      })
      .catch((err) => {
        console.error(err)
        if (!cancelled) {
          setFailed(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [id])

  async function markAsDone() {
    if (!id) {
      return
    }
    const { error } = await mailsControllerApplyAction({ path: { id, act: 'setAsDone' } })
    if (error) {
      handleApiError(error)
      return
    }
    store.getFolders()
    store.getMails()
  }

  if (!id) {
    return (
      <div className="mail-view">
        <header className="mail-view-header" />
        <div className="mail-view-placeholder">No message selected</div>
      </div>
    )
  }

  if (failed) {
    return (
      <div className="mail-view">
        <header className="mail-view-header" />
        <div className="mail-view-placeholder">Could not load this message</div>
      </div>
    )
  }

  if (!msg) {
    return (
      <div className="mail-view">
        <header className="mail-view-header" />
        <div className="mail-view-placeholder">
          <span className="spinner" />
        </div>
      </div>
    )
  }

  const attachments = msg.attachments ?? []

  return (
    <div className="mail-view">
      <header className="mail-view-header">
        <div className="mail-view-title">
          <h2>{msg.subject || '(no subject)'}</h2>
          <span className="mail-view-from">From: {formatAddresses(msg.from)}</span>
        </div>
        <div className="mail-view-actions">
          <Link
            className="icon-button"
            to={`/writeMail?replyToMsg=${encodeURIComponent(msg.id)}`}
            title="Reply"
          >
            <ReplyIcon />
          </Link>
          <button
            type="button"
            className="icon-button"
            title="Print"
            onClick={() => printMessage(msg)}
          >
            <PrintIcon />
          </button>
          <button
            type="button"
            className="icon-button"
            title="Mark as done"
            onClick={markAsDone}
          >
            <CheckIcon />
          </button>
          {attachments.length > 0 && (
            <div className="attachments">
              <button
                type="button"
                className="icon-button"
                title="Attachments"
                onClick={() => setShowAttachments((value) => !value)}
              >
                <AttachmentIcon />
                <span className="attachments-count">{attachments.length}</span>
              </button>
              {showAttachments && (
                <>
                  <div
                    className="attachments-backdrop"
                    onClick={() => setShowAttachments(false)}
                  />
                  <ul className="attachments-menu">
                    {attachments.map((attachment, index) => (
                      <li key={attachment.contentId ?? index}>
                        <a
                          href={attachmentUrl(msg.id, attachment.contentId ?? '')}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {attachment.fileName || attachment.contentId || 'attachment'}
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      </header>
      <iframe
        className="mail-view-body"
        title="Mail content"
        src={messageViewUrl(msg.id)}
        sandbox="allow-same-origin allow-modals allow-popups"
      />
    </div>
  )
})

export default MailView
