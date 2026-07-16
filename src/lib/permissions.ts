// ===========================================================================
// GRANULAR, USER-SPECIFIC PERMISSION MODEL
// ===========================================================================
// The authoritative source of truth for what a user may do. Permissions are
// stored per-user (app_users.permissions_json) as a map of module -> actions.
// Admins (role === 'admin') implicitly hold every permission and bypass the
// map entirely. This module is shared by both server (authorization) and
// client (UI gating) code — but the client copy is ADVISORY ONLY; every
// protected action is independently enforced on the server.

export const MODULES = [
  'dashboard',
  'quotes',
  'projects',
  'inventory',
  'clients',
  'finance',
  'analytics',
] as const

export type ModuleName = (typeof MODULES)[number]

export const ACTIONS = ['view', 'create', 'edit', 'delete'] as const
export type ActionName = (typeof ACTIONS)[number]

export interface ModulePermission {
  view: boolean
  create: boolean
  edit: boolean
  delete: boolean
}

export type UserPermissions = Record<ModuleName, ModulePermission>

export const MODULE_LABELS: Record<ModuleName, string> = {
  dashboard: 'Dashboard',
  quotes: 'Quotes',
  projects: 'Projects',
  inventory: 'Inventory',
  clients: 'Clients',
  finance: 'Finance',
  analytics: 'Analytics',
}

function blankModule(all = false): ModulePermission {
  return { view: all, create: all, edit: all, delete: all }
}

// A permission set with every flag off — the safe default for a brand new,
// un-privileged account. The admin explicitly grants from here.
export function emptyPermissions(): UserPermissions {
  const p = {} as UserPermissions
  for (const m of MODULES) p[m] = blankModule(false)
  return p
}

// A permission set with every flag on — used only as the in-memory
// representation for admins (who bypass checks anyway).
export function fullPermissions(): UserPermissions {
  const p = {} as UserPermissions
  for (const m of MODULES) p[m] = blankModule(true)
  return p
}

// Tolerant parser: accepts a JSON string or object (possibly partial / legacy)
// and normalises it into a complete UserPermissions with every module present.
// Unknown keys are ignored; missing keys default to false.
export function parsePermissions(raw: unknown): UserPermissions {
  const out = emptyPermissions()
  let obj: Record<string, unknown> | null = null
  if (typeof raw === 'string' && raw.trim()) {
    try { obj = JSON.parse(raw) } catch { obj = null }
  } else if (raw && typeof raw === 'object') {
    obj = raw as Record<string, unknown>
  }
  if (!obj) return out
  for (const m of MODULES) {
    const src = obj[m]
    if (src && typeof src === 'object') {
      const s = src as Record<string, unknown>
      out[m] = {
        view: !!s.view,
        create: !!s.create,
        edit: !!s.edit,
        delete: !!s.delete,
      }
    }
  }
  return out
}

// Central authorization predicate. Admins always pass. Any action other than
// 'view' also implicitly requires 'view' on that module.
export function permitted(
  perms: UserPermissions,
  isAdmin: boolean,
  module: ModuleName,
  action: ActionName,
): boolean {
  if (isAdmin) return true
  const mod = perms[module]
  if (!mod) return false
  if (action !== 'view' && !mod.view) return false
  return !!mod[action]
}

// ---------------------------------------------------------------------------
// Legacy role -> permission mapping.
// Existing users were assigned a coarse role (admin/manager/sales/installer/
// viewer/editor). To preserve their current access when we migrate to the
// granular model, we seed each existing user's permission map from their role.
// ---------------------------------------------------------------------------
function mk(
  spec: Partial<Record<ModuleName, Partial<ModulePermission>>>,
): UserPermissions {
  const p = emptyPermissions()
  for (const m of MODULES) {
    const s = spec[m]
    if (s) p[m] = { view: !!s.view, create: !!s.create, edit: !!s.edit, delete: !!s.delete }
  }
  return p
}

export function permissionsForLegacyRole(role: string): UserPermissions {
  const r = (role || 'viewer').toLowerCase()
  const rwd = { view: true, create: true, edit: true, delete: true }
  const rw = { view: true, create: true, edit: true, delete: false }
  const ro = { view: true, create: false, edit: false, delete: false }
  switch (r) {
    case 'admin':
      return fullPermissions()
    case 'manager':
      return mk({
        dashboard: ro, quotes: rwd, projects: rwd, inventory: rw,
        clients: rwd, finance: ro, analytics: ro,
      })
    case 'sales':
      return mk({ quotes: rw, projects: ro, clients: rw })
    case 'editor':
      return mk({ dashboard: ro, quotes: rw, projects: rw, clients: rw, inventory: rw })
    case 'installer':
      return mk({ projects: { view: true, create: false, edit: true, delete: false } })
    case 'viewer':
    default:
      return mk({ quotes: ro })
  }
}
