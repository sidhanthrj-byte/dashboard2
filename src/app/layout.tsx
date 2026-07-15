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
        <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200/80 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-15 flex items-center justify-between" style={{height: 60}}>
            <a href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center shadow-sm group-hover:bg-gray-700 transition-colors">
                  <span className="text-white font-black text-xs tracking-tighter">P</span>
                </div>
              </div>
              <div className="leading-none">
                <p className="font-black text-gray-900 text-sm tracking-tight">PONGS</p>
                <p className="text-gray-400 text-[9px] font-semibold tracking-[0.2em] uppercase mt-0.5">Stretch Ceiling</p>
              </div>
            </a>

            <nav className="flex items-center gap-1">
              <a href="/" className="text-xs font-medium text-gray-500 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                Dashboard
              </a>
              <a href="/quotes/new"
                className="btn-primary text-xs px-4 py-2 gap-1.5">
                <span className="text-base leading-none font-light">+</span> New Quote
              </a>
              <UserMenu />
            </nav>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
          {children}
        </main>

        <footer className="border-t border-gray-100 bg-white/80 mt-auto">
          <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between text-[11px] text-gray-400">
            <span className="font-medium">Next Level Solutions · Pongs India</span>
            <span>Bengaluru · info@pongsindia.com</span>
          </div>
        </footer>
      </body>
    </html>
  )
}
