export const dynamic = 'force-dynamic'

import { dbListProducts } from '@/lib/db'

type Row = Record<string, unknown>

export default async function FabricRollsPage() {
  const all = (await dbListProducts()) as unknown as Row[]
  const rolls = all.filter(p => String(p.category ?? '').toLowerCase().includes('fabric'))

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Fabric Roll Tracker</h1>
        <p className="text-sm text-gray-500 mt-0.5">{rolls.length} fabric product{rolls.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs text-gray-500">
                <th className="px-4 py-3 font-semibold">Roll Name</th>
                <th className="px-4 py-3 font-semibold">SKU</th>
                <th className="px-4 py-3 font-semibold">Current Stock</th>
                <th className="px-4 py-3 font-semibold">Unit</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rolls.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                  <p className="font-medium">No fabric rolls found</p>
                  <p className="text-xs mt-1">Add products with a Fabric category to track them here</p>
                </td></tr>
              ) : rolls.map(p => {
                const stock = Number(p.current_stock ?? 0)
                const min = Number(p.min_stock ?? 0)
                const out = stock <= 0
                const low = !out && min > 0 && stock <= min
                return (
                  <tr key={String(p.id)} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{String(p.name)}</td>
                    <td className="px-4 py-3 text-gray-500">{String(p.sku ?? '—')}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">{stock}</td>
                    <td className="px-4 py-3 text-gray-500">{String(p.unit ?? 'm')}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${out ? 'bg-rose-50 text-rose-600' : low ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {out ? 'Out of Stock' : low ? 'Low' : 'In Stock'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
