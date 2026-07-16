'use client'
import { useMe, can, type Me } from '@/lib/useMe'
import type { ModuleName } from '@/lib/permissions'

// Client-side access gate for whole pages. This is a UX layer only — the real
// enforcement lives in the API routes (every data call is authorized server-
// side). Gate simply avoids rendering a board the user has no business seeing.
export default function Gate({
  module,
  admin,
  children,
}: {
  module?: ModuleName
  admin?: boolean
  children: React.ReactNode | ((me: Me) => React.ReactNode)
}) {
  const { me, loading } = useMe()

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-sm" style={{ color: 'var(--faint)' }}>Loading…</div>
  }

  const allowed = !me ? false : admin ? me.isAdmin : module ? can(me, module, 'view') : true

  if (!allowed) {
    return (
      <div className="py-24 text-center animate-fade-in">
        <div className="fig text-[11px] uppercase mb-3" style={{ color: 'var(--faint)', letterSpacing: '0.14em' }}>
          Restricted
        </div>
        <p className="font-display text-[19px] font-semibold" style={{ color: 'var(--ink)' }}>
          You don’t have access to this section
        </p>
        <p className="text-[13.5px] mt-2" style={{ color: 'var(--muted)' }}>
          Ask an administrator to grant you permission.
        </p>
        <a href="/quotes" className="btn-primary mt-6 inline-flex">Go to Quotes</a>
      </div>
    )
  }

  return <>{typeof children === 'function' ? (children as (me: Me) => React.ReactNode)(me as Me) : children}</>
}
