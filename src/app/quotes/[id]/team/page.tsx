import { dbGetQuote } from "@/lib/db"
export const dynamic = 'force-dynamic'
import { notFound, redirect } from 'next/navigation'
import { calculateQuote, fmtINR, formatDims, round2 } from '@/lib/calculations'
import { getSession, canAccessQuote } from '@/lib/auth'
import { getCompany } from '@/lib/companies'
import type { ItemBreakdown } from '@/lib/types'
import { Edit, Eye, AlertTriangle } from 'lucide-react'
import PrintButton from '@/components/PrintButton'

export default async function TeamPage({ params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) redirect('/login')
  const quote = await dbGetQuote(params.id)
  if (!quote || !canAccessQuote(session, quote)) notFound()
  const company = getCompany(quote.company)

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

          <PrintButton />
        </div>
      </div>

      {/* Header */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                INTERNAL · {quote.priceTier.toUpperCase()}
                {quote.markupPercent > 0 ? ` +${quote.markupPercent}%` : ''}
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${company.badgeClass}`}>
                {company.name} · {company.legalName}
              </span>
              <span className="text-slate-400 text-xs">{quote.quoteNumber}</span>
              {quote.createdByName && (
                <span className="text-slate-400 text-xs">by {quote.createdByName}</span>
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-900">{quote.clientName}</h1>
            <p className="text-slate-600 text-sm">{quote.projectName}</p>
            {quote.location && <p className="text-slate-400 text-xs mt-0.5">{quote.location}</p>}
            {quote.clientEmail && <p className="text-slate-400 text-xs">{quote.clientEmail}</p>}
            {quote.clientPhone && <p className="text-slate-400 text-xs">{quote.clientPhone}</p>}
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
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-6 pt-5 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">Dealer Cost</p>
            <p className="text-xl font-bold text-slate-700">{fmtINR(bd.materialsTotalDealer)}</p>
          </div>
          <div className="bg-slate-100 rounded-xl p-4">
            <p className="text-xs text-slate-600 mb-1">Materials (Quoted)</p>
            <p className="text-xl font-bold text-slate-800">{fmtINR(bd.materialsTotalFinal)}</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4">
            <p className="text-xs text-emerald-600 mb-1">Gross Margin</p>
            <p className="text-xl font-bold text-emerald-700">{fmtINR(margin)}</p>
            <p className="text-xs text-emerald-500">{marginPct}%</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-xs text-blue-600 mb-1">Installation</p>
            <p className="text-xl font-bold text-blue-700">{fmtINR(bd.totalInstallation)}</p>
            <p className="text-xs text-blue-400">₹{quote.installationRatePerSqft ?? 60}/sqft</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-400 mb-1">Grand Total</p>
            <p className="text-xl font-bold text-white">{fmtINR(bd.grandTotal)}</p>
            <p className="text-xs text-slate-400">
              {quote.includeGst ? 'Incl. GST' : 'Excl. GST'}
            </p>
          </div>
        </div>

        {/* Per-sqft display */}
        {bd.totalSqft > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex gap-6 text-sm">
            <span className="text-slate-500">Total area: <strong className="text-slate-800">{bd.totalSqft.toFixed(1)} sqft</strong></span>
            <span className="text-slate-500">Rate: <strong className="text-slate-800">{fmtINR(bd.pricePerSqft)}/sqft</strong></span>
            {bd.transportCost > 0 && <span className="text-slate-500">Transport: <strong className="text-slate-800">{fmtINR(bd.transportCost)}</strong></span>}
            {bd.gstAmount > 0 && <span className="text-slate-500">GST (18%): <strong className="text-slate-800">{fmtINR(bd.gstAmount)}</strong></span>}
          </div>
        )}
      </div>

      {/* Item breakdowns */}
      {bd.itemBreakdowns.map((itemBd, idx) => (
        <ItemBreakdownCard key={itemBd.item.id} bd={itemBd} index={idx} installRate={quote.installationRatePerSqft ?? 60} />
      ))}

      {/* Footer totals */}
      <div className="card p-6 mt-6">
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="py-2 text-slate-600">Materials — Dealer Cost</td>
              <td className="py-2 text-right font-semibold text-slate-700">{fmtINR(bd.materialsTotalDealer)}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-2 text-slate-600">
                Materials — Quoted
                {quote.markupPercent > 0 && <span className="text-xs text-slate-400 ml-1">(+{quote.markupPercent}% markup)</span>}
              </td>
              <td className="py-2 text-right font-semibold text-slate-700">{fmtINR(bd.materialsTotalFinal)}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-2 text-blue-600 font-medium">
                Installation
                <span className="text-xs text-slate-400 font-normal ml-1">(₹{quote.installationRatePerSqft ?? 60}/sqft on actual area)</span>
              </td>
              <td className="py-2 text-right font-semibold text-blue-700">{fmtINR(bd.totalInstallation)}</td>
            </tr>
            {bd.transportCost > 0 && (
              <tr className="border-b border-slate-100">
                <td className="py-2 text-slate-600">Transport</td>
                <td className="py-2 text-right font-semibold text-slate-700">{fmtINR(bd.transportCost)}</td>
              </tr>
            )}
            <tr className="border-b border-slate-100">
              <td className="py-2 text-slate-600">Subtotal (before GST)</td>
              <td className="py-2 text-right font-semibold text-slate-700">{fmtINR(bd.subtotalBeforeGst)}</td>
            </tr>
            {bd.gstAmount > 0 && (
              <tr className="border-b border-slate-100">
                <td className="py-2 text-slate-600">GST 18%</td>
                <td className="py-2 text-right font-semibold text-slate-700">{fmtINR(bd.gstAmount)}</td>
              </tr>
            )}
            <tr>
              <td className="pt-4 font-bold text-slate-900 text-base">Grand Total</td>
              <td className="pt-4 text-right font-bold text-slate-900 text-xl">{fmtINR(bd.grandTotal)}</td>
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

function ItemBreakdownCard({ bd, index, installRate }: { bd: ItemBreakdown; index: number; installRate: number }) {
  const item = bd.item
  const qty = item.quantity
  const hasMultiple = qty > 1

  return (
    <div className="card mb-4 overflow-hidden">
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="w-5 h-5 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center shrink-0">
              {index + 1}
            </span>
            <h3 className="font-semibold text-slate-800">{item.name || `Ceiling Item ${index + 1}`}</h3>
            {hasMultiple && <span className="badge bg-slate-100 text-slate-700">×{qty}</span>}
          </div>
          <div className="text-xs text-slate-500 flex flex-wrap gap-3 ml-7">
            <span>{item.shape.charAt(0).toUpperCase() + item.shape.slice(1)} · {formatDims(item)}</span>
            <span>{round2(bd.areaM2).toFixed(2)} sqm · Perimeter {round2(bd.perimeterM).toFixed(2)} m</span>
            <span>{item.fabricType}</span>
            {item.lightType !== 'none' && <span>Lights: {item.lightType.replace(/_/g, ' ')}</span>}
            {bd.fabricDetail.hasJoint && <span className="font-medium text-slate-700">Joint: {bd.fabricDetail.jointPosition}</span>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Item Total{hasMultiple ? ` (×${qty})` : ''}</p>
          <p className="font-bold text-slate-900">{fmtINR(bd.itemTotal)}</p>
          <p className="text-xs text-slate-400">Dealer: {fmtINR(bd.subtotalDealer)}</p>
          <p className="text-xs text-blue-500">Install: {fmtINR(bd.installationCost)}</p>
        </div>
      </div>

      {/* Fabric detail */}
      <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 text-xs text-blue-700 space-y-1">
        {bd.fabricDetail.panels.map((panel, i) => (
          <div key={i} className="flex flex-wrap gap-4">
            <span><strong>Panel {bd.fabricDetail.panels.length > 1 ? i+1 : ''}:</strong> {panel.orientation}</span>
            <span><strong>Billed:</strong> {panel.panelArea.toFixed(2)} sqm</span>
            <span><strong>Used:</strong> {panel.usedArea.toFixed(2)} sqm</span>
            <span><strong>Waste:</strong> {panel.wastageArea.toFixed(2)} sqm ({panel.wastagePercent.toFixed(1)}%)</span>
            {panel.isJoint && <span className="font-medium">• Joint panel</span>}
          </div>
        ))}
        <div className="flex flex-wrap gap-4 pt-1 border-t border-blue-100 font-medium">
          <span>Total billed: {bd.fabricDetail.totalBilledArea.toFixed(2)} sqm</span>
          <span>Total used: {bd.fabricDetail.totalUsedArea.toFixed(2)} sqm</span>
          <span>Total waste: {bd.fabricDetail.totalWastageArea.toFixed(2)} sqm</span>
        </div>
      </div>

      {/* LED detail */}
      {bd.ledDetail && (
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 text-xs text-slate-600 flex flex-wrap gap-4">
          <span><strong>Cove depth:</strong> {item.lightDepth}"</span>
          <span><strong>Strips:</strong> {bd.ledDetail.stripCount}{qty > 1 ? ' / pc' : ''}</span>
          <span><strong>Strip length:</strong> {bd.ledDetail.runningLengthM.toFixed(2)}m</span>
          <span><strong>Total LED:</strong> {bd.ledDetail.totalRunningMeters} mtr running{qty > 1 ? ` (all ${qty} pcs)` : ''}</span>
          <span><strong>Load:</strong> {bd.ledDetail.totalWatts}W total</span>
          {qty > 1 && (
            <span className="font-medium text-slate-700">
              {bd.ledDetail.lightingConfig === 'looped'
                ? 'Looped — one continuous system, drivers sized on combined wattage'
                : 'Non-looped — each piece driven independently'}
            </span>
          )}
        </div>
      )}

      {/* Manual driver advisory warning (non-blocking) */}
      {bd.driverWarning && (
        <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 text-xs text-amber-700 flex items-start gap-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>{bd.driverWarning}</span>
        </div>
      )}

      {/* Line items */}
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
            <tr className="border-t border-slate-200 bg-slate-50">
              <td colSpan={3} className="px-6 py-3 font-semibold text-slate-700">
                Materials Subtotal{hasMultiple ? ` (×${qty})` : ''}
              </td>
              <td className="px-4 py-3" />
              <td className="px-4 py-3 text-right font-bold text-slate-700">{fmtINR(bd.subtotalDealer)}</td>
              <td className="px-4 py-3" />
              <td className="px-6 py-3 text-right font-bold text-slate-700">{fmtINR(bd.subtotalFinal)}</td>
            </tr>
            <tr className="bg-blue-50 border-t border-blue-100">
              <td colSpan={3} className="px-6 py-3 font-semibold text-blue-700">
                Installation{hasMultiple ? ` (×${qty})` : ''}
                <span className="text-xs font-normal text-blue-500 ml-1">
                  ({bd.areaM2.toFixed(2)} sqm × {(bd.areaM2 * 10.7639).toFixed(1)} sqft × ₹{installRate}/sqft)
                </span>
              </td>
              <td className="px-4 py-3" />
              <td className="px-4 py-3 text-right text-blue-400">—</td>
              <td className="px-4 py-3" />
              <td className="px-6 py-3 text-right font-bold text-blue-700">{fmtINR(bd.installationCost)}</td>
            </tr>
            <tr className="border-t-2 border-slate-300 bg-slate-50">
              <td colSpan={6} className="px-6 py-3 font-bold text-slate-800">Item Total</td>
              <td className="px-6 py-3 text-right font-bold text-slate-900 text-base">{fmtINR(bd.itemTotal)}</td>
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
