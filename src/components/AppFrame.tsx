'use client'

import { usePathname } from 'next/navigation'
import MainNav from '@/components/MainNav'

/** Routes that render standalone, without the title block. */
const BARE_ROUTES = ['/login', '/request-access']

export default function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/'
  const bare = BARE_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))

  if (bare) return <>{children}</>

  return (
    <>
      {/* Title block — the drawing set's header strip */}
      <header
        className="sticky top-0 z-50"
        style={{ background: 'rgba(244,240,231,0.9)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--rule-2)' }}
      >
        <div className="max-w-[1240px] mx-auto px-4 sm:px-7 flex items-center justify-between" style={{ height: 56 }}>
          <a href="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-7 h-7 flex items-center justify-center rounded-[3px]" style={{ background: 'var(--ink)' }}>
              <span className="font-display font-bold text-[13px] text-[color:var(--paper)]">P</span>
            </div>
            <div className="leading-none">
              <div className="font-display font-semibold text-[15px] tracking-tight" style={{ color: 'var(--ink)' }}>Pongs</div>
              <div className="fig text-[9px] uppercase mt-0.5" style={{ color: 'var(--faint)', letterSpacing: '0.14em' }}>Estimating</div>
            </div>
          </a>
          <MainNav />
        </div>
      </header>

      <main className="flex-1 max-w-[1240px] mx-auto w-full px-4 sm:px-7 pb-20 animate-fade-in">
        {children}
      </main>

      {/* Sheet footer */}
      <footer className="mt-auto" style={{ borderTop: '1px solid var(--rule)' }}>
        <div className="max-w-[1240px] mx-auto px-4 sm:px-7 py-4 flex items-center justify-between fig text-[10.5px] uppercase"
          style={{ color: 'var(--faint)', letterSpacing: '0.1em' }}>
          <span>Pongs India · Stretch Ceiling Systems</span>
          <span className="hidden sm:inline">Bengaluru</span>
        </div>
      </footer>
    </>
  )
}
