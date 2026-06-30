'use client'
import { useState } from 'react'

export default function ImportPage() {
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ ok?: boolean; imported?: Record<string, number>; totals?: Record<string, number>; error?: string } | null>(null)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<Record<string, unknown> | null>(null)

  const testConnection = async () => {
    setTesting(true)
    setTestResult(null)
    const r = await fetch('/api/admin/import-airtable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: 'pongs-import-2024', test: true })
    })
    const data = await r.json()
    setTestResult(data)
    setTesting(false)
  }

  const runImport = async () => {
    setImporting(true)
    setResult(null)
    const r = await fetch('/api/admin/import-airtable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: 'pongs-import-2024' })
    })
    const data = await r.json()
    setResult(data)
    setImporting(false)
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Import from Airtable</h1>
        <p className="text-sm text-gray-500 mt-1">Syncs inventory products, suppliers, and customers from your Airtable workspace</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full inline-block" />
            76 inventory products (with stock levels, prices)
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full inline-block" />
            10 suppliers
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full inline-block" />
            28 customers / clients
          </div>
        </div>

        <p className="text-xs text-gray-400">Already-imported records will be skipped (safe to run multiple times)</p>

        <div className="flex gap-3">
          <button
            onClick={testConnection}
            disabled={testing}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-60"
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          <button
            onClick={runImport}
            disabled={importing}
            className="flex-1 btn-primary py-2.5 disabled:opacity-60"
          >
            {importing ? 'Importing from Airtable...' : 'Start Import'}
          </button>
        </div>

        {testResult && (
          <div className={`p-3 rounded-xl text-xs font-mono break-all ${testResult.error ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-gray-50 border border-gray-200 text-gray-700'}`}>
            <div className="font-semibold mb-1 text-sm font-sans">Connection test result:</div>
            <pre className="whitespace-pre-wrap">{JSON.stringify(testResult, null, 2)}</pre>
          </div>
        )}

        {result && (
          <div className={`p-4 rounded-xl text-sm ${result.ok ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            {result.ok ? (
              <div className="space-y-1 text-green-800">
                <div className="font-semibold">Import complete!</div>
                {result.totals && Object.entries(result.totals).map(([k, v]) => (
                  <div key={k}>✓ {v} {k} in database ({result.imported?.[k] ?? 0} new)</div>
                ))}
                {!result.totals && result.imported && Object.entries(result.imported).map(([k, v]) => (
                  <div key={k}>• {v} new {k} imported</div>
                ))}
              </div>
            ) : (
              <div className="text-red-700 font-mono text-xs break-all">{String(result.error)}</div>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center">
        After import, view your data in <a href="/inventory" className="text-blue-500 hover:underline">Inventory</a> and <a href="/clients" className="text-blue-500 hover:underline">Clients</a>
      </p>
    </div>
  )
}
