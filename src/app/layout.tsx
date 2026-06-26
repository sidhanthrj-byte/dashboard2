import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Pongs Quotation | Sidharth Trading',
  description: 'Stretch ceiling quotation system',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
            <a href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <div>
                <span className="font-bold text-slate-900 text-sm tracking-tight">PONGS</span>
                <span className="text-slate-400 text-xs ml-2">Stretch Ceiling</span>
              </div>
            </a>
            <nav className="flex items-center gap-1">
              <a href="/" className="btn-ghost text-xs px-3 py-1.5">Quotes</a>
              <a href="/quotes/new" className="btn-primary text-xs px-3 py-1.5">+ New Quote</a>
            </nav>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}
