export const dynamic = 'force-dynamic'

import { dbListActivity } from '@/lib/db'
import { fmtDate } from '@/lib/format'

type Row = Record<string, unknown>

function relative(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z')
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  return fmtDate(iso)
}

export default async function ActivityPage() {
  const rows = (await dbListActivity(150)) as unknown as Row[]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Activity Log</h1>
        <p className="text-sm text-gray-500 mt-0.5">Recent changes across all users</p>
      </div>

      <div className="card">
        {rows.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <p className="font-medium">No activity recorded yet</p>
            <p className="text-xs mt-1">User actions will appear here as they happen</p>
          </div>
        ) : (
          <ul className="space-y-0">
            {rows.map((r, i) => (
              <li key={String(r.id ?? i)} className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-blue-700">{String(r.user_name ?? '?').charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">
                    <span className="font-semibold">{String(r.user_name ?? 'System')}</span>{' '}
                    <span className="text-gray-600">{String(r.action ?? '')}</span>
                  </p>
                  {r.details ? <p className="text-xs text-gray-500 mt-0.5">{String(r.details)}</p> : null}
                </div>
                <span className="text-[11px] text-gray-400 flex-shrink-0">{relative(String(r.created_at ?? ''))}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
