import { getQuote } from '@/lib/store'
import { notFound } from 'next/navigation'
import { calculateQuote, fmtINR, formatDims, round2 } from '@/lib/calculations'
import type { ItemBreakdown } from '@/lib/types'
import { Printer, Edit, Eye } from 'lucide-react'

export default function TeamPage({ params }: { params: { id: string } }) {
  const quote = getQuote(params.id)
  if (!quote) notFound()

  const bd = calculateQuote(quote)
  const margin = bd.materialsTotalFinal - bd.materialsTotalDealer
  const marginPct = bd.materialsTotalDealer > 0
    ? ((margin / bd.materialsTotalDealer) * 100).toFixed(1)
    : '0'

  const dateStr = new Date(quote.date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div>
      {/* Nav */}
      <div className="no-print flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <a href="/" className="hover:text-slate-600">Quotes</a>
          <span>/</span>
          <span className="text-slate-600">{quote.quoteNumber}</span>
          <span>/</span>
          <span className="font-medium text-slate-800">Team View</span>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/quotes/${quote.id}/client`} className="btn-secondary text-xs gap-1.5">
            <Eye size={14} /> Client View
          </a>
          <a href={`/quotes/${quote.id}/edit`} className="btn-secondary text-xs gap-1.5">
            <Edit size={14} /> Edit
          </a>
          <button onClick={() => window.print()} className="btn-primary text-xs gap-1.5">
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                INTERNAL · {quote.priceTier.toUpperCase()}
                {quote.markupPercent > 0 ? ` +${quote.markupPercent}%` : ''}
              </span>
              <span className="text-slate-400 text-xs">{quote.quoteNumber}</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">{quote.clientName}</h1>
            <p className="text-slate-600 text-sm">{quote.projectName}</p>
            {quote.location && <p className="text-slate-400 text-xs mt-0.5">{quote.location}</p>}
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-slate-400">Date: {dateStr}</p>
            {quote.validUntil && (
              <p className="text-xs text-slate-400">
                Valid: {new Date(quote.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>

        {/* Cost overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">Dealer Cost</p>
            <p className="text-xl font-bold text-slate-700">{fmtINR(bd.materialsTotalDealer)}</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-4">
            <p className="text-xs text-amber-600 mb-1">Quoted Price</p>
            <p className="text-xl font-bold text-amber-700">{fmtINR(bd.materialsTotalFinal)}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4">
            <p className="text-xs text-green-600 mb-1">Gross Margin</p>
            <p className="text-xl font-bold text-green-700">{fmtINR(margin)}</p>
            <p className="text-xs text-green-500">{marginPct}%</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">Grand Total</p>
            <p className="text-xl font-bold text-slate-900">{fmtINR(bd.grandTotal)}</p>
            {bd.installationCost > 0 && (
              <p className="text-xs text-slate-400">incl. installation</p>
            )}
          </div>
        </div>
      </div>

      {/* Item breakdowns */}
      {bd.itemBreakdowns.map((itemBd, idx) => (
        <ItemBreakdownCard key={itemBd.item.id} bd={itemBd} index={idx} />
      ))}

      {/* Footer totals */}
      <div className="card p-6 mt-6">
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="py-2 text-slate-600">Materials (Dealer Cost)</td>
              <td className="py-2 text-right font-semibold text-slate-700">{fmtINR(bd.materialsTotalDealer)}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-2 text-slate-600">Materials ({quote.priceTier.toUpperCase()}{quote.markupPercent > 0 ? ` +${quote.markupPercent}%` : ''})</td>
              <td className="py-2 text-right font-semibold text-slate-700">{fmtINR(bd.materialsTotalFinal)}</td>
            </tr>
            {bd.installationCost > 0 && (
              <tr className="border-b border-slate-100">
                <td className="py-2 text-slate-600">Installation</td>
                <td className="py-2 text-right font-semibold text-slate-700">{fmtINR(bd.installationCost)}</td>
              </tr>
            )}
            <tr>
              <td className="pt-4 font-bold text-slate-900 text-base">Grand Total (Excl. GST)</td>
              <td className="pt-4 text-right font-bold text-amber-600 text-xl">{fmtINR(bd.grandTotal)}</td>
            </tr>
          </tbody>
        </table>
        {quote.notes && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Notes</p>
            <p className="text-sm text-slate-600 whitespace-pre-line">{quote.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function ItemBreakdownCard({ bd, index }: { bd: ItemBreakdown; index: number }) {
  const item = bd.item
  const qty = item.quantity
  const hasMultiple = qty > 1

  return (
    <div className="card mb-4 overflow-hidden">
      {/* Item header */}
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
              {index + 1}
            </span>
            <h3 className="font-semibold text-slate-800">{item.name || `Ceiling Item ${index + 1}`}</h3>
            {hasMultiple && (
              <span className="badge bg-amber-100 text-amber-700">×{qty}</span>
            )}
          </div>
          <div className="text-xs text-slate-500 flex flex-wrap gap-3 ml-7">
            <span>{item.shape.charAt(0).toUpperCase() + item.shape.slice(1)} · {formatDims(item)}</span>
            <span>{round2(bd.areaM2).toFixed(2)} sqm · Perimeter {round2(bd.perimeterM).toFixed(2)} m</span>
            <span>{item.fabricType}</span>
            {item.lightType !== 'none' && (
              <span>Lights: {item.lightType.replace(/_/g, ' ')}</span>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Subtotal{hasMultiple ? ` (×${qty})` : ''}</p>
          <p className="font-bold text-amber-600">{fmtINR(bd.subtotalFinal)}</p>
          <p className="text-xs text-slate-400">Cost: {fmtINR(bd.subtotalDealer)}</p>
        </div>
      </div>

      {/* Fabric detail box */}
      <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 text-xs text-blue-700 flex flex-wrap gap-4">
        <span><strong>Roll:</strong> {bd.fabricDetail.rollWidth}m wide</span>
        <span><strong>Cut:</strong> {bd.fabricDetail.cutLength.toFixed(2)}m</span>
        <span><strong>Total fabric:</strong> {bd.fabricDetail.totalArea.toFixed(2)} sqm</span>
        <span><strong>Used:</strong> {bd.fabricDetail.usedArea.toFixed(2)} sqm</span>
        <span className="text-blue-500"><strong>Wastage:</strong> {bd.fabricDetail.wastageArea.toFixed(2)} sqm ({bd.fabricDetail.wastagePercent.toFixed(1)}%)</span>
      </div>

      {/* LED detail box */}
      {bd.ledDetail && (
        <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 text-xs text-amber-700 flex flex-wrap gap-4">
          <span><strong>Cove depth:</strong> {item.lightDepth}&quot;</span>
          <span><strong>Strips:</strong> {bd.ledDetail.stripCount}</span>
          <span><strong>Strip length:</strong> {bd.ledDetail.runningLength.toFixed(2)}m</span>
          <span><strong>Total LED:</strong> {bd.ledDetail.totalRunningMeters} mtr running</span>
          <span><strong>Total watts:</strong> {bd.ledDetail.totalWatts}W (pre-margin)</span>
        </div>
      )}

      {/* Line items table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Qty</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Unit</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Dealer Rate</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Dealer Amt</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Sell Rate</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Sell Amt</th>
            </tr>
          </thead>
          <tbody>
            {bd.lineItems.map((line, i) => (
              <tr key={i} className="border-b border-slate-50 table-row-hover">
                <td className="px-6 py-3 text-slate-700">{line.description}</td>
                <td className="px-4 py-3 text-right text-slate-600">{line.qty}</td>
                <td className="px-4 py-3 text-right text-slate-400 text-xs">{line.unit}</td>
                <td className="px-4 py-3 text-right text-slate-500">₹{line.dealerRate.toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 text-right text-slate-700 font-medium">₹{Math.round(line.dealerAmount).toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 text-right text-slate-500">₹{line.tierRate.toLocaleString('en-IN')}</td>
                <td className="px-6 py-3 text-right text-slate-700 font-medium">₹{Math.round(line.tierAmount).toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-slate-50">
              <td colSpan={3} className="px-6 py-3 font-semibold text-slate-700">
                Subtotal{hasMultiple ? ` (×${qty})` : ''}
              </td>
              <td className="px-4 py-3" />
              <td className="px-4 py-3 text-right font-bold text-slate-700">{fmtINR(bd.subtotalDealer)}</td>
              <td className="px-4 py-3" />
              <td className="px-6 py-3 text-right font-bold text-amber-600">{fmtINR(bd.subtotalFinal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {item.notes && (
        <div className="px-6 py-3 text-xs text-slate-500 border-t border-slate-100 bg-slate-50">
          <span className="font-semibold">Note:</span> {item.notes}
        </div>
      )}
    </div>
  )
}
