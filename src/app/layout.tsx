import type { Metadata } from 'next'
import './globals.css'
import MainNav from '@/components/MainNav'

export const metadata: Metadata = {
  title: 'Pongs Quotation System',
  description: 'Professional stretch ceiling quotation system by Pongs India',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <header className="bg-white/80 backdrop-blur-xl border-b sticky top-0 z-50" style={{ borderColor: 'var(--border)' }}>
          <div className="max-w-7xl mx-auto px-3 sm:px-6 flex items-center justify-between" style={{height: 60}}>
            <a href="/" className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-105" style={{ background: 'linear-gradient(135deg, #047857, #065f46)' }}>
                <span className="text-white font-black text-xs tracking-tighter">P</span>
              </div>
              <div className="leading-none">
                <p className="font-black text-stone-900 text-sm tracking-tight">PONGS</p>
                <p className="text-stone-400 text-[9px] font-semibold tracking-[0.2em] uppercase mt-0.5">Stretch Ceiling</p>
              </div>
            </a>
            <MainNav />
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-8 animate-fade-in">
          {children}
        </main>

        <footer className="border-t bg-white/60 mt-auto" style={{ borderColor: 'var(--border)' }}>
          <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between text-[11px] text-stone-400">
            <span className="font-medium">Next Level Solutions · Pongs India</span>
            <span>Bengaluru · info@pongsindia.com</span>
          </div>
        </footer>
      </body>
    </html>
  )
}
