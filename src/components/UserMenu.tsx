'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, Users } from 'lucide-react'
import type { UserRole } from '@/lib/types'

interface Me { userId: string; name: string; role: UserRole }

export default function UserMenu() {
  const [me, setMe] = useState<Me | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (pathname === '/login') { setMe(null); return }
    fetch('/api/auth/me')
      .then(r => (r.ok ? r.json() : null))
      .then(setMe)
      .catch(() => setMe(null))
  }, [pathname])

  if (!me) return null

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex items-center gap-1">
      {me.role === 'admin' && (
        <a href="/users" className="text-xs font-medium text-gray-500 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1.5">
          <Users size={13} /> Users
        </a>
      )}
      <div className="flex items-center gap-2 pl-2 ml-1 border-l border-gray-100">
        <div className="w-7 h-7 rounded-full bg-gray-900 text-white text-[10px] font-bold flex items-center justify-center">
          {me.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="leading-tight hidden sm:block">
          <p className="text-xs font-semibold text-gray-800">{me.name}</p>
          <p className="text-[10px] text-gray-400 capitalize">{me.role}</p>
        </div>
        <button onClick={logout} title="Sign out"
          className="text-gray-400 hover:text-gray-800 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <LogOut size={14} />
        </button>
      </div>
    </div>
  )
}
