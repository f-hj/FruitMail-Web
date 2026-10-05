import {
  IconButton,
  Loading,
  Modal,
  OverflowMenu,
  OverflowMenuItem,
  Stack,
  Tag,
} from '@carbon/react'
import { Attachment, Checkmark, Printer, Reply, Security } from '@carbon/icons-react'
import { observer } from 'mobx-react-lite'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { attachmentUrl, handleApiError, messageViewUrl } from './api'
import { mailsControllerApplyAction, mailsControllerGetMessage } from './client'
import { asArray, escapeHtml, formatAddresses, formatDate } from './format'
import { fetchMailBody } from './mailBody'
import {
  bimiBadge,
  bimiLogoDataUrl,
  dkimBadge,
  dmarcBadge,
  spamBadge,
  spfBadge,
  tlsBadge,
} from './security'
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
  const [bodyDoc, setBodyDoc] = useState<string | null>(null)
  const [bodyFailed, setBodyFailed] = useState(false)

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

  useEffect(() => {
    setBodyDoc(null)
    setBodyFailed(false)
    if (!id) {
      return
    }
    const controller = new AbortController()
    fetchMailBody(id, controller.signal)
      .then(setBodyDoc)
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.error(err)
          setBodyFailed(true)
        }
      })
    return () => controller.abort()
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
    spamBadge(msg.spam),
  ]

  return (
    <div className="mail-view">
      <header className="mail-view-header">
        <Stack gap={2} className="mail-view-title">
          <h2>{msg.subject || '(no subject)'}</h2>
          <span className="mail-view-from">
            {logoUrl && (
              <img className="bimi-logo" src={logoUrl} alt="" title="BIMI verified sender" />
            )}
            {formatAddresses(msg.from)}
          </span>
          <time className="mail-view-date" dateTime={new Date(msg.date).toISOString()}>
            {formatDate(msg.date)}
          </time>
        </Stack>
        <div className="mail-view-actions">
          <IconButton
            kind="ghost"
            size="sm"
            align="bottom-end"
            label="Message details"
            onClick={() => setShowDetails(true)}
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
      <Modal
        passiveModal
        open={showDetails}
        modalHeading="Message details"
        onRequestClose={() => setShowDetails(false)}
      >
        <Stack gap={6}>
          {badges.map((badge) => (
            <Stack key={badge.key} gap={3}>
              <div>
                <Tag
                  className={`badge-tag badge-tag--${badge.status}`}
                  type={TAG_TYPES[badge.status]}
                  size="sm"
                >
                  {badge.key === 'bimi' && logoUrl && (
                    <img className="badge-logo" src={logoUrl} alt="" />
                  )}
                  <span className="badge-label">{badge.label}</span>
                  {badge.value && <span className="badge-value">{badge.value}</span>}
                </Tag>
              </div>
              <p className="badge-details">{badge.details}</p>
            </Stack>
          ))}
        </Stack>
      </Modal>
      <iframe
        className="mail-view-body"
        title="Mail content"
        src={bodyFailed ? messageViewUrl(msg.id) : undefined}
        srcDoc={bodyFailed ? undefined : (bodyDoc ?? '')}
        sandbox="allow-same-origin allow-modals allow-popups"
      />
    </div>
  )
})

export default MailView
