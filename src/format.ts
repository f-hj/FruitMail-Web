import type { MailAddressDto } from './client'

/** Formats mail addresses the way the legacy UI did: `Name <address>`. */
export function formatAddresses(addresses?: Array<MailAddressDto>): string {
  if (!addresses || addresses.length === 0) {
    return 'Unknown'
  }
  return addresses
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
