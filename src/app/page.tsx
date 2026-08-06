'use client'

import { useMe, can } from '@/lib/useMe'
import QuoteRegister from '@/components/QuoteRegister'

// The Dashboard is an admin-controlled board. Users without explicit dashboard
// access are routed to the Quotes module instead of being shown an error.
export default function HomePage() {
  const { me, loading } = useMe()

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-sm text-stone-400">Loading…</div>
  }

  if (!can(me, 'dashboard', 'view')) {
    if (typeof window !== 'undefined') window.location.replace('/quotes')
    return null
  }

  return <QuoteRegister variant="dashboard" />
}
