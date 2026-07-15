import type { Metadata } from 'next'
import UserMenu from '@/components/UserMenu'
import './globals.css'

export const metadata: Metadata = {
  title: 'Pongs Quotation System',
  description: 'Professional stretch ceiling quotation system by Pongs India',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <header
          className="sticky top-0 z-50 border-b"
          style={{
            background: 'rgba(250, 249, 247, 0.72)',
            backdropFilter: 'saturate(180%) blur(14px)',
            WebkitBackdropFilter: 'saturate(180%) blur(14px)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="max-w-7xl mx-auto px-6 flex items-center justify-between" style={{ height: 64 }}>
            <a href="/" className="flex items-center gap-3 group">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-105"
                style={{
                  background: 'linear-gradient(160deg, #16130f 0%, #2c2620 100%)',
                  boxShadow: '0 2px 8px -2px rgba(23,19,15,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
                }}
              >
                <span className="text-white font-black text-sm tracking-tighter">P</span>
              </div>
              <div className="leading-none">
                <p className="font-black text-[15px] tracking-tight" style={{ color: 'var(--ink)' }}>PONGS</p>
                <p className="text-[9px] font-semibold tracking-[0.22em] uppercase mt-1" style={{ color: 'var(--subtle)' }}>
                  Stretch Ceiling
                </p>
              </div>
            </a>

            <nav className="flex items-center gap-1.5">
              <a
                href="/"
                className="text-[13px] font-medium px-3.5 py-2 rounded-lg transition-colors duration-150"
                style={{ color: 'var(--muted)' }}
              >
                Dashboard
              </a>
              <a href="/quotes/new" className="btn-primary text-[13px] px-4 py-2 gap-1.5">
                <span className="text-base leading-none font-light">+</span> New Quote
              </a>
              <UserMenu />
            </nav>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10 animate-fade-in">
          {children}
        </main>

        <footer className="mt-auto border-t" style={{ borderColor: 'var(--border-light)' }}>
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between text-[11px]" style={{ color: 'var(--subtle)' }}>
            <span className="font-medium">Next Level Solutions · Pongs India</span>
            <span>Bengaluru · info@pongsindia.com</span>
          </div>
        </footer>
      </body>
    </html>
  )
}
