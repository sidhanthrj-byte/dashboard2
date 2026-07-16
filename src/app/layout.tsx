import type { Metadata } from 'next'
import './globals.css'
import AppFrame from '@/components/AppFrame'

export const metadata: Metadata = {
  title: 'Pongs Quotation System',
  description: 'Professional stretch ceiling quotation system by Pongs India',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <AppFrame>{children}</AppFrame>
      </body>
    </html>
  )
}
