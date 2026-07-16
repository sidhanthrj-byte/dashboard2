'use client'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, FileText, Hammer, Boxes, Users2,
  Wallet, BarChart3, Shield, Menu, X, Plus,
} from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'
import UserMenu from '@/components/UserMenu'
import { useMe, can } from '@/lib/useMe'
import type { ModuleName } from '@/lib/permissions'

// Each link declares the capability that unlocks it. `admin` links are only
// shown to full administrators; `module` links to users with view access.
// The nav is advisory: every destination independently enforces access.
const LINKS: { href: string; label: string; icon: typeof LayoutDashboard; module?: ModuleName; admin?: boolean }[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, module: 'dashboard' },
  { href: '/quotes', label: 'Quotes', icon: FileText, module: 'quotes' },
  { href: '/projects', label: 'Projects', icon: Hammer, module: 'projects' },
  { href: '/inventory', label: 'Inventory', icon: Boxes, module: 'inventory' },
  { href: '/clients', label: 'Clients', icon: Users2, module: 'clients' },
  { href: '/finance', label: 'Finance', icon: Wallet, module: 'finance' },
  { href: '/analytics', label: 'Analytics', icon: BarChart3, module: 'analytics' },
  { href: '/users', label: 'Users', icon: Shield, admin: true },
]

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

export default function MainNav() {
  const pathname = usePathname() || '/'
  const [open, setOpen] = useState(false)
  const { me } = useMe()

  // Only show links the user is actually allowed to open.
  const links = LINKS.filter(l =>
    l.admin ? !!me?.isAdmin : l.module ? can(me, l.module, 'view') : true,
  )

  return (
    <>
      {/* Desktop nav */}
      <nav className="hidden lg:flex items-center gap-0.5">
        {links.map(({ href, label }) => {
          const active = isActive(pathname, href)
          return (
            <a key={href} href={href}
              className={`relative text-xs font-medium px-3 py-2 rounded-lg transition-colors ${
                active ? 'text-stone-900' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              {label}
              {active && <span className="absolute left-3 right-3 -bottom-[7px] h-0.5 rounded-full bg-emerald-600" />}
            </a>
          )
        })}
        <div className="mx-1"><NotificationBell /></div>
        <UserMenu />
        <a href="/quotes/new" className="btn-primary text-xs px-3 py-2 gap-1.5 ml-1">
          <Plus size={14} /> New Quote
        </a>
      </nav>

      {/* Mobile controls */}
      <div className="flex lg:hidden items-center gap-1">
        <NotificationBell />
        <UserMenu />
        <button onClick={() => setOpen(v => !v)} aria-label="Menu"
          className="w-9 h-9 flex items-center justify-center rounded-lg text-stone-600 hover:bg-stone-100 transition-colors">
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 top-[60px] z-40 bg-black/20 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)}>
          <div className="bg-white border-b border-stone-200 shadow-lg p-3 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="grid grid-cols-2 gap-1.5">
              {links.map(({ href, label, icon: Icon }) => {
                const active = isActive(pathname, href)
                return (
                  <a key={href} href={href} onClick={() => setOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      active ? 'bg-emerald-50 text-emerald-700' : 'text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <Icon size={16} /> {label}
                  </a>
                )
              })}
            </div>
            <a href="/quotes/new" onClick={() => setOpen(false)} className="btn-primary w-full mt-2 py-2.5">
              <Plus size={16} /> New Quote
            </a>
          </div>
        </div>
      )}
    </>
  )
}
