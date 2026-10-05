import { IconButton, Loading, OverflowMenu, OverflowMenuItem, Tag, Tooltip } from '@carbon/react'
import { Attachment, Checkmark, Printer, Reply, Security } from '@carbon/icons-react'
import { observer } from 'mobx-react-lite'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { attachmentUrl, handleApiError, messageViewUrl } from './api'
import { mailsControllerApplyAction, mailsControllerGetMessage } from './client'
import { asArray, escapeHtml, formatAddresses } from './format'
import { bimiBadge, bimiLogoDataUrl, dkimBadge, dmarcBadge, spfBadge, tlsBadge } from './security'
import type { BadgeStatus } from './security'
import store, { type Mail } from './store'

/** Carbon Tag colors per badge status; `warn` has no Tag color and is styled via CSS. */
const TAG_TYPES: Record<BadgeStatus, 'green' | 'red' | 'gray'> = {
  ok: 'green',
  warn: 'gray',
  bad: 'red',
  none: 'gray',
}

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
  const navigate = useNavigate()
  const [msg, setMsg] = useState<Mail | null>(null)
  const [failed, setFailed] = useState(false)
  // kept open across messages on purpose, to compare details while browsing
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    setMsg(null)
    setFailed(false)
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
          <Loading small withOverlay={false} description="Loading message" />
        </div>
      </div>
    )
  }

  const attachments = asArray(msg.attachments)
  const logoUrl = bimiLogoDataUrl(msg.bimi)
  const badges = [
    tlsBadge(msg.connection),
    dkimBadge(msg.dkim),
    spfBadge(msg.spf),
    dmarcBadge(msg.dmarc),
    bimiBadge(msg.bimi),
  ]

  return (
    <div className="mail-view">
      <header className="mail-view-header">
        <div className="mail-view-title">
          <h2>{msg.subject || '(no subject)'}</h2>
          <span className="mail-view-from">
            {logoUrl && (
              <img className="bimi-logo" src={logoUrl} alt="" title="BIMI verified sender" />
            )}
            From: {formatAddresses(msg.from)}
          </span>
        </div>
        <div className="mail-view-actions">
          <IconButton
            kind="ghost"
            size="sm"
            align="bottom-end"
            label="Message details"
            aria-expanded={showDetails}
            aria-controls="mail-details"
            onClick={() => setShowDetails((value) => !value)}
          >
            <Security />
          </IconButton>
          <IconButton
            kind="ghost"
            size="sm"
            align="bottom-end"
            label="Reply"
            onClick={() => navigate(`/writeMail?replyToMsg=${encodeURIComponent(msg.id)}`)}
          >
            <Reply />
          </IconButton>
          <IconButton
            kind="ghost"
            size="sm"
            align="bottom-end"
            label="Print"
            onClick={() => printMessage(msg)}
          >
            <Printer />
          </IconButton>
          <IconButton
            kind="ghost"
            size="sm"
            align="bottom-end"
            label="Mark as done"
            onClick={markAsDone}
          >
            <Checkmark />
          </IconButton>
          {attachments.length > 0 && (
            <OverflowMenu
              size="sm"
              align="bottom-end"
              renderIcon={Attachment}
              iconDescription={`Attachments (${attachments.length})`}
              aria-label={`Attachments (${attachments.length})`}
            >
              {attachments.map((attachment, index) => (
                <OverflowMenuItem
                  key={attachment.contentId ?? index}
                  itemText={attachment.fileName || attachment.contentId || 'attachment'}
                  href={attachmentUrl(msg.id, attachment.contentId ?? '')}
                  // opens in a new tab; the props type does not declare anchor
                  // attributes even though they are spread onto the link
                  {...{ target: '_blank', rel: 'noreferrer' }}
                />
              ))}
            </OverflowMenu>
          )}
        </div>
      </header>
      {showDetails && (
        <div className="mail-details" id="mail-details">
          {badges.map((badge) => (
            <Tooltip
              key={badge.key}
              align="bottom-start"
              label={<span className="badge-tooltip">{badge.tooltip}</span>}
            >
              <Tag
                className={`badge-tag badge-tag--${badge.status}`}
                type={TAG_TYPES[badge.status]}
                size="sm"
                tabIndex={0}
              >
                {badge.key === 'bimi' && logoUrl && (
                  <img className="badge-logo" src={logoUrl} alt="" />
                )}
                <span className="badge-label">{badge.label}</span>
                <span className="badge-value">{badge.value}</span>
              </Tag>
            </Tooltip>
          ))}
        </div>
      )}
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
