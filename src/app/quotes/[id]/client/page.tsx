import { getQuote } from '@/lib/store'
import { notFound } from 'next/navigation'
import { calculateQuote, fmtINR, formatDims } from '@/lib/calculations'
import { Printer, Edit, Users } from 'lucide-react'

export default function ClientPage({ params }: { params: { id: string } }) {
  const quote = getQuote(params.id)
  if (!quote) notFound()

  const bd = calculateQuote(quote)

  const dateStr = new Date(quote.date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  const validStr = quote.validUntil
    ? new Date(quote.validUntil).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null

  return (
    <div>
      {/* Nav bar — no-print */}
      <div className="no-print flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <a href="/" className="hover:text-slate-600">Quotes</a>
          <span>/</span>
          <span className="text-slate-600">{quote.quoteNumber}</span>
          <span>/</span>
          <span className="font-medium text-slate-800">Client View</span>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/quotes/${quote.id}/team`} className="btn-secondary text-xs gap-1.5">
            <Users size={14} /> Team View
          </a>
          <a href={`/quotes/${quote.id}/edit`} className="btn-secondary text-xs gap-1.5">
            <Edit size={14} /> Edit
          </a>
          <button onClick={() => window.print()} className="btn-primary text-xs gap-1.5">
            <Printer size={14} /> Print / PDF
          </button>
        </div>
      </div>

      {/* Printable quote */}
      <div className="card max-w-3xl mx-auto p-10">
        {/* Company header */}
        <div className="flex items-start justify-between mb-8 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">PONGS</h1>
                <p className="text-xs text-slate-500 font-medium tracking-widest">STRETCH CEILING</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">Sidharth Trading Co.</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Quotation</p>
            <p className="text-lg font-bold text-slate-800">{quote.quoteNumber}</p>
            <p className="text-xs text-slate-500 mt-1">Date: {dateStr}</p>
            {validStr && <p className="text-xs text-slate-400">Valid until: {validStr}</p>}
          </div>
        </div>

        {/* Client details */}
        <div className="mb-8">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Prepared for</p>
          <p className="font-bold text-slate-900 text-lg">{quote.clientName}</p>
          {quote.projectName && <p className="text-slate-600">{quote.projectName}</p>}
          {quote.location && <p className="text-slate-400 text-sm">{quote.location}</p>}
        </div>

        {/* Items table */}
        <div className="mb-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="text-left py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-8">#</th>
                <th className="text-left py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</th>
                <th className="text-right py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-24">Amount</th>
              </tr>
            </thead>
            <tbody>
              {bd.itemBreakdowns.map((itemBd, idx) => {
                const item = itemBd.item
                const hasLights = item.lightType !== 'none'
                const lightLabel: Record<string, string> = {
                  single_color: 'Single Colour LED Cove',
                  single_color_dimmable: 'Dimmable LED Cove',
                  tunable: 'Tunable White LED Cove',
                  rgb: 'RGB LED Cove',
                  rgbw: 'RGBW LED Cove',
                }

                return (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="py-4 text-slate-400 align-top">{idx + 1}</td>
                    <td className="py-4 align-top">
                      <p className="font-semibold text-slate-800">
                        Stretch Ceiling — {item.name || `Item ${idx + 1}`}
                        {item.quantity > 1 && <span className="text-slate-500 font-normal"> ×{item.quantity}</span>}
                      </p>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {item.fabricType} · {formatDims(item)}
                      </p>
                      {hasLights && (
                        <p className="text-slate-500 text-xs mt-0.5">
                          With {lightLabel[item.lightType] ?? 'LED Cove Lighting'}
                          {item.lightDepth ? ` (${item.lightDepth}" depth)` : ''}
                        </p>
                      )}
                      {item.withPrinting && (
                        <p className="text-slate-500 text-xs mt-0.5">With custom printing</p>
                      )}
                      {item.notes && (
                        <p className="text-slate-400 text-xs mt-0.5 italic">{item.notes}</p>
                      )}
                    </td>
                    <td className="py-4 text-right font-semibold text-slate-800 align-top">
                      {fmtINR(itemBd.subtotalFinal)}
                    </td>
                  </tr>
                )
              })}

              {bd.totalInstallation > 0 && (
                <tr className="border-b border-slate-100">
                  <td className="py-4 text-slate-400">{bd.itemBreakdowns.length + 1}</td>
                  <td className="py-4">
                    <p className="font-semibold text-slate-800">Installation Charges</p>
                  </td>
                  <td className="py-4 text-right font-semibold text-slate-800">
                    {fmtINR(bd.totalInstallation)}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200">
                <td colSpan={2} className="pt-4 font-bold text-slate-900 text-base">
                  Total (Excl. GST)
                </td>
                <td className="pt-4 text-right font-bold text-amber-600 text-xl">
                  {fmtINR(bd.grandTotal)}
                </td>
              </tr>
              <tr>
                <td colSpan={3} className="pt-1">
                  <p className="text-xs text-slate-400 text-right">GST as applicable</p>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Notes */}
        {quote.notes && (
          <div className="mb-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Terms & Notes</p>
            <p className="text-sm text-slate-600 whitespace-pre-line">{quote.notes}</p>
          </div>
        )}

        {/* Standard terms */}
        <div className="text-xs text-slate-400 space-y-1 border-t border-slate-100 pt-6">
          <p className="font-semibold text-slate-500 mb-2">Terms & Conditions</p>
          <p>1. Installation and taxes will be extra unless stated above.</p>
          <p>2. 100% advance payment before dispatch of material.</p>
          <p>3. Dispatch within a week subject to material availability.</p>
          <p>4. Printed fabric dispatched 8–10 days after crop image confirmation and payment.</p>
          <p>5. Local forwarding & packing charges extra as per actual.</p>
          <p>6. Transportation charges payable at time of delivery.</p>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">
            This quotation is valid until{' '}
            <span className="font-medium text-slate-600">{validStr ?? '—'}</span>.
            For queries, contact Sidharth Trading Co. (Pongs Stretch Ceiling).
          </p>
        </div>
      </div>
    </div>
  )
}
