import {
  Button,
  Column,
  DataTable,
  Dropdown,
  Grid,
  InlineLoading,
  InlineNotification,
  Pagination,
  ProgressBar,
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
import { Renew, View } from '@carbon/icons-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { handleApiError } from './api'
import {
  dmarcStatsControllerGetDispositionStats,
  dmarcStatsControllerGetDomainStats,
  dmarcStatsControllerGetOverview,
  dmarcStatsControllerGetRecentReports,
  dmarcStatsControllerGetReporterStats,
  dmarcStatsControllerGetTimeline,
  dmarcStatsControllerGetTopFailingDomains,
  dmarcStatsControllerGetTopFailingIps,
} from './client'
import type {
  AdminForbiddenDto,
  DmarcDispositionStatsDto,
  DmarcDomainStatsDto,
  DmarcReporterStatsDto,
  DmarcReportListDto,
  DmarcStatsOverviewDto,
  DmarcTimelineEntryDto,
  DmarcTopFailingDomainDto,
  DmarcTopFailingIpDto,
} from './client'
import { asArray, formatDate } from './format'

/* ---------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------- */

function isAdminForbidden(error: unknown): boolean {
  return (error as AdminForbiddenDto | undefined)?.err === 'admin access required'
}

function formatNumber(value: number): string {
  return value.toLocaleString()
}

function formatPct(value: number): string {
  return `${value.toFixed(1)}%`
}

/** Carbon theme colors read from CSS custom properties for chart series. */
function useChartColors() {
  const read = (name: string, fallback: string) =>
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
  return {
    pass: read('--cds-support-success', '#42be65'),
    fail: read('--cds-support-error', '#da1e28'),
    warning: read('--cds-support-warning', '#f1c21b'),
    blue: read('--cds-link-primary', '#0f62fe'),
    grid: read('--cds-border-subtle-00', '#e0e0e0'),
    text: read('--cds-text-secondary', '#525252'),
  }
}

/* ---------------------------------------------------------------------------
 * KPI tile
 * ------------------------------------------------------------------------- */

interface KpiTileProps {
  label: string
  value: string
  subValue?: string
  kind?: 'default' | 'success' | 'danger'
}

function KpiTile({ label, value, subValue, kind = 'default' }: KpiTileProps) {
  return (
    <Tile className={`admin-kpi admin-kpi--${kind}`}>
      <div className="admin-kpi-value">{value}</div>
      <div className="admin-kpi-label">{label}</div>
      {subValue && <div className="admin-kpi-sub">{subValue}</div>}
    </Tile>
  )
}

/* ---------------------------------------------------------------------------
 * Section wrapper
 * ------------------------------------------------------------------------- */

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="admin-section">
      <div className="admin-section-header">
        <h3>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

/* ---------------------------------------------------------------------------
 * Main dashboard
 * ------------------------------------------------------------------------- */

const TIMELINE_OPTIONS = [
  { label: '7 days', value: '7' },
  { label: '30 days', value: '30' },
  { label: '90 days', value: '90' },
  { label: '180 days', value: '180' },
  { label: '365 days', value: '365' },
]

const DISPOSITION_COLORS: Record<string, string> = {
  none: '#42be65',
  quarantine: '#f1c21b',
  reject: '#da1e28',
}

export default function AdminDmarc() {
  const navigate = useNavigate()
  const colors = useChartColors()

  // Admin access: null = checking, true = admin, false = not admin
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)

  // Dashboard data
  const [overview, setOverview] = useState<DmarcStatsOverviewDto | null>(null)
  const [timeline, setTimeline] = useState<Array<DmarcTimelineEntryDto>>([])
  const [topFailingIps, setTopFailingIps] = useState<Array<DmarcTopFailingIpDto>>([])
  const [topFailingDomains, setTopFailingDomains] = useState<Array<DmarcTopFailingDomainDto>>([])
  const [domainStats, setDomainStats] = useState<Array<DmarcDomainStatsDto>>([])
  const [dispositionStats, setDispositionStats] = useState<Array<DmarcDispositionStatsDto>>([])
  const [reporterStats, setReporterStats] = useState<Array<DmarcReporterStatsDto>>([])
  const [reports, setReports] = useState<DmarcReportListDto | null>(null)

  // Controls
  const [timelineDays, setTimelineDays] = useState(30)
  const [reportsPageSize] = useState(25)
  const [reportsOffset, setReportsOffset] = useState(0)

  /* ---- Data loading ---- */

  const loadTimeline = useCallback(async (days: number) => {
    const { data, error } = await dmarcStatsControllerGetTimeline({ query: { days } })
    if (error) {
      handleApiError(error)
      return
    }
    if (data) setTimeline(asArray(data))
  }, [])

  const loadReportsPage = useCallback(async (offset: number) => {
    const { data, error } = await dmarcStatsControllerGetRecentReports({
      query: { limit: reportsPageSize, offset },
    })
    if (error) {
      handleApiError(error)
      return
    }
    if (data) {
      setReports(data)
      setReportsOffset(offset)
    }
  }, [reportsPageSize])

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const [
        overviewRes,
        timelineRes,
        ipsRes,
        failingDomainsRes,
        domainStatsRes,
        dispositionRes,
        reporterRes,
        reportsRes,
      ] = await Promise.all([
        dmarcStatsControllerGetOverview(),
        dmarcStatsControllerGetTimeline({ query: { days: timelineDays } }),
        dmarcStatsControllerGetTopFailingIps({ query: { limit: 20 } }),
        dmarcStatsControllerGetTopFailingDomains({ query: { limit: 20 } }),
        dmarcStatsControllerGetDomainStats(),
        dmarcStatsControllerGetDispositionStats(),
        dmarcStatsControllerGetReporterStats(),
        dmarcStatsControllerGetRecentReports({ query: { limit: reportsPageSize, offset: 0 } }),
      ])

      if (overviewRes.error) {
        if (isAdminForbidden(overviewRes.error)) {
          setIsAdmin(false)
          setLoading(false)
          return
        }
        handleApiError(overviewRes.error)
      }

      setIsAdmin(true)
      if (overviewRes.data) setOverview(overviewRes.data)
      if (timelineRes.data) setTimeline(asArray(timelineRes.data))
      if (ipsRes.data) setTopFailingIps(asArray(ipsRes.data))
      if (failingDomainsRes.data) setTopFailingDomains(asArray(failingDomainsRes.data))
      if (domainStatsRes.data) setDomainStats(asArray(domainStatsRes.data))
      if (dispositionRes.data) setDispositionStats(asArray(dispositionRes.data))
      if (reporterRes.data) setReporterStats(asArray(reporterRes.data))
      if (reportsRes.data) {
        setReports(reportsRes.data)
        setReportsOffset(0)
      }
    } catch (err) {
      console.error('Failed to load admin dashboard:', err)
    } finally {
      setLoading(false)
    }
  }, [timelineDays, reportsPageSize])

  useEffect(() => {
    loadDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---- Render: loading / forbidden states ---- */

  if (isAdmin === null || (loading && !overview)) {
    return (
      <div className="admin-page">
        <InlineLoading description="Checking admin access…" />
      </div>
    )
  }

  if (isAdmin === false) {
    return (
      <div className="admin-page">
        <InlineNotification
          kind="error"
          title="Admin access required"
          subtitle="Your account does not have administrator privileges. This page is only available to admin users."
          hideCloseButton
          lowContrast
        />
      </div>
    )
  }

  /* ---- Derived data for charts ---- */

  const pieData = dispositionStats.map((d) => ({
    name: d.disposition,
    value: d.messages,
  }))

  const passRate = overview?.passRate ?? 0
  const passRateKind = passRate >= 95 ? 'success' : passRate >= 80 ? 'default' : 'danger'

  /* ---- Table headers ---- */

  const failingIpHeaders = [
    { key: 'sourceIp', header: 'Source IP' },
    { key: 'failedMessages', header: 'Failed Messages' },
    { key: 'reports', header: 'Reports' },
    { key: 'domains', header: 'Domains' },
    { key: 'lastSeen', header: 'Last Seen' },
  ]

  const failingDomainHeaders = [
    { key: 'headerFrom', header: 'Header-From Domain' },
    { key: 'failedMessages', header: 'Failed Messages' },
    { key: 'reports', header: 'Reports' },
    { key: 'lastSeen', header: 'Last Seen' },
  ]

  const domainStatsHeaders = [
    { key: 'domain', header: 'Domain' },
    { key: 'reports', header: 'Reports' },
    { key: 'messages', header: 'Messages' },
    { key: 'pass', header: 'Pass' },
    { key: 'fail', header: 'Fail' },
    { key: 'passRate', header: 'Pass Rate' },
  ]

  const reporterHeaders = [
    { key: 'orgName', header: 'Reporter' },
    { key: 'reports', header: 'Reports' },
    { key: 'messages', header: 'Messages' },
    { key: 'pass', header: 'Pass' },
    { key: 'domainCount', header: 'Domains' },
  ]

  const reportsHeaders = [
    { key: 'receivedAt', header: 'Received' },
    { key: 'orgName', header: 'Reporter' },
    { key: 'domain', header: 'Domain' },
    { key: 'messageCount', header: 'Messages' },
    { key: 'passCount', header: 'Pass' },
    { key: 'policy', header: 'Policy' },
    { key: 'actions', header: '' },
  ]

  const totalReports = reports?.total ?? 0
  const totalPages = Math.ceil(totalReports / reportsPageSize)
  const currentPage = Math.floor(reportsOffset / reportsPageSize) + 1

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>DMARC Reports</h1>
          <p className="admin-page-subtitle">
            Aggregate DMARC report monitoring across all stored reports
          </p>
        </div>
        <Button
          kind="ghost"
          size="sm"
          renderIcon={Renew}
          disabled={loading}
          onClick={loadDashboard}
        >
          Refresh
        </Button>
      </div>

      {loading && <InlineLoading description="Loading dashboard…" />}

      {/* ---- KPI cards ---- */}
      {overview && (
        <Grid className="admin-kpi-grid">
          <Column lg={4} md={4} sm={2}>
            <KpiTile label="Total Reports" value={formatNumber(overview.totalReports)} />
          </Column>
          <Column lg={4} md={4} sm={2}>
            <KpiTile label="Total Messages" value={formatNumber(overview.totalMessages)} />
          </Column>
          <Column lg={4} md={4} sm={2}>
            <KpiTile
              label="Pass Rate"
              value={formatPct(overview.passRate)}
              subValue={`${formatNumber(overview.totalPass)} pass · ${formatNumber(overview.totalFail)} fail`}
              kind={passRateKind as 'success' | 'default' | 'danger'}
            />
          </Column>
          <Column lg={4} md={4} sm={2}>
            <KpiTile label="Domains" value={formatNumber(overview.domainCount)} />
          </Column>
          <Column lg={4} md={4} sm={2}>
            <KpiTile label="Reporters" value={formatNumber(overview.reporterCount)} />
          </Column>
          <Column lg={4} md={4} sm={2}>
            <KpiTile
              label="Date Range"
              value={
                overview.firstReport && overview.lastReport
                  ? `${new Date(overview.firstReport).toLocaleDateString()} – ${new Date(overview.lastReport).toLocaleDateString()}`
                  : '—'
              }
            />
          </Column>
        </Grid>
      )}

      {/* ---- Timeline chart ---- */}
      <Section
        title="Message Volume Over Time"
        action={
          <Dropdown
            id="timeline-days"
            titleText=""
            label="Period"
            size="sm"
            items={TIMELINE_OPTIONS}
            itemToString={(item) => item?.label ?? ''}
            selectedItem={TIMELINE_OPTIONS.find((o) => o.value === String(timelineDays)) ?? TIMELINE_OPTIONS[1]}
            onChange={({ selectedItem }) => {
              if (selectedItem) {
                const days = Number(selectedItem.value)
                setTimelineDays(days)
                loadTimeline(days)
              }
            }}
          />
        }
      >
        <div className="admin-chart">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={timeline} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: colors.text }}
                tickFormatter={(v: string) => v.slice(5)}
                minTickGap={30}
              />
              <YAxis tick={{ fontSize: 11, fill: colors.text }} width={48} />
              <Tooltip
                contentStyle={{
                  background: 'var(--cds-background-inverse, #161616)',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'var(--cds-text-inverse, #f4f4f4)',
                  fontSize: '0.8125rem',
                }}
                labelStyle={{ color: 'var(--cds-text-inverse, #f4f4f4)' }}
                formatter={(value, name) => [
                  formatNumber(Number(value)),
                  name === 'pass' ? 'Pass' : name === 'fail' ? 'Fail' : String(name),
                ]}
              />
              <Legend wrapperStyle={{ fontSize: '0.8125rem' }} />
              <Bar dataKey="pass" name="Pass" stackId="a" fill={colors.pass} radius={[0, 0, 0, 0]} />
              <Bar dataKey="fail" name="Fail" stackId="a" fill={colors.fail} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* ---- Reports per day (line chart) ---- */}
      <Section title="Reports Received Per Day">
        <div className="admin-chart">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={timeline} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: colors.text }}
                tickFormatter={(v: string) => v.slice(5)}
                minTickGap={30}
              />
              <YAxis tick={{ fontSize: 11, fill: colors.text }} width={40} />
              <Tooltip
                contentStyle={{
                  background: 'var(--cds-background-inverse, #161616)',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'var(--cds-text-inverse, #f4f4f4)',
                  fontSize: '0.8125rem',
                }}
                formatter={(value) => [formatNumber(Number(value)), 'Reports']}
              />
              <Line
                type="monotone"
                dataKey="reports"
                name="Reports"
                stroke={colors.blue}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <Grid>
        {/* ---- Disposition donut ---- */}
        <Column lg={8} md={8} sm={4}>
          <Section title="Disposition Breakdown">
            {pieData.length > 0 ? (
              <div className="admin-chart">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={DISPOSITION_COLORS[entry.name] ?? colors.text}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'var(--cds-background-inverse, #161616)',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'var(--cds-text-inverse, #f4f4f4)',
                        fontSize: '0.8125rem',
                      }}
                      formatter={(value, name) => [
                        formatNumber(Number(value)),
                        String(name),
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: '0.8125rem' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="admin-empty">No disposition data</p>
            )}
          </Section>
        </Column>

        {/* ---- Per-domain pass rate bars ---- */}
        <Column lg={8} md={8} sm={4}>
          <Section title="Pass Rate by Domain">
            {domainStats.length > 0 ? (
              <div className="admin-chart">
                <ResponsiveContainer width="100%" height={Math.max(200, domainStats.length * 36)}>
                  <BarChart
                    data={domainStats.slice(0, 15)}
                    layout="vertical"
                    margin={{ top: 8, right: 48, bottom: 0, left: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} horizontal={true} vertical={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: colors.text }} unit="%" />
                    <YAxis
                      type="category"
                      dataKey="domain"
                      tick={{ fontSize: 11, fill: colors.text }}
                      width={120}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--cds-background-inverse, #161616)',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'var(--cds-text-inverse, #f4f4f4)',
                        fontSize: '0.8125rem',
                      }}
                      formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Pass Rate']}
                    />
                    <Bar dataKey="passRate" name="Pass Rate" radius={[0, 4, 4, 0]}>
                      {domainStats.slice(0, 15).map((entry) => (
                        <Cell
                          key={entry.domain}
                          fill={entry.passRate >= 95 ? colors.pass : entry.passRate >= 80 ? colors.warning : colors.fail}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="admin-empty">No domain data</p>
            )}
          </Section>
        </Column>
      </Grid>

      <Grid>
        {/* ---- Top failing IPs ---- */}
        <Column lg={8} md={8} sm={4}>
          <Section title="Top Failing Source IPs">
            {topFailingIps.length > 0 ? (
              <DataTable
                rows={topFailingIps.map((ip, i) => ({ ...ip, id: ip.sourceIp || String(i) }))}
                headers={failingIpHeaders}
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
                            <TableCell className="admin-mono">{row.cells.find((c) => c.info.header === 'sourceIp')?.value}</TableCell>
                            <TableCell>
                              <Tag type="red" size="sm">{formatNumber(Number(row.cells.find((c) => c.info.header === 'failedMessages')?.value))}</Tag>
                            </TableCell>
                            <TableCell>{row.cells.find((c) => c.info.header === 'reports')?.value}</TableCell>
                            <TableCell className="admin-cell-domains">
                              {asArray(row.cells.find((c) => c.info.header === 'domains')?.value as unknown as string[]).map((d, i) => (
                                <Tag key={i} type="gray" size="sm">{d}</Tag>
                              ))}
                            </TableCell>
                            <TableCell>{formatDate(Number(row.cells.find((c) => c.info.header === 'lastSeen')?.value))}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </DataTable>
            ) : (
              <p className="admin-empty">No failing IPs — all messages pass DMARC</p>
            )}
          </Section>
        </Column>

        {/* ---- Top failing domains ---- */}
        <Column lg={8} md={8} sm={4}>
          <Section title="Top Failing Header-From Domains">
            {topFailingDomains.length > 0 ? (
              <DataTable
                rows={topFailingDomains.map((d, i) => ({ ...d, id: d.headerFrom || String(i) }))}
                headers={failingDomainHeaders}
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
                            <TableCell className="admin-mono">{row.cells.find((c) => c.info.header === 'headerFrom')?.value}</TableCell>
                            <TableCell>
                              <Tag type="red" size="sm">{formatNumber(Number(row.cells.find((c) => c.info.header === 'failedMessages')?.value))}</Tag>
                            </TableCell>
                            <TableCell>{row.cells.find((c) => c.info.header === 'reports')?.value}</TableCell>
                            <TableCell>{formatDate(Number(row.cells.find((c) => c.info.header === 'lastSeen')?.value))}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </DataTable>
            ) : (
              <p className="admin-empty">No failing domains — all messages pass DMARC</p>
            )}
          </Section>
        </Column>
      </Grid>

      {/* ---- Domain stats table ---- */}
      <Section title="Statistics per Domain">
        {domainStats.length > 0 ? (
          <DataTable
            rows={domainStats.map((d) => ({ ...d, id: d.domain }))}
            headers={domainStatsHeaders}
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
                    {rows.map((row) => {
                      const passRate = Number(row.cells.find((c) => c.info.header === 'passRate')?.value)
                      return (
                        <TableRow {...getRowProps({ row })}>
                          <TableCell className="admin-mono">{row.cells.find((c) => c.info.header === 'domain')?.value}</TableCell>
                          <TableCell>{row.cells.find((c) => c.info.header === 'reports')?.value}</TableCell>
                          <TableCell>{formatNumber(Number(row.cells.find((c) => c.info.header === 'messages')?.value))}</TableCell>
                          <TableCell>{formatNumber(Number(row.cells.find((c) => c.info.header === 'pass')?.value))}</TableCell>
                          <TableCell>{formatNumber(Number(row.cells.find((c) => c.info.header === 'fail')?.value))}</TableCell>
                          <TableCell>
                            <ProgressBar
                              value={passRate}
                              max={100}
                              label={`${passRate.toFixed(1)}%`}
                              hideLabel={false}
                              className="admin-progress"
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DataTable>
        ) : (
          <p className="admin-empty">No domain statistics</p>
        )}
      </Section>

      {/* ---- Reporter stats table ---- */}
      <Section title="Statistics per Reporter">
        {reporterStats.length > 0 ? (
          <DataTable
            rows={reporterStats.map((r) => ({ ...r, id: r.orgName }))}
            headers={reporterHeaders}
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
                        <TableCell>{row.cells.find((c) => c.info.header === 'orgName')?.value}</TableCell>
                        <TableCell>{row.cells.find((c) => c.info.header === 'reports')?.value}</TableCell>
                        <TableCell>{formatNumber(Number(row.cells.find((c) => c.info.header === 'messages')?.value))}</TableCell>
                        <TableCell>{formatNumber(Number(row.cells.find((c) => c.info.header === 'pass')?.value))}</TableCell>
                        <TableCell>{row.cells.find((c) => c.info.header === 'domainCount')?.value}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DataTable>
        ) : (
          <p className="admin-empty">No reporter statistics</p>
        )}
      </Section>

      {/* ---- Recent reports table ---- */}
      <Section title="Recent Reports">
        {reports && reports.reports.length > 0 ? (
          <>
            <DataTable
              rows={reports.reports.map((r) => ({ ...r, id: r.id }))}
              headers={reportsHeaders}
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
                      {rows.map((row) => {
                        return (
                          <TableRow {...getRowProps({ row })}>
                            <TableCell>{formatDate(Number(row.cells.find((c) => c.info.header === 'receivedAt')?.value))}</TableCell>
                            <TableCell>{row.cells.find((c) => c.info.header === 'orgName')?.value}</TableCell>
                            <TableCell className="admin-mono">{row.cells.find((c) => c.info.header === 'domain')?.value ?? '—'}</TableCell>
                            <TableCell>{formatNumber(Number(row.cells.find((c) => c.info.header === 'messageCount')?.value))}</TableCell>
                            <TableCell>{formatNumber(Number(row.cells.find((c) => c.info.header === 'passCount')?.value))}</TableCell>
                            <TableCell>
                              {(() => {
                                const policy = String(row.cells.find((c) => c.info.header === 'policy')?.value ?? '')
                                if (!policy) return '—'
                                return <Tag size="sm" type={policy === 'reject' ? 'red' : policy === 'quarantine' ? 'gray' : 'green'}>{policy}</Tag>
                              })()}
                            </TableCell>
                            <TableCell>
                              <Button
                                kind="ghost"
                                size="sm"
                                renderIcon={View}
                                hasIconOnly
                                iconDescription="View report"
                                onClick={() => navigate(`/admin/dmarc/reports/${row.id}`)}
                              />
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </DataTable>
            {totalPages > 1 && (
              <Pagination
                page={currentPage}
                pageSize={reportsPageSize}
                pageSizes={[25, 50, 100]}
                totalItems={totalReports}
                onChange={({ page, pageSize }) => {
                  loadReportsPage((page - 1) * pageSize)
                }}
              />
            )}
          </>
        ) : (
          <p className="admin-empty">No reports stored yet</p>
        )}
      </Section>
    </div>
  )
}
