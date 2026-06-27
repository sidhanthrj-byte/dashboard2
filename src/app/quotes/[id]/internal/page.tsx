import { dbGetQuote } from "@/lib/db"
export const dynamic = 'force-dynamic'
import { notFound } from 'next/navigation'
import { calculateQuote, fmtINR, round2 } from '@/lib/calculations'
import { Edit, Eye, Users } from 'lucide-react'
import PrintButton from '@/components/PrintButton'

export default async function InternalPage({ params }: { params: { id: string } }) {
  const quote = await dbGetQuote(params.id)
  if (!quote) notFound()

  const bd = calculateQuote(quote)

  const dateStr = new Date(quote.date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const tierLabel = quote.priceTier === 'manual' ? 'Manual' : quote.priceTier.toUpperCase()

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Nav */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-400 flex-wrap">
          <a href="/" className="hover:text-slate-600">Quotes</a>
          <span>/</span>
          <span className="text-slate-600">{quote.quoteNumber}</span>
          <span>/</span>
          <span className="font-medium text-slate-800">Internal Cost Review</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a href={`/quotes/${quote.id}/team`} className="btn-secondary text-xs gap-1.5">
            <Users size={14} /> Team View
          </a>
          <a href={`/quotes/${quote.id}/client`} className="btn-secondary text-xs gap-1.5">
            <Eye size={14} /> Client View
          </a>
          <a href={`/quotes/${quote.id}/edit`} className="btn-secondary text-xs gap-1.5">
            <Edit size={14} /> Edit
          </a>
          <PrintButton />
        </div>
      </div>

      {/* Header */}
      <div className="border border-slate-300 rounded-lg overflow-hidden mb-6">
        <div className="bg-slate-800 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Internal Cost Review · {tierLabel}
            </p>
            <h1 className="text-xl font-bold">{quote.clientName}</h1>
            {quote.projectName && <p className="text-slate-300 text-sm">{quote.projectName}</p>}
            {quote.location && <p className="text-slate-400 text-xs">{quote.location}</p>}
          </div>
          <div className="text-right text-sm text-slate-300">
            <p>Date: {dateStr}</p>
            <p className="text-xs text-slate-400 mt-0.5">{quote.quoteNumber}</p>
          </div>
        </div>
      </div>

      {/* Per-item breakdowns */}
      {bd.itemBreakdowns.map((item, idx) => {
        const d = item.item.dimensions as unknown as Record<string, number>
        const dimStr = item.item.shape === 'circle'
          ? `Ø${d.diameter} ${item.item.unit}`
          : `${d.dim1 ?? 0} × ${d.dim2 ?? 0} ${item.item.unit}`

        return (
          <div key={item.item.id} className="mb-8 border border-slate-200 rounded-lg overflow-hidden">
            {/* Item header */}
            <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-slate-800 text-white text-sm font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <div>
                  <span className="font-semibold text-slate-800">
                    {item.item.name || `Item ${idx + 1}`}
                  </span>
                  <span className="text-xs text-slate-500 ml-3">
                    {dimStr} · {item.item.fabricType}
                    {item.item.lightType !== 'none' && ` · ${item.item.lightType.replace(/_/g, ' ')}`}
                    {item.item.quantity > 1 && ` · Qty: ${item.item.quantity}`}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Area: {round2(item.areaM2 * 10.7639).toFixed(2)} sqft ({item.areaM2.toFixed(2)} sqm)</p>
                {item.item.quantity > 1 && <p className="text-xs text-slate-400">× {item.item.quantity} = {round2(item.areaM2 * item.item.quantity * 10.7639).toFixed(2)} sqft total</p>}
              </div>
            </div>

            {/* Fabric info */}
            <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 text-xs text-blue-800">
              {item.fabricDetail.panels.map((panel, pi) => (
                <span key={pi} className="mr-6">
                  {item.fabricDetail.panels.length > 1 ? `Panel ${pi + 1}: ` : ''}
                  <strong>{panel.orientation}</strong> · Billed: {panel.panelArea.toFixed(2)} sqm · Used: {panel.usedArea.toFixed(2)} sqm · Waste: {panel.wastageArea.toFixed(2)} sqm ({panel.wastagePercent.toFixed(1)}%)
                </span>
              ))}
            </div>

            {/* LED info */}
            {item.ledDetail && (
              <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 text-xs text-amber-800">
                <strong>LED:</strong> {item.ledDetail.stripCount} strips × {item.ledDetail.runningLengthM.toFixed(2)}m = {item.ledDetail.totalRunningMeters}m running · {item.ledDetail.totalWatts}W · Strip gap: {item.item.ledSpacingMM ?? 125}mm
              </div>
            )}

            {/* Line items table */}
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="text-left px-5 py-2.5 font-semibold w-8">#</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Description</th>
                  <th className="text-right px-3 py-2.5 font-semibold">Qty</th>
                  <th className="text-right px-3 py-2.5 font-semibold">Unit</th>
                  <th className="text-right px-3 py-2.5 font-semibold">Rate</th>
                  <th className="text-right px-5 py-2.5 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {item.lineItems.map((li, li_idx) => {
                  const qty = item.item.quantity
                  const totalQty = round2(li.qty * qty)
                  const totalAmt = round2(li.tierAmount * qty)
                  return (
                  <tr key={li_idx} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-5 py-2.5 text-xs text-slate-400">{li_idx + 1}</td>
                    <td className="px-3 py-2.5 text-slate-700">{li.description}</td>
                    <td className="px-3 py-2.5 text-right text-slate-700">{totalQty}{qty > 1 && <span className="text-xs text-slate-400 ml-1">({li.qty}×{qty})</span>}</td>
                    <td className="px-3 py-2.5 text-right text-slate-500 text-xs">{li.unit}</td>
                    <td className="px-3 py-2.5 text-right text-slate-600">{fmtINR(li.tierRate)}</td>
                    <td className="px-5 py-2.5 text-right font-medium text-slate-800">{fmtINR(totalAmt)}</td>
                  </tr>
                  )
                })}
                {/* Installation */}
                <tr className="border-b border-slate-100 bg-green-50">
                  <td className="px-5 py-2.5 text-xs text-slate-400">{item.lineItems.length + 1}</td>
                  <td className="px-3 py-2.5 text-slate-700">
                    Installation · {round2(item.areaM2 * 10.7639 * item.item.quantity).toFixed(2)} sqft @ ₹{quote.installationRatePerSqft}/sqft
                    {item.item.quantity > 1 && <span className="text-xs text-slate-400 ml-1">({round2(item.areaM2 * 10.7639).toFixed(2)} × {item.item.quantity})</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-700">{round2(item.areaM2 * 10.7639 * item.item.quantity).toFixed(2)}</td>
                  <td className="px-3 py-2.5 text-right text-slate-500 text-xs">sqft</td>
                  <td className="px-3 py-2.5 text-right text-slate-600">₹{quote.installationRatePerSqft}</td>
                  <td className="px-5 py-2.5 text-right font-medium text-green-700">{fmtINR(item.installationCost)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-semibold">
                  <td colSpan={5} className="px-5 py-3 text-right text-slate-700">
                    Item Subtotal {item.item.quantity > 1 ? `(× ${item.item.quantity})` : ''}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-900">{fmtINR(item.itemTotal)}</td>
                </tr>
              </tfoot>
            </table>
            </div>
          </div>
        )
      })}

      {/* Grand total */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="px-5 py-3 text-slate-600">Materials Sub-total</td>
              <td className="px-5 py-3 text-right text-slate-700">{fmtINR(bd.materialsTotalFinal)}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="px-5 py-3 text-slate-600">Total Installation</td>
              <td className="px-5 py-3 text-right text-slate-600">{fmtINR(bd.totalInstallation)}</td>
            </tr>
            {bd.transportCost > 0 && (
              <tr className="border-b border-slate-100">
                <td className="px-5 py-3 text-slate-600">Packing &amp; Transport</td>
                <td className="px-5 py-3 text-right text-slate-600">{fmtINR(bd.transportCost)}</td>
              </tr>
            )}
            <tr className="border-b border-slate-200 bg-slate-50 font-semibold">
              <td className="px-5 py-3 text-slate-800">Sub-total (before GST)</td>
              <td className="px-5 py-3 text-right text-slate-800">{fmtINR(bd.subtotalBeforeGst)}</td>
            </tr>
            {bd.gstAmount > 0 && (
              <tr className="border-b border-slate-100">
                <td className="px-5 py-3 text-slate-600">GST @ 18%</td>
                <td className="px-5 py-3 text-right text-slate-600">{fmtINR(bd.gstAmount)}</td>
              </tr>
            )}
            <tr className="bg-slate-800 text-white font-bold text-base">
              <td className="px-5 py-4">Grand Total</td>
              <td className="px-5 py-4 text-right">{fmtINR(bd.grandTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
