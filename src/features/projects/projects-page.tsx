import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Plus, FolderKanban, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/common/empty-state'
import { fetchEmployees } from '@/services/employee-service'
import { fetchProjects, createProject, deleteProject, type Project } from '@/services/project-service'

export function ProjectsPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [departmentId, setDepartmentId] = useState('dept-eng')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])

  const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: fetchProjects })
  const employeesQuery = useQuery({ queryKey: ['employees', 'all'], queryFn: () => fetchEmployees({ pageSize: 200 }) })

  const createMutation = useMutation({
    mutationFn: () =>
      createProject({ title, departmentId, startDate: new Date().toISOString().slice(0, 10), memberIds: selectedMembers }),
    onSuccess: () => {
      toast.success('Project created')
      setShowForm(false)
      setTitle('')
      setSelectedMembers([])
      void queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: (e: Error) => toast.error('Could not create project', { description: e.message }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => {
      toast.success('Project deleted')
      void queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Projects"
        description="Track projects, members and status."
        actions={
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus /> New project
          </Button>
        }
      />

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>New project</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Project title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              <option value="dept-eng">Engineering</option>
              <option value="dept-product">Product</option>
              <option value="dept-sales">Sales</option>
              <option value="dept-hr">Human Resources</option>
            </select>
            <div>
              <p className="mb-1 text-xs font-medium text-slate-600">Assign employees</p>
              <div className="max-h-40 overflow-y-auto rounded-md border p-2">
                {(employeesQuery.data?.data ?? []).map((emp) => (
                  <label key={emp.id} className="flex items-center gap-2 py-1 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(emp.id)}
                      onChange={() => toggleMember(emp.id)}
                    />
                    {emp.firstName} {emp.lastName} ({emp.id})
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={() => createMutation.mutate()} disabled={!title.trim() || createMutation.isPending}>
              Create
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {projectsQuery.data?.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projectsQuery.data.map((project: Project) => (
            <Card key={project.id}>
              <CardHeader className="flex-row items-start justify-between">
                <CardTitle className="text-base">{project.title}</CardTitle>
                <Badge variant="secondary">{project.status}</Badge>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-600">
                <p>{project.description || 'No description'}</p>
                <p className="flex items-center gap-1 text-xs text-slate-400">
                  <Users className="size-3" /> {project.memberIds.length} members
                </p>
                <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(project.id)}>
                  <Trash2 /> Delete
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={FolderKanban} title="No projects yet" description="Create your first project to get started." />
      )}
    </div>
  )
}