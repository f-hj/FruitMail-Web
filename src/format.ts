import type { MailAddressDto } from './client'

/**
 * Normalizes a server field declared as an array but sometimes sent as a
 * single object (or missing entirely), so callers can `.map` safely.
 */
export function asArray<T>(value: T | Array<T> | null | undefined): Array<T> {
  if (Array.isArray(value)) {
    return value
  }
  if (value === null || value === undefined) {
    return []
  }
  return [value]
}

/** Formats mail addresses the way the legacy UI did: `Name <address>`. */
export function formatAddresses(
  addresses?: MailAddressDto | Array<MailAddressDto>,
): string {
  const list = asArray(addresses)
  if (list.length === 0) {
    return 'Unknown'
  }
  return list
    .map((address) => `${address.name ?? 'Unknown'} <${address.address ?? 'Unknown'}>`)
    .join(', ')
}

/** Formats a unix-ms timestamp for display in the mail list. */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString()
}

/** Escapes a string so it can be embedded in HTML safely. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
