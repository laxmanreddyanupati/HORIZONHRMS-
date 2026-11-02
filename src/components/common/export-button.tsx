import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { downloadTextFile, toCsv } from '@/lib/utils'

interface ExportButtonProps {
  filename: string
  rows: Array<Record<string, string | number | null | undefined>>
  label?: string
  disabled?: boolean
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
}

export function ExportButton({ filename, rows, label = 'Export CSV', disabled, variant = 'outline' }: ExportButtonProps) {
  const handleExport = () => {
    if (rows.length === 0) {
      toast.error('There is no data to export.')
      return
    }
    downloadTextFile(filename, toCsv(rows), 'text/csv;charset=utf-8')
    toast.success(`Exported ${rows.length} rows`, { description: `${filename} was generated in your browser.` })
  }

  return (
    <Button variant={variant} size="sm" onClick={handleExport} disabled={disabled}>
      <Download />
      {label}
    </Button>
  )
}
