import Link from 'next/link'
import { notFound } from 'next/navigation'
import { dbGetProduct } from '@/lib/db'
import { fmtINR, fmtDate } from '@/lib/format'
import ProductMovementButton from './ProductMovementButton'

type Row = Record<string, unknown>

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const product = (await dbGetProduct(params.id)) as (Row & { movements: Row[] }) | null
  if (!product) notFound()

  const movements = product.movements ?? []
  const currentStock = Number(product.current_stock ?? 0)
  const costPrice = Number(product.cost_price ?? 0)
  const minStock = Number(product.min_stock ?? 0)
  const lowStock = minStock > 0 && currentStock <= minStock

  // Compute running balance forward (movements are oldest-first from db)
  let bal = 0
  type MovRow = Row & { type: string; qty: number; balance: number }
  const withBalance: MovRow[] = movements.map(m => {
    const qty = Number(m.quantity ?? 0)
    const type = String(m.movement_type ?? 'IN').toUpperCase()
    bal += type === 'OUT' ? -qty : qty
    return { ...m, type, qty, balance: bal }
  }).reverse() // newest first for display

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Link href="/inventory/products" className="hover:text-gray-700">Products</Link>
        <span>/</span>
        <span className="text-gray-700">{String(product.name)}</span>
      </div>

      <div className="card">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{String(product.name)}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{String(product.category ?? '—')}{product.sku ? ` · ${product.sku}` : ''}</p>
          </div>
          <ProductMovementButton productId={String(product.id)} productName={String(product.name)} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
          <div>
            <p className="text-xs text-gray-500 mb-1">Current Stock</p>
            <p className={`text-2xl font-bold ${lowStock ? 'text-rose-600' : 'text-emerald-600'}`}>{currentStock} <span className="text-sm font-normal text-gray-400">{String(product.unit ?? '')}</span></p>
            {lowStock && <p className="text-[11px] text-rose-500 mt-0.5">Below min ({minStock})</p>}
          </div>
          <div><p className="text-xs text-gray-500 mb-1">Min Stock</p><p className="text-2xl font-bold text-gray-900">{minStock}</p></div>
          <div><p className="text-xs text-gray-500 mb-1">Cost Price</p><p className="text-2xl font-bold text-gray-900">{fmtINR(costPrice)}</p></div>
          <div><p className="text-xs text-gray-500 mb-1">Stock Value</p><p className="text-2xl font-bold text-gray-900">{fmtINR(currentStock * costPrice)}</p></div>
        </div>
        {product.notes ? <p className="text-sm text-gray-500 mt-4 border-t border-gray-100 pt-3">{String(product.notes)}</p> : null}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-700">Movement History</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs text-gray-500">
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Reference</th>
                <th className="px-4 py-3 font-semibold text-right">Qty</th>
                <th className="px-4 py-3 font-semibold text-right">Balance</th>
                <th className="px-4 py-3 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody>
              {withBalance.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No movements recorded yet</td></tr>
              ) : withBalance.map(m => (
                <tr key={String(m.id)} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(String(m.movement_date ?? m.created_at ?? ''))}</td>
                  <td className="px-4 py-3"><span className={`badge ${m.type === 'OUT' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'}`}>{m.type}</span></td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{String(m.reference_type ?? '—')}{m.reference_id ? ` #${String(m.reference_id).slice(0, 8)}` : ''}</td>
                  <td className={`px-4 py-3 text-right font-medium ${m.type === 'OUT' ? 'text-rose-600' : 'text-emerald-600'}`}>{m.type === 'OUT' ? '−' : '+'}{m.qty}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{m.balance}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{String(m.notes ?? '—')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
