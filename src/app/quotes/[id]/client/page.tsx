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
      {/* Action bar */}
      <div className="no-print flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <a href="/" className="hover:text-gray-700 transition-colors">Quotes</a>
          <span className="text-gray-300">/</span>
          <span className="text-gray-600 font-medium">{quote.quoteNumber}</span>
          <span className="text-gray-300">/</span>
          <span className="font-semibold text-gray-800">Client View</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a href={`/quotes/${quote.id}/team`} className="btn-secondary text-xs gap-1.5">
            <Users size={13} /> Team View
          </a>
          <a href={`/quotes/${quote.id}/edit`} className="btn-secondary text-xs gap-1.5">
            <Edit size={13} /> Edit
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
      <div id="quote-printable" className="max-w-[720px] mx-auto print:max-w-none font-[Inter,system-ui,sans-serif]">
        <div className="bg-white rounded-2xl shadow-[0_2px_16px_0_rgb(0,0,0,0.08)] overflow-hidden print:shadow-none print:rounded-none">

          {/* Hero header bar */}
          <div className="bg-gray-900 px-10 py-8 flex items-end justify-between">
            <div>
              <p className="text-gray-500 text-[10px] font-semibold tracking-[0.3em] uppercase mb-1">Next Level Solutions</p>
              <h1 className="text-white font-black text-4xl tracking-tighter leading-none">PONGS</h1>
              <p className="text-gray-400 text-[11px] font-medium tracking-[0.25em] mt-1.5">STRETCH CEILING SYSTEMS</p>
            </div>
            <div className="text-right">
              <p className="text-gray-500 text-[10px] font-semibold tracking-[0.2em] uppercase mb-1">Quotation</p>
              <p className="text-white text-2xl font-bold tracking-tight">{quote.quoteNumber}</p>
              <p className="text-gray-400 text-xs mt-2">{dateStr}</p>
              {validStr && <p className="text-gray-500 text-[11px] mt-0.5">Valid till {validStr}</p>}
            </div>
          </div>

          {/* Thin accent line */}
          <div className="h-0.5 bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300" />

          <div className="px-10 py-8">

            {/* Client + Project row */}
            <div className="grid grid-cols-2 gap-5 mb-9">
              <div className="border border-gray-100 rounded-xl p-5 bg-gray-50/60">
                <p className="text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase mb-3">Prepared For</p>
                <p className="font-black text-gray-900 text-xl leading-tight tracking-tight">{quote.clientName}</p>
                {quote.clientPhone && <p className="text-gray-500 text-sm mt-1.5 font-medium">{quote.clientPhone}</p>}
                {quote.clientEmail && <p className="text-gray-400 text-xs mt-0.5">{quote.clientEmail}</p>}
              </div>
              <div className="border border-gray-100 rounded-xl p-5 bg-gray-50/60">
                <p className="text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase mb-3">Project Details</p>
                {quote.projectName
                  ? <p className="font-bold text-gray-900 text-base leading-tight">{quote.projectName}</p>
                  : <p className="text-gray-400 text-sm italic">No project name</p>}
                {quote.location && <p className="text-gray-500 text-sm mt-1.5">{quote.location}</p>}
              </div>
            </div>

            {/* Items table */}
            <div className="mb-8">
              {/* Table header */}
              <div className="grid grid-cols-[2rem_1fr_8rem] gap-0 border-b-2 border-gray-900 pb-2.5 mb-0">
                <span className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">#</span>
                <span className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">Description</span>
                <span className="text-[10px] font-bold text-gray-500 tracking-widest uppercase text-right">Amount</span>
              </div>

              {bd.itemBreakdowns.map((itemBd, idx) => {
                const item = itemBd.item
                const hasLights = item.lightType !== 'none'
                return (
                  <div key={item.id} className="grid grid-cols-[2rem_1fr_8rem] gap-0 py-5 border-b border-gray-100 items-start">
                    <span className="text-xs text-gray-300 font-semibold pt-0.5">{String(idx + 1).padStart(2, '0')}</span>
                    <div className="pr-6">
                      <p className="font-bold text-gray-900 text-sm leading-snug">
                        Stretch Ceiling
                        {item.name ? ` — ${item.name}` : ` — Item ${idx + 1}`}
                        {item.quantity > 1 && <span className="text-gray-400 font-normal"> ×{item.quantity}</span>}
                      </p>
                      <p className="text-gray-500 text-xs mt-1 leading-relaxed">
                        {item.fabricType} · {formatDims(item)}
                      </p>
                      {hasLights && (
                        <p className="text-gray-500 text-xs mt-0.5">
                          {lightLabel[item.lightType] ?? 'LED Cove Lighting'}
                          {item.lightDepth ? ` · ${item.lightDepth}" cove depth` : ''}
                        </p>
                      )}
                      {item.withPrinting && (
                        <p className="text-gray-500 text-xs mt-0.5">Custom digital printing</p>
                      )}
                      {item.withFleece && (
                        <p className="text-gray-500 text-xs mt-0.5">With fleece / felt pad backing</p>
                      )}
                      {item.notes && (
                        <p className="text-gray-400 text-xs mt-1 italic">{item.notes}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 text-sm">{fmtINR(itemBd.subtotalFinal)}</p>
                    </div>
                  </div>
                )
              })}

              {bd.transportCost > 0 && (
                <div className="grid grid-cols-[2rem_1fr_8rem] gap-0 py-5 border-b border-gray-100 items-start">
                  <span className="text-xs text-gray-300 font-semibold pt-0.5">{String(bd.itemBreakdowns.length + 1).padStart(2, '0')}</span>
                  <div className="pr-6">
                    <p className="font-bold text-gray-900 text-sm">Transport &amp; Logistics</p>
                    <p className="text-gray-400 text-xs mt-1">Delivery to site</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900 text-sm">{fmtINR(bd.transportCost)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Totals block */}
            <div className="ml-8 mb-8">
              {bd.gstAmount > 0 && (
                <div className="flex items-center justify-between py-2 border-b border-gray-100 text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-semibold text-gray-700">{fmtINR(bd.subtotalBeforeGst)}</span>
                </div>
              )}
              {bd.gstAmount > 0 && (
                <div className="flex items-center justify-between py-2 border-b border-gray-100 text-sm">
                  <span className="text-gray-500">GST 18%</span>
                  <span className="font-semibold text-gray-700">{fmtINR(bd.gstAmount)}</span>
                </div>
              )}
              <div className="bg-gray-900 rounded-xl px-5 py-4 mt-3 flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-[10px] font-semibold tracking-widest uppercase">Grand Total</p>
                  <p className="text-gray-300 text-xs mt-0.5">
                    {quote.includeGst ? 'Inclusive of GST 18%' : 'Exclusive of GST'}
                  </p>
                </div>
                <p className="text-white font-black text-2xl tracking-tight">{fmtINR(bd.grandTotal)}</p>
              </div>
              {quote.displayMode === 'per-sqft' && bd.totalSqft > 0 && (
                <p className="text-xs text-gray-400 text-right mt-2">
                  {bd.totalSqft.toFixed(1)} sqft · {fmtINR(bd.pricePerSqft)}/sqft
                </p>
              )}
            </div>

            {/* What's included */}
            <div className="mb-7 border border-gray-100 rounded-xl p-5">
              <p className="text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase mb-3">Scope of Supply &amp; Work</p>
              <p className="text-sm text-gray-600 leading-relaxed">
                Premium PONGS / Descor stretch ceiling fabric
                {hasGripper ? ', aluminium gripper profiles' : ''}
                {hasLighting ? ', integrated LED cove lighting with drivers, controllers &amp; remotes' : ''}
                {hasPrinting ? ', custom digital printing on fabric' : ''}
                , and professional installation by certified technicians. All measurements, cutting, and fitting are included.
              </p>
            </div>

            {/* Notes */}
            {quote.notes && (
              <div className="mb-7 bg-amber-50/60 border border-amber-100 rounded-xl p-5">
                <p className="text-[10px] font-bold text-amber-600 tracking-[0.2em] uppercase mb-2">Special Notes</p>
                <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{quote.notes}</p>
              </div>
            )}

            {/* T&C */}
            <div className="border-t border-gray-100 pt-6">
              <p className="text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase mb-3">Terms &amp; Conditions</p>
              <ol className="space-y-1.5 list-none">
                {[
                  `Prices valid for ${validStr ? `30 days (until ${validStr})` : '30 days from issue'}.`,
                  '100% advance payment required before material dispatch.',
                  'Standard fabric dispatched within transit time from payment confirmation.',
                  'Printed fabric: 7-day lead time after crop image confirmation and full payment.',
                  'Transportation payable at delivery unless included above.',
                  'Site supply of electrical power by client; all electrical work to comply with local codes.',
                ].map((t, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-gray-500">
                    <span className="text-gray-300 font-semibold shrink-0 mt-px">{i + 1}.</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Signature footer */}
            <div className="mt-10 pt-7 border-t border-gray-100 flex items-end justify-between">
              <div>
                <div className="border-t border-gray-900 w-44 pt-2">
                  <p className="text-[11px] font-semibold text-gray-700">Authorised Signatory</p>
                  <p className="text-xs text-gray-400 mt-0.5">Sidharth Trading Co.</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-black text-gray-900 text-sm tracking-tight">PONGS STRETCH CEILING</p>
                <p className="text-xs text-gray-500 mt-0.5">Sidharth Trading Co. · Bengaluru</p>
                <p className="text-xs text-gray-400 mt-0.5">info@pongsindia.com</p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Page 2 ─── */}
        <div className="bg-white rounded-2xl shadow-[0_2px_16px_0_rgb(0,0,0,0.08)] overflow-hidden mt-5 print:shadow-none print:rounded-none print-break">

          {/* Slim page 2 header */}
          <div className="bg-gray-900 px-10 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center">
                <span className="text-white font-black text-xs">P</span>
              </div>
              <div>
                <p className="text-white font-black text-sm tracking-tight leading-none">PONGS</p>
                <p className="text-gray-500 text-[9px] tracking-widest">STRETCH CEILING</p>
              </div>
            </div>
            <p className="text-gray-500 text-xs font-medium">{quote.quoteNumber}</p>
          </div>

          <div className="px-10 py-8">

            {/* Why PONGS */}
            <div className="mb-9">
              <p className="text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase mb-5">Why PONGS Stretch Ceiling?</p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  ['Seamless Finish', 'One continuous surface — no joints up to 5m width, no painting, no plastering. Stays perfect 15+ years.'],
                  ['Acoustic Performance', 'Optional acoustic fabrics reduce ambient noise by up to 25 dB. Ideal for offices, studios, and hospitality.'],
                  ['LED Cove Integration', 'Precision light diffusion with no hot spots, no visible strips. Dramatic effect with flawless finish.'],
                  ['Moisture & Mold Resistant', 'PVC and polyester fabrics resist humidity, condensation, and mold — safe for any climate.'],
                  ['Rapid Installation', 'No wet work, no curing. A typical room installed in hours — zero dust, zero disruption.'],
                  ['Design Flexibility', '200+ colours, textures (matte, gloss, satin, metallic, translucent), and custom printing on fabric.'],
                ].map(([title, desc]) => (
                  <div key={title} className="flex gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                    <div className="w-0.5 bg-gray-900 rounded-full shrink-0 self-stretch opacity-20" />
                    <div>
                      <p className="font-bold text-gray-900 text-xs mb-1">{title}</p>
                      <p className="text-[11px] text-gray-500 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Lead times */}
            <div className="mb-9 grid grid-cols-2 gap-4">
              <div className="border border-gray-100 rounded-xl p-5">
                <p className="text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase mb-2">Standard Fabrics</p>
                <p className="font-bold text-gray-900 text-sm mb-1">Ready to ship</p>
                <p className="text-xs text-gray-500 leading-relaxed">All standard colours in stock — dispatched within transit time from payment confirmation.</p>
              </div>
              <div className="border border-gray-100 rounded-xl p-5">
                <p className="text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase mb-2">Printed / Custom</p>
                <p className="font-bold text-gray-900 text-sm mb-1">7-day lead time</p>
                <p className="text-xs text-gray-500 leading-relaxed">After crop image confirmation and full payment receipt.</p>
              </div>
            </div>

            {/* Full T&C */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase mb-4">Full Terms &amp; Conditions</p>
              <ol className="space-y-2">
                {[
                  'Quotation valid for 30 days from date of issue unless stated otherwise.',
                  'Prices subject to change without notice after validity period.',
                  '100% advance payment required before material is dispatched.',
                  'Cancellations after payment subject to a 15% restocking/processing charge.',
                  'Supply, delivery, and professional installation are included in the quoted price.',
                  'Client to provide site access, electrical power, and clear working area at no charge.',
                  'Civil or electrical work at site (conduit, power points, false ceiling modifications) is client\'s responsibility unless included above.',
                  'Fabric colour may vary slightly from swatches due to monitor calibration and lighting conditions.',
                  'Warranty: 10-year manufacturer warranty on fabric; 1-year on electrical components.',
                  'Disputes subject to jurisdiction of Bengaluru courts.',
                ].map((t, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-gray-500">
                    <span className="text-gray-300 font-semibold shrink-0 w-4">{i + 1}.</span>
                    <span className="leading-relaxed">{t}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Page 2 footer */}
            <div className="mt-10 pt-6 border-t border-gray-100 flex items-center justify-between">
              <p className="text-[10px] font-black text-gray-400 tracking-[0.25em] uppercase">Pongs · Stretch Ceiling Systems</p>
              <p className="text-[10px] text-gray-400">Sidharth Trading Co. · Bengaluru, Karnataka</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
