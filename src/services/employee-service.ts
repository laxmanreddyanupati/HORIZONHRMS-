import type {
  Employee,
  EmployeeFilterParams,
  EmployeeFormInput,
  PaginatedResult,
} from '@/types'
import { employees } from '@/data/employees'
import { apiRequest } from '@/lib/api-client'

export function nextEmployeeId(): string {
  const numericIds = employees
    .map((employee) => Number(employee.id.replace('HZT-', '')))
    .filter((value) => Number.isFinite(value))
  const next = Math.max(...numericIds, 0) + 1
  return `HZT-${String(next).padStart(4, '0')}`
}

/** Keeps the hydrated lookup arrays aligned with records written through the API. */
function syncEmployee(employee: Employee): Employee {
  const index = employees.findIndex((item) => item.id === employee.id)
  if (index >= 0) employees[index] = employee
  else employees.unshift(employee)
  return employee
}

function upsertRequest(source: Employee) {
  return {
    firstName: source.firstName,
    lastName: source.lastName,
    email: source.email,
    personalEmail: source.personalEmail,
    phone: source.phone,
    gender: source.gender,
    dateOfBirth: source.dateOfBirth,
    maritalStatus: source.maritalStatus,
    bloodGroup: source.bloodGroup,
    departmentId: source.departmentId,
    designationId: source.designationId,
    branchId: source.branchId,
    managerId: source.managerId,
    employmentType: source.employmentType,
    status: source.status,
    dateOfJoining: source.dateOfJoining,
    workLocation: source.workLocation,
    address: source.address,
    emergencyContactName: source.emergencyContacts[0]?.name ?? '',
    emergencyContactRelationship: source.emergencyContacts[0]?.relationship ?? '',
    emergencyContactPhone: source.emergencyContacts[0]?.phone ?? '',
    bank: source.bank,
    statutory: source.statutory,
    skills: source.skills,
  }
}

export async function fetchEmployees(params: EmployeeFilterParams = {}): Promise<PaginatedResult<Employee>> {
  const {
    search,
    departmentId,
    status,
    designationId,
    branchId,
    managerId,
    page = 1,
    pageSize = 10,
    sortBy = 'name',
    sortDir = 'asc',
  } = params

  const result = await apiRequest<PaginatedResult<Employee>>('/employees', {
    query: {
      search,
      departmentId,
      status,
      designationId,
      branchId,
      managerId,
      page,
      pageSize,
      sortBy,
      sortDir,
    },
  })

  result.data.forEach(syncEmployee)
  return result
}

export async function fetchEmployee(id: string): Promise<Employee> {
  const employee = await apiRequest<Employee>(`/employees/${encodeURIComponent(id)}`)
  return syncEmployee(employee)
}

export async function createEmployee(input: EmployeeFormInput): Promise<Employee> {
  const employee = await apiRequest<Employee>('/employees', {
    method: 'POST',
    body: {
      ...input,
      managerId: input.managerId ?? null,
      emergencyContactName: input.emergencyContactName,
      emergencyContactRelationship: input.emergencyContactRelationship,
      emergencyContactPhone: input.emergencyContactPhone,
    },
  })
  return syncEmployee(employee)
}

export async function updateEmployee(id: string, input: Partial<EmployeeFormInput>): Promise<Employee> {
  const current = await fetchEmployee(id)
  const merged: Employee = {
    ...current,
    ...input,
    managerId: input.managerId === undefined ? current.managerId : input.managerId,
    address: input.address ?? current.address,
    emergencyContacts: input.emergencyContactName
      ? [
          {
            id: current.emergencyContacts[0]?.id ?? `EC-${Date.now()}`,
            name: input.emergencyContactName,
            relationship: input.emergencyContactRelationship ?? 'Contact',
            phone: input.emergencyContactPhone ?? '',
          },
          ...current.emergencyContacts.slice(1),
        ]
      : current.emergencyContacts,
  }

  const employee = await apiRequest<Employee>(`/employees/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: upsertRequest(merged),
  })
  return syncEmployee(employee)
}

export async function setEmployeeStatus(id: string, status: Employee['status']): Promise<Employee> {
  const employee = await apiRequest<Employee>(`/employees/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: { status },
  })
  return syncEmployee(employee)
}

export async function fetchEmployeeCounts() {
  return apiRequest<{
    total: number
    active: number
    probation: number
    onLeave: number
    inactive: number
  }>('/employees/counts')
}
