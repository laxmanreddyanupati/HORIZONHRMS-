import type { ExpenseClaim, ExpenseFormInput, ExpenseStatus } from '@/types'
import { expenseCategories, expenseClaims } from '@/data/expenses'
import { apiRequest } from '@/lib/api-client'

export interface ExpenseFilters {
  status?: ExpenseStatus | 'all'
  employeeId?: string
  managerId?: string
  categoryId?: string
  search?: string
}

function upsertCategory(category: (typeof expenseCategories)[number]): void {
  const index = expenseCategories.findIndex((item) => item.id === category.id)
  if (index >= 0) expenseCategories[index] = category
  else expenseCategories.push(category)
}

function upsertClaim(claim: ExpenseClaim): ExpenseClaim {
  const index = expenseClaims.findIndex((item) => item.id === claim.id)
  if (index >= 0) expenseClaims[index] = claim
  else expenseClaims.unshift(claim)
  return claim
}

export async function fetchExpenseCategories() {
  const categories = await apiRequest<(typeof expenseCategories)>('/expenses/categories')
  categories.forEach(upsertCategory)
  return categories
}

export async function fetchExpenses(filters: ExpenseFilters = {}): Promise<ExpenseClaim[]> {
  const claims = await apiRequest<ExpenseClaim[]>('/expenses', {
    query: {
      status: filters.status,
      employeeId: filters.employeeId,
      managerId: filters.managerId,
      categoryId: filters.categoryId,
      search: filters.search,
    },
  })
  claims.forEach(upsertClaim)
  return claims
}

export async function createExpense(input: ExpenseFormInput): Promise<ExpenseClaim> {
  const claim = await apiRequest<ExpenseClaim>('/expenses', {
    method: 'POST',
    body: {
      employeeId: input.employeeId,
      categoryId: input.categoryId,
      title: input.title,
      amount: input.amount,
      date: input.date,
      description: input.description,
      receiptName: input.receiptName ?? null,
    },
  })
  return upsertClaim(claim)
}

export async function decideExpense(
  id: string,
  status: Extract<ExpenseStatus, 'Approved' | 'Rejected'>,
): Promise<ExpenseClaim> {
  const claim = await apiRequest<ExpenseClaim>(`/expenses/${encodeURIComponent(id)}/decision`, {
    method: 'POST',
    body: { status },
  })
  return upsertClaim(claim)
}

export async function reimburseExpense(id: string): Promise<ExpenseClaim> {
  const claim = await apiRequest<ExpenseClaim>(`/expenses/${encodeURIComponent(id)}/reimburse`, {
    method: 'POST',
  })
  return upsertClaim(claim)
}

export async function fetchExpenseSummary() {
  return apiRequest<{
    totalClaims: number
    totalAmount: number
    pendingCount: number
    pendingAmount: number
    approvedAmount: number
    reimbursedAmount: number
  }>('/expenses/summary')
}
