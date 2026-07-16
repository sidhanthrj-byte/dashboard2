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
      {/* Desktop nav — title-block tabs */}
      <nav className="hidden lg:flex items-center gap-0.5">
        {links.map(({ href, label }) => {
          const active = isActive(pathname, href)
          return (
            <a key={href} href={href}
              className="relative font-mono text-[11px] uppercase px-2.5 py-1.5 transition-colors"
              style={{ color: active ? 'var(--ink)' : 'var(--muted)', letterSpacing: '0.08em', fontWeight: 500 }}
            >
              {label}
              {active && <span className="absolute left-2.5 right-2.5 -bottom-[8px] h-[1.5px]" style={{ background: 'var(--accent)' }} />}
            </a>
          )
        })}
        <div className="w-px h-4 mx-2.5" style={{ background: 'var(--rule-2)' }} />
        <NotificationBell />
        <UserMenu />
      </nav>

      {/* Mobile controls */}
      <div className="flex lg:hidden items-center gap-1">
        <NotificationBell />
        <UserMenu />
        <button onClick={() => setOpen(v => !v)} aria-label="Menu"
          className="w-9 h-9 flex items-center justify-center rounded-[3px] transition-colors hover:bg-[color:var(--sheet-2)]"
          style={{ color: 'var(--ink-2)' }}>
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 top-[56px] z-40 animate-fade-in" style={{ background: 'rgba(28,25,21,0.16)' }} onClick={() => setOpen(false)}>
          <div className="p-3 animate-slide-up" style={{ background: 'var(--sheet)', borderBottom: '1px solid var(--rule-2)' }} onClick={e => e.stopPropagation()}>
            <div className="grid grid-cols-2 gap-1">
              {links.map(({ href, label, icon: Icon }) => {
                const active = isActive(pathname, href)
                return (
                  <a key={href} href={href} onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-[3px] font-mono text-[12px] uppercase transition-colors"
                    style={{
                      color: active ? 'var(--ink)' : 'var(--muted)',
                      background: active ? 'var(--sheet-2)' : 'transparent',
                      letterSpacing: '0.06em', fontWeight: 500,
                      boxShadow: active ? 'inset 3px 0 0 var(--accent)' : 'none',
                    }}
                  >
                    <Icon size={15} strokeWidth={1.9} /> {label}
                  </a>
                )
              })}
            </div>
            <a href="/quotes/new" onClick={() => setOpen(false)} className="btn-primary w-full mt-2 justify-center">
              <Plus size={16} /> New quote
            </a>
          </div>
        </div>
      )}
    </>
  )
}
