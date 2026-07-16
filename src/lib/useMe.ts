'use client'
import { useEffect, useState } from 'react'
import type { UserPermissions, ModuleName, ActionName } from './permissions'

export interface Me {
  id: string
  name: string
  email: string
  role: string
  isAdmin: boolean
  permissions: UserPermissions
}

export function can(me: Me | null, module: ModuleName, action: ActionName): boolean {
  if (!me) return false
  if (me.isAdmin) return true
  const mod = me.permissions?.[module]
  if (!mod) return false
  if (action !== 'view' && !mod.view) return false
  return !!mod[action]
}

// Shared client hook: fetches the current user once. `loading` is true until
// the /api/auth/me response resolves so gates don't flash the wrong state.
export function useMe(): { me: Me | null; loading: boolean } {
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => { if (active) { setMe(d); setLoading(false) } })
      .catch(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  return { me, loading }
}
