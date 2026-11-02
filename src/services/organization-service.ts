import type { Branch, Department, Designation, Employee, OrgNode } from '@/types'
import { branches, departments } from '@/data/organization'
import { designations } from '@/data/designations'
import { apiRequest } from '@/lib/api-client'

export interface DepartmentWithStats extends Department {
  employeeCount: number
  openRoles: number
}

interface DepartmentDto extends Omit<Department, 'headId'> {
  headId: string | null
  employeeCount: number
  openRoles: number
}

interface BranchDto extends Branch {
  employeeCount: number
}

type DesignationDto = Designation & { employeeCount: number }

function replaceAt<T extends { id: string }>(target: T[], item: T): T {
  const index = target.findIndex((entry) => entry.id === item.id)
  if (index >= 0) target[index] = item
  else target.push(item)
  return item
}

function removeAt<T extends { id: string }>(target: T[], id: string): void {
  const index = target.findIndex((entry) => entry.id === id)
  if (index >= 0) target.splice(index, 1)
}

function toDepartment(dto: DepartmentDto): DepartmentWithStats {
  return { ...dto, headId: dto.headId ?? '' }
}

export async function fetchDepartmentStats(): Promise<DepartmentWithStats[]> {
  const result = await apiRequest<DepartmentDto[]>('/organization/departments')
  return result.map(toDepartment)
}

export async function createDepartment(input: {
  name: string
  code: string
  description: string
  headId: string
  location: string
  email: string
}): Promise<Department> {
  const dto = await apiRequest<DepartmentDto>('/organization/departments', {
    method: 'POST',
    body: input,
  })
  const department = toDepartment(dto)
  replaceAt(departments, department)
  return department
}

export async function updateDepartment(id: string, input: Partial<Department>): Promise<Department> {
  const current = departments.find((item) => item.id === id)
  const fallback = current ?? (await fetchDepartmentStats()).find((item) => item.id === id)
  if (!fallback) throw new Error('Department not found')
  const merged = { ...fallback, ...input }

  const dto = await apiRequest<DepartmentDto>(`/organization/departments/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: {
      name: merged.name,
      code: merged.code,
      description: merged.description,
      headId: merged.headId || null,
      parentId: merged.parentId,
      location: merged.location,
      email: merged.email,
    },
  })
  const department = toDepartment(dto)
  replaceAt(departments, department)
  return department
}

export async function deleteDepartment(id: string): Promise<void> {
  await apiRequest<void>(`/organization/departments/${encodeURIComponent(id)}`, { method: 'DELETE' })
  removeAt(departments, id)
}

export async function fetchDesignationStats(): Promise<Array<Designation & { employeeCount: number }>> {
  return apiRequest<DesignationDto[]>('/organization/designations')
}

export async function createDesignation(input: Omit<Designation, 'id'>): Promise<Designation> {
  const dto = await apiRequest<DesignationDto>('/organization/designations', {
    method: 'POST',
    body: input,
  })
  const designation: Designation = {
    id: dto.id,
    title: dto.title,
    departmentId: dto.departmentId,
    level: dto.level,
    grade: dto.grade,
  }
  replaceAt(designations, designation)
  return designation
}

export async function updateDesignation(id: string, input: Partial<Designation>): Promise<Designation> {
  const current = designations.find((item) => item.id === id)
  const fallback = current ?? (await fetchDesignationStats()).find((item) => item.id === id)
  if (!fallback) throw new Error('Designation not found')
  const merged = { ...fallback, ...input }

  const dto = await apiRequest<DesignationDto>(`/organization/designations/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: {
      title: merged.title,
      departmentId: merged.departmentId,
      level: merged.level,
      grade: merged.grade,
    },
  })
  const designation: Designation = {
    id: dto.id,
    title: dto.title,
    departmentId: dto.departmentId,
    level: dto.level,
    grade: dto.grade,
  }
  replaceAt(designations, designation)
  return designation
}

export async function deleteDesignation(id: string): Promise<void> {
  await apiRequest<void>(`/organization/designations/${encodeURIComponent(id)}`, { method: 'DELETE' })
  removeAt(designations, id)
}

export async function fetchBranchStats(): Promise<Array<Branch & { employeeCount: number }>> {
  return apiRequest<BranchDto[]>('/organization/branches')
}

export async function createBranch(input: Omit<Branch, 'id'>): Promise<Branch> {
  const dto = await apiRequest<BranchDto>('/organization/branches', {
    method: 'POST',
    body: input,
  })
  const branch: Branch = {
    id: dto.id,
    name: dto.name,
    address: dto.address,
    city: dto.city,
    state: dto.state,
    phone: dto.phone,
    headId: dto.headId,
    isHeadquarters: dto.isHeadquarters,
  }
  replaceAt(branches, branch)
  return branch
}

export async function updateBranch(id: string, input: Partial<Branch>): Promise<Branch> {
  const current = branches.find((item) => item.id === id)
  const fallback = current ?? (await fetchBranchStats()).find((item) => item.id === id)
  if (!fallback) throw new Error('Branch not found')
  const merged = { ...fallback, ...input }

  const dto = await apiRequest<BranchDto>(`/organization/branches/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: {
      name: merged.name,
      address: merged.address,
      city: merged.city,
      state: merged.state,
      phone: merged.phone,
      headId: merged.headId,
      isHeadquarters: merged.isHeadquarters,
    },
  })
  const branch: Branch = {
    id: dto.id,
    name: dto.name,
    address: dto.address,
    city: dto.city,
    state: dto.state,
    phone: dto.phone,
    headId: dto.headId,
    isHeadquarters: dto.isHeadquarters,
  }
  replaceAt(branches, branch)
  return branch
}

export async function deleteBranch(id: string): Promise<void> {
  await apiRequest<void>(`/organization/branches/${encodeURIComponent(id)}`, { method: 'DELETE' })
  removeAt(branches, id)
}

export async function fetchOrgChart(): Promise<OrgNode | null> {
  return apiRequest<OrgNode | null>('/organization/org-chart')
}

export async function fetchReportingLines(): Promise<Array<{ manager: Employee; reports: Employee[] }>> {
  return apiRequest<Array<{ manager: Employee; reports: Employee[] }>>('/organization/reporting-lines')
}
