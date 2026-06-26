import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Pongs Quotation System',
  description: 'Professional stretch ceiling quotation system by Pongs India',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <header className="bg-white/90 backdrop-blur border-b border-slate-200/80 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
            {/* Logo */}
            <a href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center shadow-sm group-hover:bg-slate-700 transition-colors">
                <span className="text-white font-black text-sm tracking-tighter">P</span>
              </div>
              <div className="leading-tight">
                <p className="font-black text-slate-900 text-sm tracking-tight">PONGS</p>
                <p className="text-slate-400 text-[10px] font-medium tracking-widest uppercase">Stretch Ceiling</p>
              </div>
            </a>

            {/* Nav */}
            <nav className="flex items-center gap-1.5">
              <a href="/" className="text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                Dashboard
              </a>
              <a href="/quotes/new"
                className="btn-primary text-xs px-4 py-2">
                + New Quote
              </a>
            </nav>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto w-full px-5 py-8">
          {children}
        </main>

        <footer className="border-t border-slate-200 bg-white mt-auto">
          <div className="max-w-7xl mx-auto px-5 py-4 flex items-center justify-between text-xs text-slate-400">
            <span>Next Level Solutions · Pongs India</span>
            <span>Bengaluru · info@pongsindia.com</span>
          </div>
        </footer>
      </body>
    </html>
  )
}
