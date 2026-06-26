'use client'
import { Printer } from 'lucide-react'

export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn-primary text-xs gap-1.5 flex items-center">
      <Printer size={14} /> Print / Save PDF
    </button>
  )
}
