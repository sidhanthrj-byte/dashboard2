'use client'

import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users } from 'lucide-react'

const navItems = [
  { label: 'Dashboard', href: '/users', icon: LayoutDashboard },
  { label: 'All Users', href: '/users/all', icon: Users },
]

export default function UsersLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div className="flex min-h-screen -mx-3 sm:-mx-6 -my-4 sm:-my-8">
      <aside className="w-56 bg-white border-r border-gray-200 sticky top-[60px] h-[calc(100vh-60px)] flex-shrink-0 overflow-y-auto">
        <div className="p-3 pt-4">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-2 mb-2">Users</p>
          <nav className="space-y-0.5">
            {navItems.map(({ label, href, icon: Icon }) => {
              const active = pathname === href
              return (
                <a
                  key={href}
                  href={href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={15} />
                  {label}
                </a>
              )
            })}
          </nav>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  )
}
