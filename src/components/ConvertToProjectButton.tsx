'use client'
import { useState } from 'react'

export default function ConvertToProjectButton({ quoteId, status }: { quoteId: string; status: string }) {
  const [converting, setConverting] = useState(false)
  const [done, setDone] = useState(status === 'approved')

  const convert = async () => {
    if (!confirm('Convert this quote to a project? The quote will be marked as Won.')) return
    setConverting(true)
    const r = await fetch(`/api/quotes/${quoteId}/to-project`, { method: 'POST' })
    const data = await r.json()
    setConverting(false)
    if (data.project_id) {
      setDone(true)
      window.location.href = `/projects/${data.project_id}`
    }
  }

  if (done) {
    return <span className="text-xs bg-green-100 text-green-700 px-3 py-2 rounded-lg font-medium">✓ Converted to Project</span>
  }

  return (
    <button
      onClick={convert}
      disabled={converting}
      className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-medium transition-colors disabled:opacity-60"
    >
      {converting ? 'Converting...' : '→ Convert to Project'}
    </button>
  )
}
