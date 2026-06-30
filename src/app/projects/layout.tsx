'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const nav = [
  { href: '/projects', label: 'Dashboard', icon: '🏗️' },
  { href: '/projects/all', label: 'All Projects', icon: '📋' },
  { href: '/projects/calendar', label: 'Calendar', icon: '📅' },
  { href: '/projects/completed', label: 'Completed', icon: '✅' },
]

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  return (
    <div className="flex gap-6 min-h-[calc(100vh-120px)]">
      <aside className="w-52 flex-shrink-0">
        <div className="bg-white rounded-xl border border-gray-200 p-2 sticky top-20">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 py-2">Projects</p>
          {nav.map(item => (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                path === item.href ? 'bg-amber-50 text-amber-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}>
              <span>{item.icon}</span>{item.label}
            </Link>
          ))}
        </div>
      </aside>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
