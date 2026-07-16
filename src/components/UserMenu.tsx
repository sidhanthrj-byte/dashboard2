'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

type User = { id: string; name: string; email: string; role: string; isAdmin?: boolean }

const ROLE_COLORS: Record<string, string> = { admin:'bg-red-100 text-red-700', manager:'bg-blue-100 text-blue-700', sales:'bg-green-100 text-green-700', installer:'bg-orange-100 text-orange-700', viewer:'bg-gray-100 text-gray-600' }

export default function UserMenu() {
  const [user, setUser] = useState<User | null>(null)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/auth/me').then(r=>r.json()).then(d => setUser(d)).catch(() => {})
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    function onClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick) }
  }, [])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    router.push('/login')
    router.refresh()
  }

  if (!user) {
    return (
      <a href="/login" className="text-xs font-medium text-gray-500 hover:text-gray-900 px-2.5 py-2 rounded-lg hover:bg-gray-100 transition-colors">
        Sign in
      </a>
    )
  }

  const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const isAdmin = user.isAdmin || user.role === 'admin' || user.email?.toLowerCase() === 'sidhanthrj@gmail.com'

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
        <div className="w-7 h-7 bg-gray-900 rounded-full flex items-center justify-center">
          <span className="text-white text-[10px] font-bold">{initials}</span>
        </div>
        <span className="text-xs font-medium text-gray-700 hidden sm:block">{user.name.split(' ')[0]}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
            <span className={`badge mt-1.5 ${ROLE_COLORS[user.role] ?? 'bg-gray-100 text-gray-600'} capitalize`}>{user.role}</span>
          </div>
          <div className="p-1">
            {isAdmin && (
              <>
                <a href="/admin/access-requests" onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-amber-50 hover:text-amber-700 rounded-lg transition-colors font-medium">
                  <span>📋</span> Access Requests
                </a>
                <a href="/users" onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                  <span>🛡️</span> User Management
                </a>
              </>
            )}
            <button onClick={logout}
              className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-0.5">
              <span>→</span> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
