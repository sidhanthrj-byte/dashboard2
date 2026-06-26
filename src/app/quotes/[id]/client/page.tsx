import { dbGetQuote } from "@/lib/db"
export const dynamic = 'force-dynamic'
import { notFound } from 'next/navigation'
import { calculateQuote, fmtINR, formatDims } from '@/lib/calculations'
import { Edit, Users } from 'lucide-react'
import PrintButton from '@/components/PrintButton'
import SharePDF from '@/components/SharePDF'

export default async function ClientPage({ params }: { params: { id: string } }) {
  const quote = await dbGetQuote(params.id)
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

  const hasLighting = quote.items.some(i => i.lightType !== 'none')
  const hasGripper  = quote.items.length > 0
  const hasPrinting = quote.items.some(i => i.withPrinting)

  const waMessage = encodeURIComponent(
    `*PONGS Stretch Ceiling – Quotation*\n\n` +
    `*Quote:* ${quote.quoteNumber}\n` +
    `*Client:* ${quote.clientName}\n` +
    `*Project:* ${quote.projectName || '—'}\n` +
    `*Date:* ${dateStr}\n\n` +
    `*Grand Total: ${fmtINR(bd.grandTotal)}*${quote.includeGst ? ' (Incl. GST)' : ' (Excl. GST)'}\n\n` +
    `_Sidharth Trading Co. | PONGS Stretch Ceiling_`
  )
  const waUrl = `https://wa.me/${ quote.clientPhone ? quote.clientPhone.replace(/\D/g,'') : ''}?text=${waMessage}`
  const mailUrl = `mailto:${quote.clientEmail ?? ''}?subject=Quotation ${quote.quoteNumber} - PONGS Stretch Ceiling&body=${encodeURIComponent(`Dear ${quote.clientName},\n\nPlease find attached our quotation ${quote.quoteNumber} for ${quote.projectName || 'your project'}.\n\nGrand Total: ${fmtINR(bd.grandTotal)}${quote.includeGst ? ' (Incl. GST)' : ' (Excl. GST)'}\n\nValid until: ${validStr ?? '30 days from date'}\n\nBest regards,\nSidharth Trading Co.\nPONGS Stretch Ceiling`)}`

  const lightLabel: Record<string, string> = {
    single_color: 'Single Colour LED Cove',
    single_color_dimmable: 'Dimmable LED Cove',
    tunable: 'Tunable White LED Cove',
    tunable_dali: 'Tunable White LED Cove (DALI)',
    rgb: 'RGB LED Cove',
    rgbw: 'RGBW LED Cove',
  }

  return (
    <div>
      {/* Action bar — no-print */}
      <div className="no-print flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <a href="/" className="hover:text-slate-600">Quotes</a>
          <span>/</span>
          <span className="text-slate-600">{quote.quoteNumber}</span>
          <span>/</span>
          <span className="font-medium text-slate-800">Client View</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a href={`/quotes/${quote.id}/team`} className="btn-secondary text-xs gap-1.5">
            <Users size={14} /> Team View
          </a>
          <a href={`/quotes/${quote.id}/edit`} className="btn-secondary text-xs gap-1.5">
            <Edit size={14} /> Edit
          </a>
          <PrintButton />
          <SharePDF
            quoteNumber={quote.quoteNumber}
            clientName={quote.clientName}
            waUrl={waUrl}
            mailUrl={mailUrl}
          />
        </div>
      </div>

      {/* ─── Page 1: Quotation ─── */}
      <div id="quote-printable" className="max-w-3xl mx-auto print:max-w-none">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-10 mb-0 print:shadow-none print:border-0 print:rounded-none print:p-8">

          {/* Company header */}
          <div className="flex items-start justify-between mb-8 pb-7 border-b-2 border-slate-900">
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">PONGS</h1>
              <p className="text-xs font-semibold text-slate-500 tracking-[0.25em] mt-1">STRETCH CEILING SYSTEMS</p>
              <div className="mt-3 text-xs text-slate-500 space-y-0.5">
                <p className="font-medium text-slate-700">Sidharth Trading Co.</p>
                <p>Bengaluru, Karnataka</p>
                <p>GST: [GST Number]</p>
                <p>Ph: [Phone Number]</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-1">Quotation</p>
              <p className="text-2xl font-bold text-slate-900">{quote.quoteNumber}</p>
              <p className="text-xs text-slate-500 mt-2">Date: {dateStr}</p>
              {validStr && <p className="text-xs text-slate-400 mt-0.5">Valid until: {validStr}</p>}
            </div>
          </div>

          {/* Client details box */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Prepared For</p>
              <p className="font-bold text-slate-900 text-lg leading-tight">{quote.clientName}</p>
              {quote.clientPhone && <p className="text-slate-600 text-sm mt-0.5">{quote.clientPhone}</p>}
              {quote.clientEmail && <p className="text-slate-500 text-xs mt-0.5">{quote.clientEmail}</p>}
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Project Details</p>
              {quote.projectName && <p className="font-semibold text-slate-800">{quote.projectName}</p>}
              {quote.location && <p className="text-slate-500 text-sm mt-0.5">{quote.location}</p>}
            </div>
          </div>

          {/* Items table */}
          <div className="mb-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-900">
                  <th className="text-left py-3 text-xs font-bold text-slate-900 uppercase tracking-wide w-8">#</th>
                  <th className="text-left py-3 text-xs font-bold text-slate-900 uppercase tracking-wide">Description</th>
                  <th className="text-right py-3 text-xs font-bold text-slate-900 uppercase tracking-wide w-28">Amount</th>
                </tr>
              </thead>
              <tbody>
                {bd.itemBreakdowns.map((itemBd, idx) => {
                  const item = itemBd.item
                  const hasLights = item.lightType !== 'none'
                  return (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="py-4 text-slate-400 align-top text-xs">{idx + 1}</td>
                      <td className="py-4 align-top pr-4">
                        <p className="font-semibold text-slate-900">
                          Stretch Ceiling — {item.name || `Item ${idx + 1}`}
                          {item.quantity > 1 && <span className="text-slate-400 font-normal"> ×{item.quantity}</span>}
                        </p>
                        <p className="text-slate-500 text-xs mt-0.5">
                          {item.fabricType} · {formatDims(item)}
                        </p>
                        {hasLights && (
                          <p className="text-slate-500 text-xs mt-0.5">
                            With {lightLabel[item.lightType] ?? 'LED Cove Lighting'}
                            {item.lightDepth ? ` (${item.lightDepth}\" depth)` : ''}
                          </p>
                        )}
                        {item.withPrinting && (
                          <p className="text-slate-500 text-xs mt-0.5">With custom printing</p>
                        )}
                        {item.withFleece && (
                          <p className="text-slate-500 text-xs mt-0.5">With felt pad / fleece backing</p>
                        )}
                        {item.notes && (
                          <p className="text-slate-400 text-xs mt-0.5 italic">{item.notes}</p>
                        )}
                      </td>
                      <td className="py-4 text-right font-semibold text-slate-900 align-top">
                        {fmtINR(itemBd.subtotalFinal)}
                      </td>
                    </tr>
                  )
                })}

                {bd.totalInstallation > 0 && (
                  <tr className="border-b border-slate-100">
                    <td className="py-4 text-slate-400 text-xs">{bd.itemBreakdowns.length + 1}</td>
                    <td className="py-4">
                      <p className="font-semibold text-slate-900">Professional Installation</p>
                      <p className="text-slate-500 text-xs mt-0.5">Supply &amp; fit including all fixings</p>
                    </td>
                    <td className="py-4 text-right font-semibold text-slate-900">{fmtINR(bd.totalInstallation)}</td>
                  </tr>
                )}

                {bd.transportCost > 0 && (
                  <tr className="border-b border-slate-100">
                    <td className="py-4 text-slate-400 text-xs">{bd.itemBreakdowns.length + 2}</td>
                    <td className="py-4">
                      <p className="font-semibold text-slate-900">Transport &amp; Logistics</p>
                    </td>
                    <td className="py-4 text-right font-semibold text-slate-900">{fmtINR(bd.transportCost)}</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                {bd.gstAmount > 0 && (
                  <tr className="border-t border-slate-200">
                    <td colSpan={2} className="pt-3 text-slate-600">Subtotal</td>
                    <td className="pt-3 text-right text-slate-700 font-semibold">{fmtINR(bd.subtotalBeforeGst)}</td>
                  </tr>
                )}
                {bd.gstAmount > 0 && (
                  <tr>
                    <td colSpan={2} className="py-1 text-slate-600">GST 18%</td>
                    <td className="py-1 text-right text-slate-700 font-semibold">{fmtINR(bd.gstAmount)}</td>
                  </tr>
                )}
                <tr className="border-t-2 border-slate-900">
                  <td colSpan={2} className="pt-4 font-bold text-slate-900 text-lg">
                    Grand Total
                    {quote.includeGst
                      ? <span className="text-xs font-normal text-slate-500 ml-2">(Incl. GST)</span>
                      : <span className="text-xs font-normal text-slate-500 ml-2">(Excl. GST)</span>
                    }
                  </td>
                  <td className="pt-4 text-right font-black text-slate-900 text-2xl">
                    {fmtINR(bd.grandTotal)}
                  </td>
                </tr>
                {quote.displayMode === 'per-sqft' && bd.totalSqft > 0 && (
                  <tr>
                    <td colSpan={3} className="pt-2">
                      <p className="text-xs text-slate-500 text-right">
                        Total area: {bd.totalSqft.toFixed(1)} sqft · Rate: {fmtINR(bd.pricePerSqft)}/sqft
                      </p>
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>

          {/* What's included box */}
          <div className="mb-8 p-4 border border-slate-200 rounded-lg">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">This Quotation Includes</p>
            <p className="text-xs text-slate-600 leading-relaxed">
              Premium PONGS / Descor stretch ceiling fabric
              {hasGripper ? ', aluminium gripper profiles (CW/CC)' : ''}
              {hasLighting ? ', LED strip lighting, electronic drivers, controllers &amp; remotes' : ''}
              {hasPrinting ? ', custom digital printing' : ''}
              , and professional installation by certified technicians.
            </p>
          </div>

          {/* Custom notes */}
          {quote.notes && (
            <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Terms &amp; Notes</p>
              <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">{quote.notes}</p>
            </div>
          )}

          {/* Standard T&C */}
          <div className="text-xs text-slate-400 space-y-1 border-t border-slate-100 pt-5">
            <p className="font-semibold text-slate-500 mb-1.5">Terms &amp; Conditions</p>
            <p>1. Prices are valid for {validStr ? `30 days (until ${validStr})` : '30 days from date of issue'}.</p>
            <p>2. 100% advance payment required before dispatch of material.</p>
            <p>3. Standard fabric dispatched within transit time from date of payment.</p>
            <p>4. Printed fabric: 7-day lead time after crop image confirmation and full payment.</p>
            <p>5. Local forwarding and packing charges at actuals, unless stated above.</p>
            <p>6. Transportation payable at delivery unless included in this quotation.</p>
            <p>7. All electrical work to comply with local codes; site supply by client.</p>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-end justify-between">
            <div>
              <p className="text-xs text-slate-500">Authorised Signatory</p>
              <div className="mt-8 border-t border-slate-300 w-40" />
              <p className="text-xs text-slate-400 mt-1">Sidharth Trading Co.</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">For queries contact:</p>
              <p className="text-xs font-medium text-slate-600">Sidharth Trading Co. | PONGS Stretch Ceiling</p>
              <p className="text-xs text-slate-400">Bengaluru, Karnataka</p>
            </div>
          </div>
        </div>

        {/* ─── Page 2: Why PONGS + Lead time + T&C ─── */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-10 mt-6 print:shadow-none print:border-0 print:rounded-none print:p-8 print-break">

          {/* Page 2 header */}
          <div className="flex items-start justify-between mb-8 pb-5 border-b border-slate-200">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">PONGS</h2>
              <p className="text-xs text-slate-400 tracking-widest">STRETCH CEILING SYSTEMS</p>
            </div>
            <p className="text-xs text-slate-400">{quote.quoteNumber}</p>
          </div>

          {/* Why PONGS */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Why PONGS Stretch Ceiling?</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                ['Seamless Finish', 'One continuous surface with no joints (up to 5m width), no paint, no plaster. Stays perfect for 15+ years.'],
                ['Acoustic Performance', 'Optional acoustic fabrics (Descor Acoustic, Silencio, Soundscape) reduce noise by up to 25 dB.'],
                ['LED Integration', 'Cove-integrated LED system with precise light diffusion — no hot spots, no visible strips.'],
                ['Moisture & Mold Resistant', 'PVC and polyester fabrics resist humidity, mold, and condensation. Safe for bathrooms, pools, and humid climates.'],
                ['Rapid Installation', 'No wet work, no curing time. A typical room is installed in hours — zero dust and zero disruption.'],
                ['Design Flexibility', 'Available in 200+ colors, textures (matte, gloss, satin, metallic, translucent), and custom printing on fabric.'],
              ].map(([title, desc]) => (
                <div key={title} className="flex gap-3">
                  <div className="w-1 bg-slate-800 rounded-full shrink-0 mt-1" style={{height: '100%', minHeight: 40}} />
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lead times */}
          <div className="mb-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-2">Lead Times</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold text-slate-700">Standard Fabrics</p>
                <p className="text-xs text-slate-500 mt-0.5">All standard colors in stock — ready for dispatch within transit time from payment confirmation.</p>
              </div>
              <div>
                <p className="font-semibold text-slate-700">Printed / Custom Fabrics</p>
                <p className="text-xs text-slate-500 mt-0.5">7-day lead time after crop image confirmation and full payment receipt.</p>
              </div>
            </div>
          </div>

          {/* Detailed T&C */}
          <div>
            <h3 className="font-bold text-slate-900 mb-3">Full Terms &amp; Conditions</h3>
            <ol className="text-xs text-slate-500 space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>Quotation is valid for 30 days from date of issue unless stated otherwise.</li>
              <li>Prices are subject to change without notice after validity period.</li>
              <li>100% advance payment required before material is dispatched.</li>
              <li>Cancellations after payment are subject to a 15% restocking / processing charge.</li>
              <li>Installation is included only where explicitly stated in this quotation.</li>
              <li>Client to provide site access, electrical power, and a clear working area at no charge.</li>
              <li>Any civil or electrical work required at site (conduit, power points, false ceiling modifications) is the responsibility of the client unless included above.</li>
              <li>Fabric color may vary slightly from swatches due to monitor calibration and lighting conditions.</li>
              <li>Warranty: 10-year manufacturer warranty on fabric; 1-year warranty on electrical components.</li>
              <li>Disputes subject to jurisdiction of Bengaluru courts.</li>
            </ol>
          </div>

          {/* Page 2 footer */}
          <div className="mt-10 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs font-black text-slate-800 tracking-widest">PONGS · STRETCH CEILING SYSTEMS</p>
            <p className="text-xs text-slate-400 mt-1">Sidharth Trading Co. | Bengaluru, Karnataka</p>
          </div>
        </div>
      </div>
    </div>
  )
}
