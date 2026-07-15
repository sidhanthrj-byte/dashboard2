'use client'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, FileText, Hammer, Boxes, Users2,
  Wallet, BarChart3, Shield, Menu, X, Plus,
} from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'
import UserMenu from '@/components/UserMenu'

const LINKS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/quotes', label: 'Quotes', icon: FileText },
  { href: '/projects', label: 'Projects', icon: Hammer },
  { href: '/inventory', label: 'Inventory', icon: Boxes },
  { href: '/clients', label: 'Clients', icon: Users2 },
  { href: '/finance', label: 'Finance', icon: Wallet },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/users', label: 'Users', icon: Shield },
]

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

export default function MainNav() {
  const pathname = usePathname() || '/'
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Desktop nav */}
      <nav className="hidden lg:flex items-center gap-0.5">
        {LINKS.map(({ href, label }) => {
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
              {LINKS.map(({ href, label, icon: Icon }) => {
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
