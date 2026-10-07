import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  DataTable,
  InlineLoading,
  InlineNotification,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  Tile,
} from '@carbon/react'
import { ArrowLeft } from '@carbon/icons-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { handleApiError } from './api'
import { dmarcStatsControllerGetReportById } from './client'
import { asArray, formatDate } from './format'

/** The full DMARC report as returned by the API (typed as unknown in the spec). */
interface DmarcReportDetail {
  id?: string
  domain?: string
  receivedAt?: number
  rcptTo?: string
  orgName?: string
  reportId?: string
  messageCount?: number
  passCount?: number
  policy?: string
  pct?: number
  dateRangeBegin?: number
  dateRangeEnd?: number
  email?: string
  extraContactInfo?: string
  records?: Array<DmarcReportRecord>
  [key: string]: unknown
}

interface DmarcReportRecord {
  sourceIp?: string
  count?: number
  disposition?: string
  dkim?: string
  spf?: string
  headerFrom?: string
  envelopeFrom?: string
  envelopeTo?: string
  [key: string]: unknown
}

function InfoTile({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <Tile className="admin-info-tile">
      <div className="admin-info-label">{label}</div>
      <div className="admin-info-value admin-mono">{String(value)}</div>
    </Tile>
  )
}

const DISPOSITION_TAG_TYPE: Record<string, 'green' | 'red' | 'gray'> = {
  none: 'green',
  quarantine: 'gray',
  reject: 'red',
}

const RESULT_TAG_TYPE: Record<string, 'green' | 'red' | 'gray'> = {
  pass: 'green',
  fail: 'red',
  none: 'gray',
}

export default function AdminDmarcReport() {
  const { id } = useParams<{ id: string }>()
  const [report, setReport] = useState<DmarcReportDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setNotFound(false)
    dmarcStatsControllerGetReportById({ path: { id } })
      .then(({ data, error }) => {
        if (error) {
          handleApiError(error)
          if ((error as { err?: string })?.err !== 'invalid token') {
            setNotFound(true)
          }
          return
        }
        setReport((data ?? null) as DmarcReportDetail | null)
      })
      .catch((err) => {
        console.error('Failed to load report:', err)
        setNotFound(true)
      })
      .finally(() => setLoading(false))
  }, [id])

  const records = asArray(report?.records)

  const recordHeaders = [
    { key: 'sourceIp', header: 'Source IP' },
    { key: 'count', header: 'Count' },
    { key: 'headerFrom', header: 'Header-From' },
    { key: 'disposition', header: 'Disposition' },
    { key: 'dkim', header: 'DKIM' },
    { key: 'spf', header: 'SPF' },
  ]

  const passRate =
    report?.messageCount && report.messageCount > 0
      ? ((report.passCount ?? 0) / report.messageCount) * 100
      : 0

  return (
    <div className="admin-page">
      <Breadcrumb>
        <BreadcrumbItem>
          <Link to="/admin/dmarc">DMARC Reports</Link>
        </BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>Report {id?.slice(0, 12)}…</BreadcrumbItem>
      </Breadcrumb>

      <div className="admin-page-header">
        <div>
          <h1>DMARC Report Detail</h1>
          <p className="admin-page-subtitle">
            {report?.orgName ?? '—'} · {report?.domain ?? '—'} ·{' '}
            {report?.receivedAt ? formatDate(report.receivedAt) : '—'}
          </p>
        </div>
        <Button kind="ghost" size="sm" renderIcon={ArrowLeft} onClick={() => window.history.back()}>
          Back
        </Button>
      </div>

      {loading && <InlineLoading description="Loading report…" />}

      {notFound && !loading && (
        <InlineNotification
          kind="error"
          title="Report not found"
          subtitle="The requested DMARC report could not be loaded."
          hideCloseButton
          lowContrast
        />
      )}

      {report && !loading && (
        <Stack gap={6}>
          {/* Summary KPI tiles */}
          <div className="admin-kpi-grid admin-kpi-grid--small">
            <Tile className="admin-kpi">
              <div className="admin-kpi-value">{report.messageCount?.toLocaleString() ?? '—'}</div>
              <div className="admin-kpi-label">Messages</div>
            </Tile>
            <Tile className="admin-kpi">
              <div className="admin-kpi-value">{report.passCount?.toLocaleString() ?? '—'}</div>
              <div className="admin-kpi-label">Passing</div>
            </Tile>
            <Tile className={`admin-kpi admin-kpi--${passRate >= 95 ? 'success' : passRate >= 80 ? 'default' : 'danger'}`}>
              <div className="admin-kpi-value">{passRate.toFixed(1)}%</div>
              <div className="admin-kpi-label">Pass Rate</div>
            </Tile>
            <Tile className="admin-kpi">
              <div className="admin-kpi-value">{records.length}</div>
              <div className="admin-kpi-label">Records</div>
            </Tile>
          </div>

          {/* Report metadata */}
          <section className="admin-section">
            <div className="admin-section-header">
              <h3>Report Metadata</h3>
            </div>
            <div className="admin-info-grid">
              <InfoTile label="Report ID" value={report.id} />
              <InfoTile label="Reporter Org" value={report.orgName} />
              <InfoTile label="Reporter Email" value={report.email} />
              <InfoTile label="Report ID (reporter)" value={report.reportId} />
              <InfoTile label="Domain" value={report.domain} />
              <InfoTile label="Recipient" value={report.rcptTo} />
              <InfoTile label="Received At" value={report.receivedAt ? formatDate(report.receivedAt) : null} />
              <InfoTile label="Policy" value={report.policy} />
              <InfoTile label="Policy %" value={report.pct} />
              <InfoTile
                label="Date Range"
                value={
                  report.dateRangeBegin && report.dateRangeEnd
                    ? `${formatDate(report.dateRangeBegin)} – ${formatDate(report.dateRangeEnd)}`
                    : null
                }
              />
              <InfoTile label="Extra Contact Info" value={report.extraContactInfo} />
            </div>
          </section>

          {/* Records table */}
          <section className="admin-section">
            <div className="admin-section-header">
              <h3>Records ({records.length})</h3>
            </div>
            {records.length > 0 ? (
              <DataTable
                rows={records.map((r, i) => ({ ...r, id: String(i) }))}
                headers={recordHeaders}
                isSortable
              >
                {({ rows, headers, getHeaderProps, getRowProps }) => (
                  <TableContainer>
                    <Table size="sm">
                      <TableHead>
                        <TableRow>
                          {headers.map((header) => (
                            <TableHeader {...getHeaderProps({ header })}>
                              {header.header}
                            </TableHeader>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rows.map((row) => (
                          <TableRow {...getRowProps({ row })}>
                            <TableCell className="admin-mono">
                              {row.cells.find((c) => c.info.header === 'sourceIp')?.value ?? '—'}
                            </TableCell>
                            <TableCell>
                              {Number(row.cells.find((c) => c.info.header === 'count')?.value ?? 0).toLocaleString()}
                            </TableCell>
                            <TableCell className="admin-mono">
                              {row.cells.find((c) => c.info.header === 'headerFrom')?.value ?? '—'}
                            </TableCell>
                            <TableCell>
                              {(() => {
                                const disp = String(row.cells.find((c) => c.info.header === 'disposition')?.value ?? '')
                                if (!disp) return '—'
                                return (
                                  <Tag size="sm" type={DISPOSITION_TAG_TYPE[disp] ?? 'gray'}>
                                    {disp}
                                  </Tag>
                                )
                              })()}
                            </TableCell>
                            <TableCell>
                              {(() => {
                                const dkim = String(row.cells.find((c) => c.info.header === 'dkim')?.value ?? '')
                                if (!dkim) return '—'
                                return (
                                  <Tag size="sm" type={RESULT_TAG_TYPE[dkim] ?? 'gray'}>
                                    {dkim}
                                  </Tag>
                                )
                              })()}
                            </TableCell>
                            <TableCell>
                              {(() => {
                                const spf = String(row.cells.find((c) => c.info.header === 'spf')?.value ?? '')
                                if (!spf) return '—'
                                return (
                                  <Tag size="sm" type={RESULT_TAG_TYPE[spf] ?? 'gray'}>
                                    {spf}
                                  </Tag>
                                )
                              })()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </DataTable>
            ) : (
              <p className="admin-empty">No records in this report</p>
            )}
          </section>
        </Stack>
      )}
    </div>
  )
}
