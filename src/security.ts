import type {
  BimiCheckDto,
  ConnectionDto,
  DkimCheckDto,
  DmarcCheckDto,
  SpfCheckDto,
} from './client'
import { asArray } from './format'
import type { SpamCheck } from './store'

export type BadgeStatus = 'ok' | 'warn' | 'bad' | 'none'

/** One authentication/security indicator shown in the mail header details. */
export interface SecurityBadge {
  key: 'tls' | 'dkim' | 'spf' | 'dmarc' | 'bimi' | 'spam'
  status: BadgeStatus
  label: string
  /** Short summary; empty when the status colour says it all (pass, unknown). */
  value: string
  /** Multi-line details. */
  details: string
}

const STATUS_RANK: Record<BadgeStatus, number> = { bad: 0, warn: 1, none: 2, ok: 3 }

function resultStatus(result?: string): BadgeStatus {
  switch (result) {
    case 'pass':
      return 'ok'
    case 'fail':
    case 'permerror':
      return 'bad'
    case 'softfail':
    case 'temperror':
    case 'temperr':
      return 'warn'
    default:
      // none, neutral, policy, skipped, missing
      return 'none'
  }
}

/** The result word, unless it is `pass` (already conveyed by the badge colour). */
function resultWord(result?: string): string | undefined {
  return result === 'pass' ? undefined : result
}

function worstStatus(results: Array<string | undefined>): BadgeStatus {
  let worst: BadgeStatus = 'ok'
  for (const result of results) {
    const status = resultStatus(result)
    if (STATUS_RANK[status] < STATUS_RANK[worst]) {
      worst = status
    }
  }
  return worst
}

/** Formats certificate subject/issuer fields: known keys first, all entries as fallback. */
function formatCertFields(fields?: Record<string, unknown>): string | null {
  if (!fields) {
    return null
  }
  const known = ['CN', 'O', 'OU', 'markType']
    .filter((key) => fields[key] !== undefined)
    .map((key) => `${key}=${String(fields[key])}`)
  if (known.length > 0) {
    return known.join(', ')
  }
  const all = Object.entries(fields)
    .slice(0, 6)
    .map(([key, value]) => `${key}=${String(value)}`)
  return all.length > 0 ? all.join(', ') : null
}

/** `aligned` holds the aligned signing domain, or false when not aligned. */
function formatAligned(aligned: unknown): string {
  if (!aligned) {
    return 'not aligned'
  }
  if (typeof aligned === 'string') {
    return `aligned (${aligned})`
  }
  if (typeof aligned === 'object') {
    const values = Object.values(aligned as Record<string, unknown>).filter(
      (value): value is string => typeof value === 'string',
    )
    if (values.length === 1) {
      return `aligned (${values[0]})`
    }
  }
  return 'aligned'
}

function yesNo(value?: boolean): string | null {
  if (value === undefined) {
    return null
  }
  return value ? 'yes' : 'no'
}

export function tlsBadge(connection?: ConnectionDto): SecurityBadge {
  if (!connection) {
    return {
      key: 'tls',
      status: 'none',
      label: 'TLS',
      value: '',
      details: 'No connection metadata available for this message.',
    }
  }
  const tls = connection.tls
  const lines: Array<string> = [
    connection.secure ? 'Received over TLS' : 'Received in plaintext (no TLS)',
  ]
  if (connection.ip) {
    lines.push(`Sender: ${connection.ip}${connection.port !== undefined ? `:${connection.port}` : ''}`)
  }
  if (connection.localPort !== undefined) {
    lines.push(`Received on port: ${connection.localPort}`)
  }
  if (tls?.version) {
    lines.push(`Version: ${tls.version}`)
  }
  if (tls?.cipher) {
    lines.push(`Cipher: ${tls.cipher}`)
  }
  const cert = tls?.peerCertificate
  if (cert) {
    lines.push('Client certificate:')
    const subject = formatCertFields(cert.subject)
    if (subject) {
      lines.push(`  Subject: ${subject}`)
    }
    const issuer = formatCertFields(cert.issuer)
    if (issuer) {
      lines.push(`  Issuer: ${issuer}`)
    }
    if (cert.valid_from || cert.valid_to) {
      lines.push(`  Valid: ${cert.valid_from ?? '?'} → ${cert.valid_to ?? '?'}`)
    }
    if (cert.fingerprint) {
      lines.push(`  Fingerprint: ${cert.fingerprint}`)
    }
  }
  return {
    key: 'tls',
    status: connection.secure ? 'ok' : 'bad',
    label: 'TLS',
    value: connection.secure ? (tls?.version ?? 'encrypted') : 'plaintext',
    details: lines.join('\n'),
  }
}

export function dkimBadge(dkim?: DkimCheckDto | Array<DkimCheckDto>): SecurityBadge {
  // the spec declares an array, but the server sends a single object when
  // there is only one signature
  const checks = asArray(dkim)
  if (checks.length === 0) {
    return {
      key: 'dkim',
      status: 'none',
      label: 'DKIM',
      value: 'no signature',
      details: 'The message carries no DKIM signature.',
    }
  }
  const status = worstStatus(checks.map((check) => check.result))
  const worst =
    checks.find((check) => STATUS_RANK[resultStatus(check.result)] === STATUS_RANK[status]) ??
    checks[0]
  const domains = checks
    .map((check) => check.signingDomain)
    .filter((domain): domain is string => Boolean(domain))
  const detail = domains.length > 0 ? domains.join(', ') : `${checks.length} signatures`
  const value = [resultWord(worst.result), detail].filter(Boolean).join(' · ')
  const details = checks
    .map((check, index) => {
      const lines: Array<string> = [
        checks.length > 1 ? `Signature ${index + 1}: ${check.result}` : `Result: ${check.result}`,
      ]
      if (check.signingDomain) {
        lines.push(`d=${check.signingDomain}`)
      }
      if (check.selector) {
        lines.push(`s=${check.selector}`)
      }
      lines.push(formatAligned(check.aligned))
      if (check.comment) {
        lines.push(check.comment)
      }
      return lines.join('\n')
    })
    .join('\n\n')
  return { key: 'dkim', status, label: 'DKIM', value, details }
}

export function spfBadge(spf?: SpfCheckDto): SecurityBadge {
  if (!spf) {
    return {
      key: 'spf',
      status: 'none',
      label: 'SPF',
      value: '',
      details: 'No SPF result available for this message.',
    }
  }
  const lines: Array<string> = [`Result: ${spf.result}`]
  if (spf.domain) {
    lines.push(`Domain: ${spf.domain}`)
  }
  if (spf.clientIp) {
    lines.push(`Client IP: ${spf.clientIp}`)
  }
  if (spf.comment) {
    lines.push(`Comment: ${spf.comment}`)
  }
  return {
    key: 'spf',
    status: resultStatus(spf.result),
    label: 'SPF',
    value: [resultWord(spf.result), spf.domain].filter(Boolean).join(' · '),
    details: lines.join('\n'),
  }
}

export function dmarcBadge(dmarc?: DmarcCheckDto): SecurityBadge {
  if (!dmarc) {
    return {
      key: 'dmarc',
      status: 'none',
      label: 'DMARC',
      value: '',
      details: 'No DMARC result available for this message.',
    }
  }
  const lines: Array<string> = [`Result: ${dmarc.result}`]
  if (dmarc.comment) {
    lines.push(`Comment: ${dmarc.comment}`)
  }
  return {
    key: 'dmarc',
    status: resultStatus(dmarc.result),
    label: 'DMARC',
    value: resultWord(dmarc.result) ?? '',
    details: lines.join('\n'),
  }
}

export function bimiBadge(bimi?: BimiCheckDto): SecurityBadge {
  if (!bimi) {
    return {
      key: 'bimi',
      status: 'none',
      label: 'BIMI',
      value: '',
      details: 'No BIMI result available for this message.',
    }
  }
  let status: BadgeStatus
  let value: string
  switch (bimi.result) {
    case 'pass':
      status = bimi.verified ? 'ok' : 'warn'
      value = bimi.verified ? (bimi.domain ?? 'verified') : 'unverified logo'
      break
    case 'fail':
      status = 'bad'
      value = bimi.error?.message ?? 'fail'
      break
    case 'temperr':
      status = 'warn'
      value = 'temporary error'
      break
    case 'skipped':
      status = 'none'
      value = 'skipped (DMARC)'
      break
    default:
      status = 'none'
      value = 'no record'
  }
  const lines: Array<string> = [`Result: ${bimi.result}`]
  if (bimi.domain) {
    lines.push(`Domain: ${bimi.domain}`)
  }
  if (bimi.selector) {
    lines.push(`Selector: ${bimi.selector}`)
  }
  const verified = yesNo(bimi.verified)
  if (verified) {
    lines.push(`Logo verified: ${verified}`)
  }
  const hashMatch = yesNo(bimi.logoHashMatch)
  if (hashMatch) {
    lines.push(`Logo hash match: ${hashMatch}`)
  }
  const domainVerified = yesNo(bimi.domainVerified)
  if (domainVerified) {
    lines.push(`Domain verified: ${domainVerified}`)
  }
  const cert = bimi.certificate
  if (cert) {
    lines.push(`Certificate: ${cert.type ?? '?'} (trusted: ${cert.trusted ? 'yes' : 'no'})`)
    const subject = formatCertFields(cert.subject)
    if (subject) {
      lines.push(`  Subject: ${subject}`)
    }
    const altNames = asArray(cert.subjectAltName).filter(
      (name): name is string => typeof name === 'string',
    )
    if (altNames.length > 0) {
      lines.push(`  Covers: ${altNames.join(', ')}`)
    }
    const issuer = formatCertFields(cert.issuer)
    if (issuer) {
      lines.push(`  Issuer: ${issuer}`)
    }
    if (cert.validFrom || cert.validTo) {
      lines.push(`  Valid: ${cert.validFrom ?? '?'} → ${cert.validTo ?? '?'}`)
    }
  }
  if (bimi.error) {
    lines.push(`Error: ${bimi.error.code ? `${bimi.error.code} — ` : ''}${bimi.error.message}`)
  }
  if (bimi.comment) {
    lines.push(`Comment: ${bimi.comment}`)
  }
  if (bimi.rr) {
    lines.push(`Record: ${bimi.rr}`)
  }
  if (bimi.logoUrl) {
    lines.push(`Logo URL: ${bimi.logoUrl}`)
  }
  if (bimi.authorityUrl) {
    lines.push(`Authority URL: ${bimi.authorityUrl}`)
  }
  return { key: 'bimi', status, label: 'BIMI', value, details: lines.join('\n') }
}

export function spamBadge(spam?: SpamCheck): SecurityBadge {
  if (!spam) {
    return {
      key: 'spam',
      status: 'none',
      label: 'Spam',
      value: '',
      details: 'No spam check result available for this message.',
    }
  }
  let status: BadgeStatus = 'ok'
  if (spam.isSpam) {
    status = 'bad'
  } else if (spam.score >= spam.required / 2) {
    // halfway to the spam threshold
    status = 'warn'
  }
  const lines: Array<string> = [
    `${spam.isSpam ? 'Considered spam' : 'Not spam'}: score ${spam.score} (spam from ${spam.required})`,
  ]
  const rules = [...(spam.rules ?? [])].sort((a, b) => b.score - a.score)
  if (rules.length > 0) {
    lines.push('', 'Rules:')
    for (const rule of rules) {
      const score = rule.score > 0 ? `+${rule.score}` : String(rule.score)
      lines.push(`  ${score}  ${rule.name}${rule.description ? ` — ${rule.description}` : ''}`)
    }
  }
  return {
    key: 'spam',
    status,
    label: 'Spam',
    value: `${spam.score} / ${spam.required}`,
    details: lines.join('\n'),
  }
}

/** Data URL of the verified BIMI logo, when present (full message only). */
export function bimiLogoDataUrl(bimi?: BimiCheckDto): string | null {
  if (bimi?.verified && bimi.logo) {
    return `data:image/svg+xml;base64,${bimi.logo}`
  }
  return null
}
