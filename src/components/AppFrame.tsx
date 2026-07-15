'use client'

import { usePathname } from 'next/navigation'
import MainNav from '@/components/MainNav'

/** Routes that render standalone, without the app shell (nav + footer). */
const BARE_ROUTES = ['/login', '/request-access']

export default function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/'
  const bare = BARE_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))

  if (bare) {
    return <>{children}</>
  }

  return (
    <>
      <header
        className="bg-white/85 backdrop-blur-xl border-b sticky top-0 z-50"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 flex items-center justify-between" style={{ height: 60 }}>
          <a href="/" className="flex items-center gap-2.5 group shrink-0">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm transition-transform duration-200 group-hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #047857, #065f46)' }}
            >
              <span className="text-white font-black text-xs tracking-tightest">P</span>
            </div>
            <div className="leading-none">
              <p className="font-black text-gray-900 text-sm tracking-tight">PONGS</p>
              <p className="text-gray-400 text-[9px] font-semibold tracking-[0.2em] uppercase mt-0.5">Stretch Ceiling</p>
            </div>
          </a>
          <MainNav />
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 py-5 sm:py-8 animate-fade-in">
        {children}
      </main>

      <footer className="border-t bg-white/50 mt-auto" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between text-[11px] text-gray-400">
          <span className="font-medium">Pongs India · Stretch Ceiling Systems</span>
          <span className="hidden sm:inline">Bengaluru · info@pongsindia.com</span>
        </div>
      </footer>
    </>
  )
}
