import { useEffect, useState } from 'react'
import { Menu, Search } from 'lucide-react'
import { NotificationsMenu } from './notifications-menu'
import { UserMenu } from './user-menu'
import { GlobalSearch } from './global-search'
import { useRole } from '@/contexts/role-context'

export function Header({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const { roleLabel } = useRole()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen((current) => !current)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <>
      <header className="sticky top-0 z-30 flex h-15 shrink-0 items-center gap-2 border-b border-border bg-white/95 px-4 backdrop-blur sm:gap-3 sm:px-6">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="flex size-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-secondary hover:text-slate-700 lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="size-5" />
        </button>

        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="group flex h-9 w-9 items-center justify-center gap-2 rounded-lg border border-border bg-slate-50/70 text-slate-400 transition-colors hover:border-slate-300 hover:bg-white sm:w-64 sm:justify-start sm:px-3 lg:w-80"
          aria-label="Open global search"
        >
          <Search className="size-4 shrink-0" />
          <span className="hidden flex-1 truncate text-left text-[12px] sm:block">
            Search employees, pages…
          </span>
          <kbd className="hidden rounded border border-border bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:block">
            ⌘K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <span className="mr-1 hidden items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary-700 md:inline-flex">
            <span className="size-1.5 rounded-full bg-primary-600" />
            {roleLabel}
          </span>
          <div className="mx-0.5 hidden h-5 w-px bg-border sm:block" />
          <NotificationsMenu />
          <UserMenu />
        </div>
      </header>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}
