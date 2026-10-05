import type { AuthErrorDto } from './client'
import { client } from './client/client.gen'

/** Base URL of the FruitMail API server. */
export const SERVER_URL = 'https://mail-server.fruitice.fr'

/** Abort requests after 12s, like the legacy axios instance did. */
const REQUEST_TIMEOUT_MS = 12_000

const TOKEN_STORAGE_KEY = 'token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token)
}

/** Fruit'ice account management page. */
export const FRUITICE_ACCOUNT_URL = 'https://auth.fruitice.fr/account'

/** Forgets the OAuth token and goes back through the OAuth flow. */
export function logout(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  redirectToOauth()
}

// Configure the generated hey-api client once for the whole app:
// - requests target the FruitMail server
// - the OAuth token from localStorage is sent as `Authorization: Bearer <token>`
//   (SDK functions declare the `bearer` security scheme from the OpenAPI spec)
// - requests are aborted after a 12s timeout
client.setConfig({
  baseUrl: SERVER_URL,
  auth: () => getToken() ?? undefined,
})

client.interceptors.request.use(
  (request) => new Request(request, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }),
)

/** Redirects the browser to the Fruit'ice OAuth implicit flow. */
export function redirectToOauth(): void {
  const isLocalhost = window.location.hostname === 'localhost'
  const params = new URLSearchParams({
    response_type: 'token',
    scope: 'infos mails',
    redirect_uri: isLocalhost
      ? 'http://localhost:3000/oauthCallback'
      : 'https://mail.fruitice.fr/oauthCallback',
    client_id: isLocalhost ? 'test-localhost-3000' : 'mail-web',
  })
  window.location.replace(
    `https://auth.fruitice.fr/oauth/interface?${params.toString().replace(/\+/g, '%20')}`,
  )
}

/**
 * Download URL of a mail attachment. The API accepts the token as a `token`
 * query parameter, which makes plain `<a href>` downloads work.
 */
export function attachmentUrl(mailId: string, contentId: string): string {
  const url = new URL(
    `${SERVER_URL}/attachment/${encodeURIComponent(mailId)}/${encodeURIComponent(contentId)}`,
  )
  const token = getToken()
  if (token) {
    url.searchParams.set('token', token)
  }
  return url.toString()
}

/**
 * URL of the server-rendered HTML (or text) body of a message
 * (`GET /msg/{id}/view`), suitable for an `<iframe src>`.
 */
export function messageViewUrl(mailId: string): string {
  const url = new URL(`${SERVER_URL}/msg/${encodeURIComponent(mailId)}/view`)
  const token = getToken()
  if (token) {
    url.searchParams.set('token', token)
  }
  return url.toString()
}

/**
 * URL of the verified BIMI logo of a message (`GET /msg/{id}/bimi-logo`),
 * suitable for an `<img src>` — the logo itself is not sent by list endpoints.
 */
export function bimiLogoUrl(mailId: string): string {
  const url = new URL(`${SERVER_URL}/msg/${encodeURIComponent(mailId)}/bimi-logo`)
  const token = getToken()
  if (token) {
    url.searchParams.set('token', token)
  }
  return url.toString()
}

/** Handles an error payload returned by the API (`{ data: undefined, error }`). */
export function handleApiError(error: unknown): void {
  if ((error as AuthErrorDto | undefined)?.err === 'invalid token') {
    redirectToOauth()
    return
  }
  console.error('FruitMail API error:', error)
}
