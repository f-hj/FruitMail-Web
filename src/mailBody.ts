import atkinson400 from '@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-400-normal.woff2?url'
import atkinson700 from '@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-700-normal.woff2?url'

import { messageViewUrl, SERVER_URL } from './api'
import { escapeHtml } from './format'

/**
 * Prepended to the mail's own head: the app font, and a zero-specificity
 * `:where()` fallback so mails that set their own fonts keep them. The base
 * keeps the mail's relative URLs pointing at the mail server.
 */
function injectedHead(): string {
  const fontUrl = (path: string) => new URL(path, window.location.href).toString()
  return (
    `<base href="${SERVER_URL}/">` +
    '<style>' +
    `@font-face{font-family:'Atkinson Hyperlegible';font-weight:400;font-display:swap;src:url(${fontUrl(atkinson400)}) format('woff2')}` +
    `@font-face{font-family:'Atkinson Hyperlegible';font-weight:700;font-display:swap;src:url(${fontUrl(atkinson700)}) format('woff2')}` +
    ":where(html){font-family:'Atkinson Hyperlegible',sans-serif}" +
    '</style>'
  )
}

/** Inserts the head right after `<head>` (or `<html>`), keeping any doctype first. */
function withInjectedHead(html: string): string {
  const head = injectedHead()
  for (const tag of [/<head\b[^>]*>/i, /<html\b[^>]*>/i]) {
    const match = tag.exec(html)
    if (match) {
      const end = match.index + match[0].length
      return html.slice(0, end) + head + html.slice(end)
    }
  }
  return head + html
}

/**
 * Fetches the server-rendered body of a message (`GET /msg/{id}/view`) as an
 * `<iframe srcdoc>` document with the app font as fallback. Plain text bodies
 * are wrapped in a preformatted block.
 */
export async function fetchMailBody(mailId: string, signal: AbortSignal): Promise<string> {
  const response = await fetch(messageViewUrl(mailId), { signal })
  if (!response.ok) {
    throw new Error(`GET /msg/${mailId}/view failed: ${response.status}`)
  }
  const content = await response.text()
  if (!(response.headers.get('content-type') ?? '').includes('text/html')) {
    return (
      `<!doctype html><html><head>${injectedHead()}</head><body>` +
      `<pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(content)}</pre>` +
      '</body></html>'
    )
  }
  return withInjectedHead(content)
}
