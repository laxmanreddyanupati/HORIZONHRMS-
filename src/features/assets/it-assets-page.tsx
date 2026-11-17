import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Laptop, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/common/empty-state'
import { apiRequest } from '@/lib/api-client'

interface Asset {
  id: string
  assetId: string
  serialNumber: string
  name: string
  type: string
  status: string
  employeeName: string | null
  condition: string
}

export function ItAssetsPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [assetId, setAssetId] = useState('')
  const [serial, setSerial] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState('LAPTOP')

  const assetsQuery = useQuery({
    queryKey: ['it-assets'],
    queryFn: () => apiRequest<Asset[]>('/it-assets'),
  })

  const statsQuery = useQuery({
    queryKey: ['it-assets-stats'],
    queryFn: () => apiRequest<Record<string, number>>('/it-assets/stats'),
  })

  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest<Asset>('/it-assets', {
        method: 'POST',
        body: { assetId, serialNumber: serial, name, type, condition: 'Good' },
      }),
    onSuccess: () => {
      toast.success('Asset registered')
      setShowForm(false)
      setAssetId('')
      setSerial('')
      setName('')
      void queryClient.invalidateQueries({ queryKey: ['it-assets'] })
      void queryClient.invalidateQueries({ queryKey: ['it-assets-stats'] })
    },
    onError: (e: Error) => toast.error('Could not register asset', { description: e.message }),
  })

  return (
    <div className="space-y-5">
      <PageHeader
        title="IT Asset Management"
        description="Register equipment and track allocations."
        actions={
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus /> Register asset
          </Button>
        }
      />

      {statsQuery.data ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {Object.entries(statsQuery.data).map(([k, v]) => (
            <Card key={k} className="p-4">
              <p className="text-xs text-slate-500">{k}</p>
              <p className="mt-1 text-xl font-semibold">{v}</p>
            </Card>
          ))}
        </div>
      ) : null}

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>Register asset</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <input className="rounded-md border px-3 py-2 text-sm" placeholder="Asset ID" value={assetId} onChange={(e) => setAssetId(e.target.value)} />
            <input className="rounded-md border px-3 py-2 text-sm" placeholder="Serial number" value={serial} onChange={(e) => setSerial(e.target.value)} />
            <input className="rounded-md border px-3 py-2 text-sm" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <select className="rounded-md border px-3 py-2 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
              <option>LAPTOP</option><option>MONITOR</option><option>KEYBOARD</option><option>MOUSE</option><option>DESKTOP</option><option>OTHER</option>
            </select>
            <Button onClick={() => createMutation.mutate()} disabled={!assetId || !serial || !name || createMutation.isPending}>
              Register
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {assetsQuery.data?.length ? (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left">Asset</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Employee</th>
                <th className="px-4 py-2 text-left">Condition</th>
              </tr>
            </thead>
            <tbody>
              {assetsQuery.data.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="px-4 py-2">{a.assetId} — {a.name}</td>
                  <td className="px-4 py-2">{a.type}</td>
                  <td className="px-4 py-2">{a.status}</td>
                  <td className="px-4 py-2">{a.employeeName ?? '—'}</td>
                  <td className="px-4 py-2">{a.condition}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={Laptop} title="No assets" description="Register equipment to get started." />
      )}
    </div>
  )
}