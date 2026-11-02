import { useDeferredValue, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FilterX, RefreshCw, Search } from 'lucide-react'
import { DataTable, type DataTableColumn } from '@/components/common/data-table'
import { DemoNotice } from '@/components/common/demo-notice'
import { DetailItem, DetailList } from '@/components/common/detail-list'
import { ExportButton } from '@/components/common/export-button'
import { PageHeader } from '@/components/common/page-header'
import { Pagination } from '@/components/common/pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { auditLogs } from '@/data/audit'
import { fetchAuditLogs } from '@/services'
import { formatDateTime } from '@/lib/utils'
import type { AuditLog } from '@/types'

export function AuditLogsPage() {
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [moduleFilter, setModuleFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  const moduleOptions = useMemo(
    () => Array.from(new Set(auditLogs.map((log) => log.module))).sort((a, b) => a.localeCompare(b)),
    [],
  )

  const logsQuery = useQuery({
    queryKey: ['audit-logs', { module: moduleFilter, search: deferredSearch }],
    queryFn: () => fetchAuditLogs({ module: moduleFilter, search: deferredSearch }),
  })

  const logs = logsQuery.data ?? []
  const totalPages = Math.max(1, Math.ceil(logs.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const rows = logs.slice((safePage - 1) * pageSize, safePage * pageSize)

  const resetFilters = () => {
    setSearch('')
    setModuleFilter('all')
    setPage(1)
  }

  const hasFilters = search !== '' || moduleFilter !== 'all'

  const columns: Array<DataTableColumn<AuditLog>> = [
    {
      key: 'actor',
      header: 'Actor',
      cell: (log) => (
        <div className="max-w-48">
          <p className="truncate font-medium text-slate-700">{log.actor}</p>
          <p className="truncate text-[11px] text-slate-400">{log.actorRole}</p>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      cell: (log) => <span className="block max-w-64 whitespace-normal text-[12.5px] text-slate-700">{log.action}</span>,
    },
    {
      key: 'module',
      header: 'Module',
      cell: (log) => <Badge variant="outline">{log.module}</Badge>,
    },
    {
      key: 'target',
      header: 'Target',
      cell: (log) => (
        <span className="block max-w-56 truncate text-[12px] text-slate-500" title={log.target}>
          {log.target}
        </span>
      ),
    },
    {
      key: 'timestamp',
      header: 'Timestamp',
      cell: (log) => <span className="text-[12px] text-slate-500">{formatDateTime(log.timestamp)}</span>,
    },
    {
      key: 'ip',
      header: 'IP address',
      cell: (log) => <span className="font-mono text-[11.5px] text-slate-500">{log.ipAddress}</span>,
    },
  ]

  const exportRows = logs.map((log) => ({
    'Event ID': log.id,
    Actor: log.actor,
    Role: log.actorRole,
    Action: log.action,
    Module: log.module,
    Target: log.target,
    Timestamp: log.timestamp,
    'IP address': log.ipAddress,
  }))

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Administration"
        title="Audit logs"
        description="Read-only activity history for administrative changes."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => void logsQuery.refetch()} disabled={logsQuery.isFetching}>
              <RefreshCw className={logsQuery.isFetching ? 'animate-spin' : undefined} />
              Refresh
            </Button>
            <ExportButton filename="horizon-audit-logs.csv" rows={exportRows} disabled={logs.length === 0} />
          </>
        }
      />

      <DemoNotice>
        Audit events are recorded by the HRMS API for administrative actions. The trail is read-only in the
        application.
      </DemoNotice>

      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Search by actor, action or target…"
              className="pl-9"
              aria-label="Search audit logs"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select
              value={moduleFilter}
              onValueChange={(value) => {
                setModuleFilter(value)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full sm:w-48" aria-label="Filter by module">
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All modules</SelectItem>
                {moduleOptions.map((module) => (
                  <SelectItem key={module} value={module}>
                    {module}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasFilters ? (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <FilterX />
                Clear
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <p className="text-[11.5px] text-slate-500">
            <span className="font-medium text-slate-700">{logs.length}</span> matching event
            {logs.length === 1 ? '' : 's'}
          </p>
          <p className="text-[10.5px] text-slate-400">Select a row to view full event metadata</p>
        </div>

        <DataTable
          columns={columns}
          data={rows}
          rowKey={(log) => log.id}
          isLoading={logsQuery.isLoading}
          isError={logsQuery.isError}
          onRetry={() => void logsQuery.refetch()}
          onRowClick={(log) => setSelectedLog(log)}
          emptyTitle={hasFilters ? 'No audit events match these filters' : 'No audit events yet'}
          emptyDescription={
            hasFilters
              ? 'Try a different search term or module, or clear the filters.'
              : 'Audit events will appear here once records exist.'
          }
          emptyAction={
            hasFilters ? (
              <Button variant="outline" size="sm" onClick={resetFilters}>
                <FilterX />
                Clear filters
              </Button>
            ) : undefined
          }
          footer={
            <Pagination
              page={safePage}
              totalPages={totalPages}
              total={logs.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setPage(1)
              }}
              itemLabel="events"
            />
          }
          skeletonRows={8}
        />
      </Card>

      <Dialog open={Boolean(selectedLog)} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit event {selectedLog?.id}</DialogTitle>
            <DialogDescription>
              Full metadata for this audit record. The event is read-only.
            </DialogDescription>
          </DialogHeader>

          {selectedLog ? (
            <div className="space-y-4">
              <DetailList>
                <DetailItem label="Actor">{selectedLog.actor}</DetailItem>
                <DetailItem label="Actor role">{selectedLog.actorRole}</DetailItem>
                <DetailItem label="Action">{selectedLog.action}</DetailItem>
                <DetailItem label="Module">
                  <Badge variant="outline">{selectedLog.module}</Badge>
                </DetailItem>
                <DetailItem label="Target">{selectedLog.target}</DetailItem>
                <DetailItem label="IP address">
                  <span className="font-mono">{selectedLog.ipAddress}</span>
                </DetailItem>
                <DetailItem label="Timestamp (local display)">{formatDateTime(selectedLog.timestamp)}</DetailItem>
                <DetailItem label="Recorded timestamp (raw)">{selectedLog.timestamp}</DetailItem>
              </DetailList>

              <div>
                <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">
                  Event metadata
                </p>
                <pre className="scrollbar-thin max-h-56 overflow-auto rounded-lg border border-border bg-slate-50 p-3 font-mono text-[11px] leading-relaxed text-slate-600">
                  {JSON.stringify(selectedLog, null, 2)}
                </pre>
              </div>

              <div className="rounded-lg border border-sky-100 bg-sky-50/70 px-3 py-2 text-[11.5px] leading-relaxed text-sky-800">
                This audit screen is read-only. Retention rules and tamper-evident hashing are deployment concerns and
                are not implemented in the current backend.
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedLog(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
