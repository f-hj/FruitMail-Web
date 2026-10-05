import { observer } from 'mobx-react-lite'
import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { handleApiError } from './api'
import type { SendMailDto, SendMailResultDto } from './client'
import { mailsControllerGetMessage, mailsControllerSendMessage } from './client'
import store, { type Mail } from './store'

interface MailForm {
  from: string
  to: string
  cc: string
  subject: string
  inReplyTo: string
  markdown: string
}

interface AttachedFile {
  name: string
  /** base64 content, without the data-URL prefix */
  base64: string
}

/**
 * The server accepts a few fields that the OpenAPI spec does not declare
 * (attachments and message threading), mirroring the legacy client.
 */
type SendMailPayload = SendMailDto & {
  inReplyTo?: string
  references?: Array<string>
  attachments?: Array<{ encoding: 'base64'; filename: string; content: string }>
}

const emptyForm: MailForm = {
  from: '',
  to: '',
  cc: '',
  subject: '',
  inReplyTo: '',
  markdown: '',
}

function readFileAsBase64(file: File): Promise<AttachedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      const dataUrl = String(reader.result ?? '')
      const comma = dataUrl.indexOf(',')
      resolve({ name: file.name, base64: comma === -1 ? dataUrl : dataUrl.slice(comma + 1) })
    })
    reader.addEventListener('error', () => reject(reader.error))
    reader.readAsDataURL(file)
  })
}

/** Mail composition form, also used to reply to an existing message. */
const WriteMail = observer(function WriteMail() {
  const [searchParams] = useSearchParams()
  const { inReplyTo: inReplyToParam } = useParams()
  const navigate = useNavigate()

  const replyToMsg = searchParams.get('replyToMsg') ?? inReplyToParam

  const [form, setForm] = useState<MailForm>(emptyForm)
  const [files, setFiles] = useState<Array<AttachedFile>>([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // prefill `from` with the user's default address once the config is loaded
  useEffect(() => {
    setForm((current) => (current.from ? current : { ...current, from: store.defaultMail }))
  }, [store.defaultMail])

  // prefill the whole form when replying to an existing message
  useEffect(() => {
    if (!replyToMsg) {
      return
    }
    let cancelled = false
    mailsControllerGetMessage({ path: { id: replyToMsg } })
      .then(({ data, error }) => {
        if (cancelled) {
          return
        }
        if (error) {
          handleApiError(error)
          return
        }
        if (!data) {
          return
        }
        const msg = data as Mail
        const recipients = msg.to ?? msg.envelopeTo ?? []
        const sender = msg.envelopeFrom?.address ?? msg.from?.[0]?.address ?? ''
        setForm({
          from: recipients[0]?.address ?? store.defaultMail,
          to: sender,
          cc: (msg.cc ?? []).map((address) => address.address).join(', '),
          subject: `RE: ${msg.subject ?? ''}`,
          inReplyTo: msg.messageId ?? '',
          markdown:
            '\n\n---\n\n' +
            `**From:** ${sender}\n\n` +
            `**To:** ${recipients.map((address) => address.address).join(', ')}\n\n` +
            `${msg.text ?? msg.htmlText ?? ''}\n`,
        })
      })
      .catch(console.error)
    return () => {
      cancelled = true
    }
  }, [replyToMsg])

  function update(field: keyof MailForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleFiles(selected: FileList | null) {
    if (!selected || selected.length === 0) {
      return
    }
    try {
      const attached = await Promise.all(Array.from(selected).map(readFileAsBase64))
      setFiles((current) => [...current, ...attached])
    } catch (err) {
      console.error('Failed to read attachment:', err)
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, i) => i !== index))
  }

  function buildPayload(): SendMailPayload {
    return {
      from: { address: form.from, name: store.user.defaultName },
      to: form.to,
      cc: form.cc || undefined,
      subject: form.subject || undefined,
      inReplyTo: form.inReplyTo || undefined,
      references: form.inReplyTo ? [form.inReplyTo] : undefined,
      markdown: form.markdown,
      attachments: files.length
        ? files.map((file) => ({
            encoding: 'base64' as const,
            filename: file.name,
            content: file.base64,
          }))
        : undefined,
    }
  }

  async function sendMail() {
    setSending(true)
    setSendError(null)
    try {
      const { data, error } = await mailsControllerSendMessage({ body: buildPayload() })
      if (error) {
        handleApiError(error)
        setSendError((error as { err?: string }).err ?? 'The mail could not be sent')
        return
      }
      if ((data as SendMailResultDto | undefined)?.err) {
        setSendError((data as SendMailResultDto).err ?? 'The mail could not be sent')
        return
      }
      setConfirmOpen(false)
      navigate('/new/inbox')
    } catch (err) {
      console.error('Failed to send mail:', err)
      setSendError('The mail could not be sent')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="write-mail">
      <form
        className="write-mail-form"
        onSubmit={(event) => {
          event.preventDefault()
          setConfirmOpen(true)
        }}
      >
        <h1>Write a mail</h1>
        <div className="form-row">
          <label>
            <span>From</span>
            <input value={form.from} onChange={(event) => update('from', event.target.value)} />
          </label>
          <label>
            <span>To</span>
            <input
              value={form.to}
              onChange={(event) => update('to', event.target.value)}
              required
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            <span>Cc</span>
            <input value={form.cc} onChange={(event) => update('cc', event.target.value)} />
          </label>
          <label>
            <span>In reply to</span>
            <input
              value={form.inReplyTo}
              onChange={(event) => update('inReplyTo', event.target.value)}
            />
          </label>
        </div>
        <label className="form-field">
          <span>Subject</span>
          <input
            value={form.subject}
            onChange={(event) => update('subject', event.target.value)}
          />
        </label>
        <label className="form-field">
          <span>Content (markdown)</span>
          <textarea
            rows={14}
            value={form.markdown}
            onChange={(event) => update('markdown', event.target.value)}
          />
        </label>
        <div className="form-field">
          <span>Attachments</span>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(event) => handleFiles(event.target.files)}
          />
          {files.length > 0 && (
            <ul className="file-list">
              {files.map((file, index) => (
                <li key={`${file.name}-${index}`}>
                  {file.name}
                  <button
                    type="button"
                    className="file-remove"
                    title={`Remove ${file.name}`}
                    onClick={() => removeFile(index)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button type="submit" className="button primary">
          Check before send
        </button>
      </form>

      {confirmOpen && (
        <div
          className="modal-backdrop"
          onClick={() => {
            if (!sending) {
              setConfirmOpen(false)
            }
          }}
        >
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h2>Confirmation</h2>
            <div className="modal-section markdown-preview">
              <ReactMarkdown>{form.markdown}</ReactMarkdown>
            </div>
            <pre className="modal-section modal-json">{JSON.stringify(buildPayload(), null, 2)}</pre>
            {sendError && <p className="error">{sendError}</p>}
            <div className="modal-actions">
              <button
                type="button"
                className="button"
                disabled={sending}
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </button>
              <button type="button" className="button primary" disabled={sending} onClick={sendMail}>
                {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

export default WriteMail
