import { useDeferredValue, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Banknote,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FilterX,
  MoreHorizontal,
  Plus,
  ReceiptText,
  Search,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { AvatarName } from '@/components/common/avatar-name'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { DataTable, type DataTableColumn } from '@/components/common/data-table'
import { DemoNotice } from '@/components/common/demo-notice'
import { ErrorState } from '@/components/common/error-state'
import { ExportButton } from '@/components/common/export-button'
import { PageHeader } from '@/components/common/page-header'
import { Pagination } from '@/components/common/pagination'
import { StatCard } from '@/components/common/stat-card'
import { StatusBadge } from '@/components/common/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRole } from '@/contexts/role-context'
import { employees } from '@/data/employees'
import { getCategoryName } from '@/data/expenses'
import { usePagination } from '@/hooks/use-pagination'
import { EXPENSE_REVIEW_ROLES } from '@/lib/constants'
import { downloadTextFile, formatCurrency, formatDate } from '@/lib/utils'
import {
  createExpense,
  decideExpense,
  fetchExpenseCategories,
  fetchExpenseSummary,
  fetchExpenses,
  reimburseExpense,
} from '@/services'
import type { ExpenseClaim, ExpenseFormInput, ExpenseStatus } from '@/types'
import { ExpenseDetailDialog, SubmitExpenseDialog, type ExpenseEmployeeOption } from './expense-dialogs'

type ExpenseTab = 'all' | 'team' | 'mine' | 'categories'

type ReviewAction = 'approve' | 'reject' | 'reimburse'

interface ReviewTarget {
  claim: ExpenseClaim
  action: ReviewAction
}

interface ExpenseSummaryShape {
  totalClaims: number
  totalAmount: number
  pendingCount: number
  pendingAmount: number
  approvedAmount: number
  reimbursedAmount: number
}

const employeeDirectory = new Map(employees.map((employee) => [employee.id, employee]))

function employeeNameFor(employeeId: string): string {
  const employee = employeeDirectory.get(employeeId)
  return employee ? `${employee.firstName} ${employee.lastName}` : employeeId
}

function summarizeClaims(claims: ExpenseClaim[]): ExpenseSummaryShape {
  return claims.reduce<ExpenseSummaryShape>(
    (summary, claim) => {
      summary.totalClaims += 1
      summary.totalAmount += claim.amount
      if (claim.status === 'Pending') {
        summary.pendingCount += 1
        summary.pendingAmount += claim.amount
      }
      if (claim.status === 'Approved') summary.approvedAmount += claim.amount
      if (claim.status === 'Reimbursed') summary.reimbursedAmount += claim.amount
      return summary
    },
    {
      totalClaims: 0,
      totalAmount: 0,
      pendingCount: 0,
      pendingAmount: 0,
      approvedAmount: 0,
      reimbursedAmount: 0,
    },
  )
}

export function ExpensesPage() {
  const { role, persona } = useRole()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()

  const selfId = persona.employeeId
  const isEmployee = role === 'employee'
  const isManager = role === 'manager'
  const isOrgWide = !isEmployee && !isManager
  const canReview = EXPENSE_REVIEW_ROLES.includes(role)

  const organizationQuery = useQuery({
    queryKey: ['expenses', 'organization'],
    queryFn: () => fetchExpenses(),
    enabled: isOrgWide,
  })

  const teamQuery = useQuery({
    queryKey: ['expenses', 'team', selfId],
    queryFn: () => fetchExpenses({ managerId: selfId ?? undefined }),
    enabled: isManager,
  })

  const selfQuery = useQuery({
    queryKey: ['expenses', 'self', selfId],
    queryFn: () => fetchExpenses({ employeeId: selfId ?? undefined }),
    enabled: Boolean(selfId),
  })

  const categoriesQuery = useQuery({
    queryKey: ['expense-categories'],
    queryFn: fetchExpenseCategories,
  })

  const summaryQuery = useQuery({
    queryKey: ['expense-summary'],
    queryFn: fetchExpenseSummary,
    enabled: isOrgWide,
  })

  const categories = categoriesQuery.data ?? []

  const baseClaims = useMemo(() => {
    if (isEmployee) return selfQuery.data ?? []
    if (isManager) return [...(teamQuery.data ?? []), ...(selfQuery.data ?? [])]
    return organizationQuery.data ?? []
  }, [isEmployee, isManager, organizationQuery.data, selfQuery.data, teamQuery.data])

  const summary = isOrgWide && summaryQuery.data ? summaryQuery.data : summarizeClaims(baseClaims)

  const visibleTabs: Array<{ key: ExpenseTab; label: string }> = isManager
    ? [
        { key: 'team', label: 'Team claims' },
        { key: 'mine', label: 'My claims' },
        { key: 'categories', label: 'Categories' },
      ]
    : isEmployee
      ? [
          { key: 'mine', label: 'My claims' },
          { key: 'categories', label: 'Categories' },
        ]
      : selfId
        ? [
            { key: 'all', label: 'All claims' },
            { key: 'mine', label: 'My claims' },
            { key: 'categories', label: 'Categories' },
          ]
        : [
            { key: 'all', label: 'All claims' },
            { key: 'categories', label: 'Categories' },
          ]

  const defaultTab: ExpenseTab = isManager ? 'team' : isEmployee ? 'mine' : 'all'
  const [activeTab, setActiveTab] = useState<ExpenseTab>(defaultTab)
  const currentTab = visibleTabs.some((tab) => tab.key === activeTab) ? activeTab : defaultTab

  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const [submitOpen, setSubmitOpen] = useState(() => searchParams.get('action') === 'new')
  const [detailClaim, setDetailClaim] = useState<ExpenseClaim | null>(null)
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null)

  const tableClaims = useMemo(() => {
    if (currentTab === 'team') return teamQuery.data ?? []
    if (currentTab === 'mine') return selfQuery.data ?? []
    if (currentTab === 'all') return organizationQuery.data ?? []
    return []
  }, [currentTab, organizationQuery.data, selfQuery.data, teamQuery.data])

  const filteredClaims = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase()
    return tableClaims.filter((claim) => {
      if (statusFilter !== 'all' && claim.status !== statusFilter) return false
      if (categoryFilter !== 'all' && claim.categoryId !== categoryFilter) return false
      if (!query) return true
      return (
        claim.title.toLowerCase().includes(query) ||
        claim.description.toLowerCase().includes(query) ||
        claim.id.toLowerCase().includes(query) ||
        getCategoryName(claim.categoryId).toLowerCase().includes(query) ||
        employeeNameFor(claim.employeeId).toLowerCase().includes(query) ||
        claim.employeeId.toLowerCase().includes(query)
      )
    })
  }, [tableClaims, deferredSearch, statusFilter, categoryFilter])

  const { page, pageSize, total, totalPages, setPage, setPageSize, pageItems } = usePagination(
    filteredClaims,
    10,
  )

  const activeQuery =
    currentTab === 'team' ? teamQuery : currentTab === 'mine' ? selfQuery : organizationQuery

  const submitEmployees = useMemo(() => {
    if (isEmployee || role === 'payroll-admin') return employees.filter((employee) => employee.id === selfId)
    if (isManager) {
      return employees.filter((employee) => employee.id === selfId || employee.managerId === selfId)
    }
    return employees
  }, [isEmployee, isManager, role, selfId])

  const submitEmployeeOptions: ExpenseEmployeeOption[] = submitEmployees.map((employee) => ({
    id: employee.id,
    name: `${employee.firstName} ${employee.lastName}`,
  }))

  const defaultSubmitEmployeeId =
    submitEmployees.find((employee) => employee.id === selfId)?.id ?? submitEmployees[0]?.id ?? ''

  const hasFilters = search !== '' || statusFilter !== 'all' || categoryFilter !== 'all'

  const resetFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setCategoryFilter('all')
    setPage(1)
  }

  const createMutation = useMutation({
    mutationFn: createExpense,
    onSuccess: (claim) => {
      toast.success('Expense claim submitted', {
        description: `${claim.id} · ${formatCurrency(claim.amount)} is now Pending review.`,
      })
      void queryClient.invalidateQueries({ queryKey: ['expenses'] })
      void queryClient.invalidateQueries({ queryKey: ['expense-summary'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (error: Error) => toast.error('Could not submit the claim', { description: error.message }),
  })

  const reviewMutation = useMutation({
    mutationFn: ({ claim, action }: ReviewTarget) =>
      action === 'reimburse'
        ? reimburseExpense(claim.id)
        : decideExpense(claim.id, action === 'approve' ? 'Approved' : 'Rejected'),
    onSuccess: (claim, target) => {
      const title =
        target.action === 'approve'
          ? 'Claim approved'
          : target.action === 'reject'
            ? 'Claim rejected'
            : 'Claim marked reimbursed'
      toast.success(title, {
        description: `${claim.id} · ${formatCurrency(claim.amount)}.`,
      })
      void queryClient.invalidateQueries({ queryKey: ['expenses'] })
      void queryClient.invalidateQueries({ queryKey: ['expense-summary'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setReviewTarget(null)
    },
    onError: (error: Error) => toast.error('Could not update the claim', { description: error.message }),
  })

  const handleCreateExpense = async (input: ExpenseFormInput) => {
    await createMutation.mutateAsync(input)
  }

  const handleDownloadReceipt = (claim: ExpenseClaim) => {
    const content = [
      'HORIZON TECHNOLOGIES PVT. LTD. — EXPENSE CLAIM SUMMARY',
      'This summary is generated from the HRMS expense record. It is not the original receipt.',
      '',
      `Claim ID: ${claim.id}`,
      `Employee: ${employeeNameFor(claim.employeeId)} (${claim.employeeId})`,
      `Category: ${getCategoryName(claim.categoryId)}`,
      `Title: ${claim.title}`,
      `Amount: ${formatCurrency(claim.amount)}`,
      `Expense date: ${formatDate(claim.date)}`,
      `Submitted on: ${formatDate(claim.submittedOn)}`,
      `Status: ${claim.status}`,
      `Receipt reference: ${claim.receiptName ?? 'Not provided'}`,
      '',
      `Description: ${claim.description}`,
    ].join('\n')

    downloadTextFile(`${claim.id}-claim-summary.txt`, content)
    toast.success('Claim summary downloaded', {
      description: `${claim.id} · ${claim.receiptName ?? 'no receipt attached'}`,
    })
  }

  const canDecide = (claim: ExpenseClaim) =>
    canReview && claim.employeeId !== selfId && claim.status === 'Pending'

  const canReimburse = (claim: ExpenseClaim) =>
    canReview && claim.employeeId !== selfId && claim.status === 'Approved'

  const columns: Array<DataTableColumn<ExpenseClaim>> = [
    {
      key: 'employee',
      header: 'Employee',
      cell: (claim) => {
        const employee = employeeDirectory.get(claim.employeeId)
        return (
          <AvatarName
            firstName={employee?.firstName ?? 'Unknown'}
            lastName={employee?.lastName ?? ''}
            subtitle={claim.employeeId}
          />
        )
      },
    },
    {
      key: 'claim',
      header: 'Claim',
      cell: (claim) => (
        <div className="max-w-64">
          <p className="truncate font-medium text-slate-700">{claim.title}</p>
          <p className="truncate text-[11px] text-slate-400">
            {getCategoryName(claim.categoryId)} · {claim.id}
          </p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      cell: (claim) => <span className="font-medium tabular-nums text-foreground">{formatCurrency(claim.amount)}</span>,
    },
    {
      key: 'date',
      header: 'Expense date',
      cell: (claim) => <span className="text-slate-600">{formatDate(claim.date)}</span>,
    },
    {
      key: 'submitted',
      header: 'Submitted',
      cell: (claim) => <span className="text-slate-600">{formatDate(claim.submittedOn)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (claim) => <StatusBadge status={claim.status} />,
    },
    {
      key: 'receipt',
      header: 'Receipt',
      cell: (claim) =>
        claim.receiptName ? (
          <Button
            variant="ghost"
            size="sm"
            className="max-w-44 justify-start px-1.5 text-slate-600"
            onClick={(event) => {
              event.stopPropagation()
              handleDownloadReceipt(claim)
            }}
            title={claim.receiptName}
          >
            <Download />
            <span className="truncate">{claim.receiptName}</span>
          </Button>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (claim) => (
        <div onClick={(event) => event.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Actions for claim ${claim.id}`}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => setDetailClaim(claim)}>
                <Eye />
                View details
              </DropdownMenuItem>
              {claim.receiptName ? (
                <DropdownMenuItem onClick={() => handleDownloadReceipt(claim)}>
                  <Download />
                  Download summary
                </DropdownMenuItem>
              ) : null}
              {canDecide(claim) || canReimburse(claim) ? <DropdownMenuSeparator /> : null}
              {canDecide(claim) ? (
                <DropdownMenuItem onClick={() => setReviewTarget({ claim, action: 'approve' })}>
                  <CheckCircle2 />
                  Approve claim
                </DropdownMenuItem>
              ) : null}
              {canDecide(claim) ? (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setReviewTarget({ claim, action: 'reject' })}
                >
                  <XCircle />
                  Reject claim
                </DropdownMenuItem>
              ) : null}
              {canReimburse(claim) ? (
                <DropdownMenuItem onClick={() => setReviewTarget({ claim, action: 'reimburse' })}>
                  <Banknote />
                  Mark reimbursed
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ]

  const exportClaims = currentTab === 'categories' ? baseClaims : filteredClaims
  const exportRows = exportClaims.map((claim) => ({
    'Claim ID': claim.id,
    Employee: employeeNameFor(claim.employeeId),
    'Employee ID': claim.employeeId,
    Category: getCategoryName(claim.categoryId),
    Title: claim.title,
    Amount: claim.amount,
    'Expense Date': claim.date,
    Submitted: claim.submittedOn,
    Status: claim.status,
    Receipt: claim.receiptName ?? '',
    'Approved By': claim.approvedBy ?? '',
  }))

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={isManager ? 'Team expenses' : isEmployee ? 'Self service' : 'Finance operations'}
        title="Expenses"
        description={
          isEmployee
            ? 'Submit reimbursement claims and follow their approval status.'
            : isManager
              ? 'Review direct-report expense claims and keep track of your own reimbursements.'
              : 'Review expense claims across the organisation, record decisions and track reimbursements.'
        }
        actions={
          <>
            <ExportButton filename="horizon-expense-claims.csv" rows={exportRows} />
            <Button onClick={() => setSubmitOpen(true)}>
              <Plus />
              Submit expense
            </Button>
          </>
        }
      />

      <DemoNotice>
        Expense claims are stored in the HRMS database. Approval and reimbursement statuses are recorded here; actual
        payment is handled outside this application.
      </DemoNotice>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total claims"
          value={summary.totalClaims}
          hint={`${formatCurrency(summary.totalAmount)} claimed in this scope`}
          icon={ReceiptText}
        />
        <StatCard
          label="Pending review"
          value={summary.pendingCount}
          hint={`${formatCurrency(summary.pendingAmount)} awaiting decision`}
          icon={Clock3}
          iconClassName="bg-amber-50 text-amber-600"
        />
        <StatCard
          label="Approved amount"
          value={formatCurrency(summary.approvedAmount)}
          hint="Approved, awaiting reimbursement"
          icon={CheckCircle2}
          iconClassName="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Reimbursed amount"
          value={formatCurrency(summary.reimbursedAmount)}
          hint="Reimbursements recorded"
          icon={Banknote}
          iconClassName="bg-violet-50 text-violet-600"
        />
      </div>

      <Tabs
        value={currentTab}
        onValueChange={(value) => {
          setActiveTab(value as ExpenseTab)
          setPage(1)
        }}
      >
        <TabsList className="w-fit max-w-full">
          {visibleTabs.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={currentTab}>
          {currentTab === 'categories' ? (
            categoriesQuery.isError ? (
              <ErrorState
                title="Categories could not be loaded"
                description="The service could not load expense categories. Please retry."
                onRetry={() => void categoriesQuery.refetch()}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {categoriesQuery.isLoading
                  ? Array.from({ length: 6 }).map((_, index) => (
                      <Card key={`category-skeleton-${index}`} className="p-5">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="mt-3 h-3 w-full" />
                        <Skeleton className="mt-2 h-3 w-4/5" />
                        <Skeleton className="mt-5 h-8 w-24" />
                      </Card>
                    ))
                  : categories.map((category) => {
                      const categoryClaims = baseClaims.filter((claim) => claim.categoryId === category.id)
                      const categoryAmount = categoryClaims.reduce((sum, claim) => sum + claim.amount, 0)
                      return (
                        <Card key={category.id}>
                          <CardHeader className="flex-row items-start justify-between gap-3">
                            <div className="min-w-0">
                              <CardTitle>{category.name}</CardTitle>
                              <p className="mt-0.5 text-[11px] text-slate-400">Per-claim limit</p>
                            </div>
                            <span className="shrink-0 rounded-md bg-primary-50 px-2 py-1 text-[11.5px] font-semibold text-primary-700">
                              {formatCurrency(category.limit)}
                            </span>
                          </CardHeader>
                          <CardContent>
                            <p className="min-h-10 text-[12px] leading-relaxed text-slate-500">{category.description}</p>
                            <div className="mt-4 flex items-end justify-between gap-3 border-t border-border pt-3">
                              <div>
                                <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">
                                  Claims in scope
                                </p>
                                <p className="mt-0.5 text-[13px] font-medium text-slate-700">
                                  {categoryClaims.length} claim{categoryClaims.length === 1 ? '' : 's'}
                                </p>
                              </div>
                              <p className="text-[13px] font-semibold tabular-nums text-foreground">
                                {formatCurrency(categoryAmount)}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
              </div>
            )
          ) : (
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
                    placeholder="Search by employee, claim, category or claim ID…"
                    className="pl-9"
                    aria-label="Search expense claims"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  <Select
                    value={statusFilter}
                    onValueChange={(value) => {
                      setStatusFilter(value as ExpenseStatus | 'all')
                      setPage(1)
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-36" aria-label="Filter by claim status">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                      <SelectItem value="Reimbursed">Reimbursed</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={categoryFilter}
                    onValueChange={(value) => {
                      setCategoryFilter(value)
                      setPage(1)
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-48" aria-label="Filter by expense category">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {hasFilters ? (
                    <Button variant="ghost" size="sm" onClick={resetFilters} className="col-span-2 sm:col-span-1">
                      <FilterX />
                      Clear
                    </Button>
                  ) : null}
                </div>
              </div>

              <DataTable
                columns={columns}
                data={pageItems}
                rowKey={(claim) => claim.id}
                isLoading={activeQuery.isLoading}
                isError={activeQuery.isError}
                onRetry={() => void activeQuery.refetch()}
                onRowClick={(claim) => setDetailClaim(claim)}
                emptyTitle={hasFilters ? 'No claims match these filters' : 'No expense claims yet'}
                emptyDescription={
                  hasFilters
                    ? 'Try a different search term or clear one of the filters.'
                    : 'Submit the first claim to start the approval flow.'
                }
                emptyAction={
                  hasFilters ? (
                    <Button variant="outline" size="sm" onClick={resetFilters}>
                      <FilterX />
                      Clear filters
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => setSubmitOpen(true)}>
                      <Plus />
                      Submit expense
                    </Button>
                  )
                }
                footer={
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    total={total}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                    itemLabel="claims"
                  />
                }
              />
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <SubmitExpenseDialog
        key={`${submitOpen ? 'open' : 'closed'}-${defaultSubmitEmployeeId}`}
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        categories={categories}
        employees={submitEmployeeOptions}
        defaultEmployeeId={defaultSubmitEmployeeId}
        lockEmployee={submitEmployees.length <= 1}
        onSubmit={handleCreateExpense}
      />

      <ExpenseDetailDialog
        open={Boolean(detailClaim)}
        onOpenChange={(open) => {
          if (!open) setDetailClaim(null)
        }}
        claim={detailClaim}
        employeeName={detailClaim ? employeeNameFor(detailClaim.employeeId) : ''}
        categoryName={detailClaim ? getCategoryName(detailClaim.categoryId) : ''}
        approverName={detailClaim?.approvedBy ? employeeNameFor(detailClaim.approvedBy) : undefined}
        canReview={canReview}
        isOwnClaim={Boolean(detailClaim && detailClaim.employeeId === selfId)}
        onDownloadReceipt={handleDownloadReceipt}
        onApprove={(claim) => {
          setDetailClaim(null)
          setReviewTarget({ claim, action: 'approve' })
        }}
        onReject={(claim) => {
          setDetailClaim(null)
          setReviewTarget({ claim, action: 'reject' })
        }}
        onReimburse={(claim) => {
          setDetailClaim(null)
          setReviewTarget({ claim, action: 'reimburse' })
        }}
      />

      <ConfirmDialog
        open={Boolean(reviewTarget)}
        onOpenChange={(open) => {
          if (!open) setReviewTarget(null)
        }}
        title={
          reviewTarget?.action === 'approve'
            ? 'Approve this expense claim?'
            : reviewTarget?.action === 'reject'
              ? 'Reject this expense claim?'
              : 'Mark this claim as reimbursed?'
        }
        description={
          reviewTarget ? (
            <>
              <span className="font-medium text-slate-700">{reviewTarget.claim.title}</span> ·{' '}
              {formatCurrency(reviewTarget.claim.amount)} · {employeeNameFor(reviewTarget.claim.employeeId)}. This
              decision is recorded in the system. Reimbursement does not trigger an actual bank transfer.
            </>
          ) : null
        }
        confirmLabel={
          reviewTarget?.action === 'approve'
            ? 'Approve claim'
            : reviewTarget?.action === 'reject'
              ? 'Reject claim'
              : 'Mark reimbursed'
        }
        destructive={reviewTarget?.action === 'reject'}
        onConfirm={async () => {
          if (!reviewTarget) return
          await reviewMutation.mutateAsync(reviewTarget)
        }}
      />

      <p className="text-[10.5px] text-slate-400">
        Expense decisions are stored with the claim. Reimbursement status does not move money from this application.
      </p>
    </div>
  )
}
