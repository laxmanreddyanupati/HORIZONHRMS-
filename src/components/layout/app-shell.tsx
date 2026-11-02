import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Sidebar, SidebarNav } from './sidebar'
import { Header } from './header'
import { Breadcrumbs } from './breadcrumbs'
import { cn } from '@/lib/utils'

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem('horizon-sidebar-collapsed') === 'true'
  } catch {
    return false
  }
}

export function AppShell() {
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    try {
      window.localStorage.setItem('horizon-sidebar-collapsed', String(collapsed))
    } catch {
      // Ignore storage failures.
    }
  }, [collapsed])

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((current) => !current)} />

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[286px] border-0 bg-sidebar p-0">
          <SheetTitle className="sr-only">Main navigation</SheetTitle>
          <SidebarNav collapsed={false} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className={cn('flex min-h-screen flex-col transition-[padding] duration-200', collapsed ? 'lg:pl-[76px]' : 'lg:pl-[264px]')}>
        <Header onOpenMobileNav={() => setMobileOpen(true)} />
        <main className="mx-auto w-full max-w-[1560px] flex-1 px-4 py-5 sm:px-6 lg:px-8">
          <Breadcrumbs />
          <div className="mt-4">
            <Outlet />
          </div>
        </main>
        <footer className="mx-auto w-full max-w-[1560px] px-4 pb-6 pt-2 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-1 border-t border-border pt-4 text-[10.5px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <p>Horizon HRMS · Horizon Technologies Pvt. Ltd.</p>
            <p>Asia/Kolkata (IST) · Connected to the HRMS API</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
