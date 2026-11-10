import { apiRequest } from '@/lib/api-client'


export interface Project {
  id: string
  title: string
  description: string
  status: string
  startDate: string
  endDate: string | null
  budget: number
  managerId: string
  departmentId: string
  memberIds: string[]
}

export interface ProjectRequest {
  title: string
  description?: string
  status?: string
  startDate: string
  endDate?: string | null
  budget?: number
  managerId?: string | null
  departmentId: string
  memberIds?: string[]
}

export async function fetchProjects(): Promise<Project[]> {
  return apiRequest<Project[]>('/projects')
}

export async function fetchProject(id: string): Promise<Project> {
  return apiRequest<Project>(`/projects/${encodeURIComponent(id)}`)
}

export async function createProject(input: ProjectRequest): Promise<Project> {
  return apiRequest<Project>('/projects', { method: 'POST', body: input })
}

export async function updateProject(id: string, input: ProjectRequest): Promise<Project> {
  return apiRequest<Project>(`/projects/${encodeURIComponent(id)}`, { method: 'PUT', body: input })
}

export async function setProjectStatus(id: string, status: string): Promise<Project> {
  return apiRequest<Project>(`/projects/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: { status } })
}

export async function deleteProject(id: string): Promise<void> {
  await apiRequest<void>(`/projects/${encodeURIComponent(id)}`, { method: 'DELETE' })
}