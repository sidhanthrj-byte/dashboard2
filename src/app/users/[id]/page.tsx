import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { dbGetUser, dbListPermissions } from '@/lib/db'
import { fmtDate } from '@/lib/format'
import { getSessionUser } from '@/lib/session'

type Row = Record<string, unknown>

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-700', manager: 'bg-blue-100 text-blue-700',
  sales: 'bg-green-100 text-green-700', editor: 'bg-emerald-100 text-emerald-700',
  installer: 'bg-orange-100 text-orange-700', viewer: 'bg-gray-100 text-gray-600',
}
const FEATURE_LABELS: Record<string, string> = { quotes: 'Quotations', inventory: 'Inventory', projects: 'Projects', analytics: 'Analytics', users: 'User Management' }

export default async function UserDetailPage({ params }: { params: { id: string } }) {
  const me = await getSessionUser()
  if (!me?.isAdmin) redirect('/quotes')
  const user = (await dbGetUser(params.id)) as Row | null
  if (!user) notFound()
  const role = String(user.access_level ?? 'viewer')
  const perms = (await dbListPermissions()) as unknown as Row[]
  const rolePerms = perms.filter(p => String(p.role) === role)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Link href="/users/all" className="hover:text-gray-700">All Users</Link>
        <span>/</span>
        <span className="text-gray-700">{String(user.name)}</span>
      </div>

      <div className="card">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-bold text-blue-700">{String(user.name).charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{String(user.name)}</h1>
              <span className={`badge capitalize ${ROLE_COLORS[role] ?? 'bg-gray-100 text-gray-600'}`}>{role}</span>
              <span className={`badge ${user.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{String(user.status ?? 'active')}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
              <div><p className="text-xs text-gray-400">Email</p><p className="text-gray-700">{String(user.email ?? '—')}</p></div>
              <div><p className="text-xs text-gray-400">Phone</p><p className="text-gray-700">{String(user.phone ?? '—')}</p></div>
              <div><p className="text-xs text-gray-400">City</p><p className="text-gray-700">{String(user.city ?? '—')}</p></div>
              <div><p className="text-xs text-gray-400">Joined</p><p className="text-gray-700">{fmtDate(String(user.created_at ?? ''))}</p></div>
            </div>
            {user.notes ? <p className="text-sm text-gray-500 mt-3 border-t border-gray-100 pt-3">{String(user.notes)}</p> : null}
          </div>
          <Link href="/users/all" className="btn-secondary text-xs px-4 py-2">Edit</Link>
        </div>
      </div>

      <div className="card">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Permissions Summary <span className="text-gray-400 font-normal capitalize">({role})</span></h2>
        {rolePerms.length === 0 ? (
          <p className="text-xs text-gray-400">No permission profile found for this role.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {rolePerms.map(p => (
              <div key={String(p.feature)} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                <span className="text-sm font-medium text-gray-700">{FEATURE_LABELS[String(p.feature)] ?? String(p.feature)}</span>
                <div className="flex gap-1.5">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${p.can_view ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>View</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${p.can_edit ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>Edit</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
