'use client'
import { useState, useEffect, useRef } from 'react'
import { Bell, AlertTriangle, CalendarClock } from 'lucide-react'

interface NotifData {
  total: number
  lowStockCount: number
  todayJobsCount: number
  lowStock: { id: string; name: string; current_stock: number; min_stock: number }[]
  todayJobs: { id: string; name: string; client_name: string; team_lead: string }[]
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<NotifData | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/notifications').then(r => r.json()).then(setData).catch(() => {})
  }, [])

  useEffect(() => {
    function onClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey) }
  }, [])

  const total = data?.total ?? 0

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} className="relative p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors" aria-label="Notifications">
        <Bell size={16} />
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">{total > 99 ? '99+' : total}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-bold text-gray-900">Notifications</p>
            <span className="text-[10px] text-gray-400">{total} new</span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {total === 0 && <p className="px-4 py-8 text-center text-xs text-gray-400">You&apos;re all caught up</p>}

            {(data?.todayJobs ?? []).map(j => (
              <a key={j.id} href="/projects" className="flex items-start gap-2.5 px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0">
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0"><CalendarClock size={14} /></div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-900 truncate">Job today: {j.name}</p>
                  <p className="text-[11px] text-gray-500 truncate">{j.client_name}{j.team_lead ? ` · ${j.team_lead}` : ''}</p>
                </div>
              </a>
            ))}

            {(data?.lowStock ?? []).map(p => (
              <a key={p.id} href="/inventory/reorder" className="flex items-start gap-2.5 px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0">
                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0"><AlertTriangle size={14} /></div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-900 truncate">Low stock: {p.name}</p>
                  <p className="text-[11px] text-gray-500">{p.current_stock} left (min {p.min_stock})</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
