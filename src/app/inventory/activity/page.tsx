'use client'

import { useEffect, useState } from 'react'
import { ShoppingCart, ArrowLeftRight } from 'lucide-react'

interface ActivityItem {
  id: string; type: 'purchase' | 'movement'; title: string; date: string; details: string
}

export default function ActivityPage() {
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/inventory/purchases').then(r => r.json()),
      fetch('/api/inventory/movements').then(r => r.json()),
    ]).then(([purchases, movements]) => {
      const items: ActivityItem[] = [
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...purchases.map((p: any) => ({
          id: `p-${p.id}`,
          type: 'purchase' as const,
          title: `Purchase ${p.purchase_number}`,
          date: p.purchase_date ?? p.created_at ?? '',
          details: `${p.supplier_name ?? 'Unknown supplier'} · ₹${Number(p.total_amount).toLocaleString('en-IN')}`,
        })),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...movements.map((m: any) => ({
          id: `m-${m.id}`,
          type: 'movement' as const,
          title: `${m.movement_type} Movement — ${m.product_name ?? 'Unknown'}`,
          date: m.movement_date ?? m.created_at ?? '',
          details: `Qty: ${m.quantity}${m.reference_type ? ` · Ref: ${m.reference_type}` : ''}${m.notes ? ` · ${m.notes}` : ''}`,
        })),
      ]
      items.sort((a, b) => b.date.localeCompare(a.date))
      setActivity(items)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-5">Activity Feed</h1>
      {loading ? <div className="text-gray-400 text-sm">Loading...</div> : (
        <div className="space-y-2">
          {activity.map(item => (
            <div key={item.id} className="card flex items-start gap-3 py-3">
              <div className={`mt-0.5 p-2 rounded-lg ${item.type === 'purchase' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                {item.type === 'purchase' ? <ShoppingCart size={14} /> : <ArrowLeftRight size={14} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{item.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.details}</p>
              </div>
              <p className="text-xs text-gray-400 whitespace-nowrap">{item.date ? String(item.date).slice(0, 10) : ''}</p>
            </div>
          ))}
          {!activity.length && <p className="text-gray-400 text-sm text-center py-12">No activity yet.</p>}
        </div>
      )}
    </div>
  )
}
