import { dbGetQuote } from "@/lib/db"
export const dynamic = 'force-dynamic'
import { notFound } from 'next/navigation'
import { calculateQuote, fmtINR, formatDims, round2 } from '@/lib/calculations'
import { getSession, canAccessQuote } from '@/lib/auth'
import { getCompany } from '@/lib/companies'
import { Edit, Users } from 'lucide-react'
import PrintButton from '@/components/PrintButton'
import SharePDF from '@/components/SharePDF'

const HSN_CEILING = '3921'  // PVC / plastic sheet membranes

function articleNo(idx: number) {
  return `SCS-${String(idx + 1).padStart(3, '0')}`
}

const lightLabel: Record<string, string> = {
  single_color:           'Single Colour LED Cove',
  single_color_dimmable:  'Single Colour LED Cove (Dimmable)',
  tunable:                'Tunable White LED Cove',
  tunable_dali:           'Tunable White LED Cove (DALI)',
  rgb:                    'RGB LED Cove',
  rgbw:                   'RGBW LED Cove',
}

export default async function ClientPage({ params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) redirect('/login')
  const quote = await dbGetQuote(params.id)
  if (!quote || !canAccessQuote(session, quote)) notFound()
  // All company identity/branding on this document comes from the quote's company
  const company = getCompany(quote.company)

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
    `*${company.brand} Stretch Ceiling – Quotation*\n\n` +
    `*Quote:* ${quote.quoteNumber}\n` +
    `*Client:* ${quote.clientName}\n` +
    `*Project:* ${quote.projectName || '—'}\n` +
    `*Date:* ${dateStr}\n\n` +
    `*Grand Total: ${fmtINR(bd.grandTotal)}*${quote.includeGst ? ' (Incl. GST)' : ' (Excl. GST)'}\n\n` +
    `_${company.legalName} | ${company.brand} Stretch Ceiling_`
  )
  const waUrl = `https://wa.me/${ quote.clientPhone ? quote.clientPhone.replace(/\D/g,'') : ''}?text=${waMessage}`
  const mailUrl = `mailto:${quote.clientEmail ?? ''}?subject=Quotation ${quote.quoteNumber} - ${company.brand} Stretch Ceiling&body=${encodeURIComponent(`Dear ${quote.clientName},\n\nPlease find attached our quotation ${quote.quoteNumber} for ${quote.projectName || 'your project'}.\n\nGrand Total: ${fmtINR(bd.grandTotal)}${quote.includeGst ? ' (Incl. GST)' : ' (Excl. GST)'}\n\nValid until: ${validStr ?? '30 days from date'}\n\nBest regards,\n${company.legalName}\n${company.brand} Stretch Ceiling`)}`

  const tcPoints = [
    'Order: Once placed cannot be modified, exchanged or cancelled.',
    `Validity: This quotation is valid for 30 days${validStr ? ` (until ${validStr})` : ''}, subject to availability of material at the time of placing the order.`,
    'Due to the customised nature of the product, 100% downpayment is required along with the confirmed Purchase Order.',
    'NEFT / RTGS to be made in the name of: Next Level Solutions.',
    'Electrical point to be provided nearest to the area where ceiling installation work is to be done.',
    'Delivery within 10 to 12 working days from confirmed PO and payment receipt.',
    'No measurement changes will be entertained once installation is complete.',
    'Any additional LED, Grippers, Woodwork, Wires or Drivers used will be charged over and above this quotation.',
    'Removing and re-fixing of installed fabric will be charged extra.',
    'Client to provide plywood box with white paint / white laminate and supporting structure in all areas where fabric is to be installed.',
    'A-Type ladder or scaffolding / staging to be arranged at site by the client.',
    'All rates quoted are highly competitive. We look forward to the opportunity to work with you.',
  ]

  const whyPoints = [
    { icon: 'LED', label: 'Integrated LED\n& Lighting Systems' },
    { icon: 'GER', label: 'German Innovation,\nIndian Execution' },
    { icon: 'EXE', label: 'In-House Execution\n& Support' },
    { icon: 'EXP', label: 'Proven\nExpertise' },
    { icon: 'PRT', label: 'DURST Printing\nCollaboration' },
    { icon: 'SUS', label: 'Sustainable\nby Design' },
    { icon: 'ACO', label: 'Seamless Acoustic\nPerformance' },
    { icon: 'DLV', label: 'Fast Delivery &\nSmart Execution' },
    { icon: 'NAT', label: 'Nation-wide\nExperience Centres' },
  ]

  // Circular positions for Why Pongs page (container 560×540, center 280,270, r=200)
  const CX = 280, CY = 270, CR = 200
  const circleItems = whyPoints.map((p, i) => {
    const deg = i * 40 - 90
    const rad = (deg * Math.PI) / 180
    return { ...p, x: CX + CR * Math.cos(rad), y: CY + CR * Math.sin(rad), deg }
  })

  const coverBg = '#0C0C0C'
  const gold = '#C8A96E'
  const goldLight = '#E8D5A8'

  return (
    <div>
      {/* ── Action bar (screen only) ── */}
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
          <SharePDF quoteNumber={quote.quoteNumber} clientName={quote.clientName} waUrl={waUrl} mailUrl={mailUrl} />
        </div>
      </div>

      {/* ── PDF Pages Wrapper ── */}
      <div id="quote-printable" className="max-w-[794px] mx-auto print:max-w-none" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

        {/* ════════════════════════════════════════
            PAGE 1 — COVER
        ════════════════════════════════════════ */}
        <div className="quote-pdf-page relative overflow-hidden print:shadow-none" style={{ backgroundColor: coverBg, minHeight: '1123px' }}>

          {/* Top white banner */}
          <div style={{ backgroundColor: 'white', padding: '14px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '10px', color: '#555', letterSpacing: '0.08em', fontWeight: 600 }}>
              PONGS India Office &nbsp;|&nbsp; Experience Centre
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1 }}>
              <span style={{ fontSize: '18px', fontWeight: 900, color: '#0C0C0C', letterSpacing: '-0.02em' }}>PONGS</span>
              <span style={{ fontSize: '8px', fontWeight: 700, color: '#555', letterSpacing: '0.35em', marginTop: '2px' }}>INDIA</span>
            </div>
          </div>

          {/* Gold rule */}
          <div style={{ height: '2px', background: `linear-gradient(90deg, ${gold}, ${goldLight} 50%, transparent)` }} />

          {/* "Quotation" label + rule */}
          <div style={{ padding: '36px 48px 0', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <p style={{ fontSize: '10px', color: gold, letterSpacing: '0.3em', fontWeight: 700, whiteSpace: 'nowrap' }}>QUOTATION</p>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#2A2A2A' }} />
          </div>

          {/* Main hero area */}
          <div style={{ padding: '60px 48px 0', position: 'relative' }}>

            {/* Giant watermark */}
            <p style={{
              fontSize: '160px', fontWeight: 900, color: '#161616',
              letterSpacing: '-0.05em', lineHeight: 1, margin: 0,
              userSelect: 'none', pointerEvents: 'none',
            }}>PONGS</p>

            {/* Decorative concentric circles (right side) */}
            <div style={{ position: 'absolute', right: '-80px', top: '-20px', width: '480px', height: '480px', pointerEvents: 'none' }}>
              {[480, 380, 280, 180, 80].map((size, i) => (
                <div key={i} style={{
                  position: 'absolute',
                  width: size, height: size,
                  borderRadius: '50%',
                  border: `1px solid rgba(200,169,110,${0.06 + i * 0.04})`,
                  top: (480 - size) / 2, left: (480 - size) / 2,
                }} />
              ))}
              {/* Center dot */}
              <div style={{
                position: 'absolute', width: 10, height: 10, borderRadius: '50%',
                backgroundColor: gold, opacity: 0.5,
                top: 235, left: 235,
              }} />
            </div>

            {/* Client info — over the watermark */}
            <div style={{ marginTop: '-24px', position: 'relative', zIndex: 1 }}>
              <p style={{ fontSize: '10px', color: '#666', letterSpacing: '0.25em', fontWeight: 600, textTransform: 'uppercase', marginBottom: '10px' }}>
                Prepared For
              </p>
              <p style={{ fontSize: '40px', fontWeight: 900, color: 'white', letterSpacing: '-0.03em', lineHeight: 1.05, margin: 0 }}>
                {quote.clientName}
              </p>
              {quote.projectName && (
                <p style={{ fontSize: '16px', fontWeight: 600, color: gold, marginTop: '10px', letterSpacing: '-0.01em' }}>
                  {quote.projectName}
                </p>
              )}
              {quote.location && (
                <p style={{ fontSize: '13px', color: '#777', marginTop: '4px' }}>
                  {quote.location}
                </p>
              )}
            </div>

            {/* Quote meta row */}
            <div style={{ display: 'flex', gap: '0', marginTop: '60px' }}>
              {[
                { label: 'Quote No.', value: quote.quoteNumber },
                { label: 'Date', value: dateStr },
                ...(validStr ? [{ label: 'Valid Until', value: validStr }] : []),
              ].map((item, i) => (
                <div key={i} style={{ paddingRight: '48px', borderRight: i < 2 ? '1px solid #2A2A2A' : 'none', paddingLeft: i > 0 ? '48px' : 0 }}>
                  <p style={{ fontSize: '9px', color: '#555', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>
                    {item.label}
                  </p>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: 'white', letterSpacing: '-0.01em' }}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Gold accent line + grand total teaser */}
          <div style={{ padding: '40px 48px 0' }}>
            <div style={{ height: '1px', background: `linear-gradient(90deg, ${gold}, ${goldLight} 40%, transparent)` }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '24px' }}>
              <p style={{ fontSize: '11px', color: '#555', letterSpacing: '0.2em', fontWeight: 600 }}>TOTAL VALUE</p>
              <p style={{ fontSize: '28px', fontWeight: 900, color: gold, letterSpacing: '-0.02em' }}>
                {fmtINR(bd.grandTotal)}
                <span style={{ fontSize: '12px', color: '#666', fontWeight: 400, marginLeft: '8px' }}>
                  {quote.includeGst ? 'incl. GST' : 'excl. GST'}
                </span>
              </p>
            </div>
          </div>

          {/* Cover footer */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '20px 48px',
            borderTop: '1px solid #1E1E1E',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <p style={{ fontSize: '10px', color: '#444', letterSpacing: '0.15em', fontWeight: 600 }}>
              STRETCH CEILING SYSTEMS &nbsp;·&nbsp; BENGALURU, KARNATAKA
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1 }}>
              <span style={{ fontSize: '20px', fontWeight: 900, color: '#333', letterSpacing: '-0.02em' }}>PONGS</span>
              <span style={{ fontSize: '7px', fontWeight: 700, color: gold, letterSpacing: '0.4em', marginTop: '3px' }}>INDIA</span>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════
            PAGE 2+3 — QUOTE TABLE + T&C + BANKING
        ════════════════════════════════════════ */}
        <div className="quote-pdf-page bg-white print-break print:shadow-none" style={{ marginTop: '0' }}>

          {/* Page header */}
          <div style={{ backgroundColor: '#0C0C0C', padding: '16px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '10px', color: '#888', letterSpacing: '0.08em', fontWeight: 600 }}>
              PONGS India Office &nbsp;|&nbsp; Experience Centre
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1 }}>
              <span style={{ fontSize: '16px', fontWeight: 900, color: 'white', letterSpacing: '-0.02em' }}>PONGS</span>
              <span style={{ fontSize: '7px', fontWeight: 700, color: gold, letterSpacing: '0.35em', marginTop: '2px' }}>INDIA</span>
            </div>
          </div>

          <div style={{ padding: '32px 48px' }}>

            {/* Client details row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
              {/* Left: client + shipping */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ border: '1px solid #E5E5E5', borderRadius: '8px', padding: '16px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: '#111', letterSpacing: '0.05em', marginBottom: '8px' }}>
                    Client Details:
                  </p>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: '#111', marginBottom: '2px' }}>
                    Client Name: <span style={{ fontWeight: 400 }}>{quote.clientName}</span>
                  </p>
                  {quote.clientPhone && (
                    <p style={{ fontSize: '11px', color: '#555' }}>Phone: {quote.clientPhone}</p>
                  )}
                  {quote.clientEmail && (
                    <p style={{ fontSize: '11px', color: '#555' }}>Email: {quote.clientEmail}</p>
                  )}
                </div>
                <div style={{ border: '1px solid #E5E5E5', borderRadius: '8px', padding: '16px', minHeight: '64px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: '#111', letterSpacing: '0.05em', marginBottom: '8px' }}>
                    Shipping Address:
                  </p>
                  {quote.location
                    ? <p style={{ fontSize: '11px', color: '#555', lineHeight: 1.5 }}>{quote.location}</p>
                    : <p style={{ fontSize: '11px', color: '#aaa', fontStyle: 'italic' }}>Same as client address</p>
                  }
                </div>
              </div>

              {/* Right: sales rep + quote number */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ border: '1px solid #E5E5E5', borderRadius: '8px', padding: '16px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: '#111', letterSpacing: '0.05em', marginBottom: '8px' }}>
                    Sales Representative:
                  </p>
                  <p style={{ fontSize: '11px', color: '#555' }}>Name: Sidharth</p>
                  <p style={{ fontSize: '11px', color: '#555' }}>Phone: +91 98765 43210</p>
                  <p style={{ fontSize: '11px', color: '#555' }}>Email: info@pongsindia.com</p>
                </div>
                <div style={{ border: '1px solid #E5E5E5', borderRadius: '8px', padding: '16px' }}>
                  <p style={{ fontSize: '11px', color: '#555', marginBottom: '4px' }}>
                    Quotation No. &nbsp;<strong style={{ color: '#111' }}>{quote.quoteNumber}</strong>
                  </p>
                  <p style={{ fontSize: '11px', color: '#555' }}>
                    Quotation Date: &nbsp;<strong style={{ color: '#111' }}>{dateStr}</strong>
                  </p>
                  {validStr && (
                    <p style={{ fontSize: '11px', color: '#555' }}>
                      Valid Until: &nbsp;<strong style={{ color: '#111' }}>{validStr}</strong>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Section heading */}
            <div style={{ backgroundColor: '#D9D9D9', padding: '10px 16px', marginBottom: '0', borderRadius: '4px 4px 0 0' }}>
              <p style={{ fontSize: '13px', fontWeight: 800, color: '#111', letterSpacing: '0.05em' }}>
                PONGS DESCOR SYSTEMS
              </p>
            </div>

            {/* Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #111' }}>
                  {['Article No.', 'Description', 'HSN Code', 'Quantity', 'Unit', 'Price', 'Amount'].map((h, i) => (
                    <th key={h} style={{
                      padding: '9px 8px',
                      textAlign: i === 0 ? 'left' : i === 1 ? 'left' : i >= 3 ? 'right' : 'center',
                      fontSize: '10px', fontWeight: 700, color: '#111',
                      letterSpacing: '0.03em',
                      whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bd.itemBreakdowns.map((itemBd, idx) => {
                  const item = itemBd.item
                  const hasLights = item.lightType !== 'none'
                  const areaSqm = round2(itemBd.areaM2)
                  const unitPrice = areaSqm > 0 ? round2(itemBd.subtotalFinal / areaSqm / item.quantity) : 0
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #F0F0F0', backgroundColor: idx % 2 === 1 ? '#FAFAFA' : 'white' }}>
                      <td style={{ padding: '12px 8px', verticalAlign: 'top', color: '#555', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {articleNo(idx)}
                      </td>
                      <td style={{ padding: '12px 8px', verticalAlign: 'top', maxWidth: '260px' }}>
                        <p style={{ fontWeight: 700, color: '#111', marginBottom: '3px', lineHeight: 1.3 }}>
                          Stretch Ceiling System{item.name ? ` — ${item.name}` : ''}
                          {item.quantity > 1 ? ` ×${item.quantity}` : ''}
                        </p>
                        <p style={{ color: '#777', fontSize: '10px', lineHeight: 1.5 }}>
                          {item.fabricType} &nbsp;·&nbsp; {formatDims(item)}
                        </p>
                        {hasLights && (
                          <p style={{ color: '#777', fontSize: '10px' }}>
                            {lightLabel[item.lightType] ?? 'LED Cove'}{item.lightDepth ? ` · ${item.lightDepth}" cove` : ''}
                          </p>
                        )}
                        {item.withPrinting && (
                          <p style={{ color: '#777', fontSize: '10px' }}>Custom digital printing</p>
                        )}
                        {item.withFleece && (
                          <p style={{ color: '#777', fontSize: '10px' }}>Felt pad / fleece backing</p>
                        )}
                        {item.notes && (
                          <p style={{ color: '#aaa', fontSize: '10px', fontStyle: 'italic', marginTop: '2px' }}>{item.notes}</p>
                        )}
                      </td>
                      <td style={{ padding: '12px 8px', verticalAlign: 'top', textAlign: 'center', color: '#555', whiteSpace: 'nowrap' }}>
                        {HSN_CEILING}
                      </td>
                      <td style={{ padding: '12px 8px', verticalAlign: 'top', textAlign: 'right', color: '#111', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                        {areaSqm.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 8px', verticalAlign: 'top', textAlign: 'right', color: '#555' }}>sqm</td>
                      <td style={{ padding: '12px 8px', verticalAlign: 'top', textAlign: 'right', color: '#111', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        {fmtINR(unitPrice)}
                      </td>
                      <td style={{ padding: '12px 8px', verticalAlign: 'top', textAlign: 'right', fontWeight: 700, color: '#111', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        {fmtINR(itemBd.subtotalFinal)}
                      </td>
                    </tr>
                  )
                })}

                {bd.transportCost > 0 && (
                  <tr style={{ borderBottom: '1px solid #F0F0F0' }}>
                    <td style={{ padding: '12px 8px', color: '#555', fontWeight: 600 }}>{articleNo(bd.itemBreakdowns.length)}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <p style={{ fontWeight: 700, color: '#111' }}>Transport &amp; Logistics</p>
                      <p style={{ color: '#777', fontSize: '10px' }}>Delivery to site</p>
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center', color: '#555' }}>9965</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', color: '#111' }}>1</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', color: '#555' }}>nos</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', color: '#111', whiteSpace: 'nowrap' }}>{fmtINR(bd.transportCost)}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, color: '#111', whiteSpace: 'nowrap' }}>{fmtINR(bd.transportCost)}</td>
                  </tr>
                )}

                {/* Subtotal / GST rows */}
                {bd.gstAmount > 0 && (
                  <>
                    <tr style={{ borderTop: '1px solid #E5E5E5' }}>
                      <td colSpan={5} />
                      <td style={{ padding: '8px 8px 4px', textAlign: 'right', fontSize: '11px', color: '#555' }}>Subtotal</td>
                      <td style={{ padding: '8px 8px 4px', textAlign: 'right', fontWeight: 600, color: '#111', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        {fmtINR(bd.subtotalBeforeGst)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={5} />
                      <td style={{ padding: '4px 8px', textAlign: 'right', fontSize: '11px', color: '#555' }}>GST 18%</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600, color: '#111', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        {fmtINR(bd.gstAmount)}
                      </td>
                    </tr>
                  </>
                )}

                {/* Grand total row */}
                <tr style={{ backgroundColor: '#0C0C0C' }}>
                  <td colSpan={5} style={{ padding: '14px 8px' }}>
                    <p style={{ color: '#888', fontSize: '10px', letterSpacing: '0.15em', fontWeight: 700 }}>GRAND TOTAL</p>
                    <p style={{ color: '#666', fontSize: '10px', marginTop: '2px' }}>
                      {quote.includeGst ? 'Inclusive of GST 18%' : 'Exclusive of GST'}
                    </p>
                  </td>
                  <td style={{ padding: '14px 8px', textAlign: 'right', color: '#aaa', fontSize: '11px', fontWeight: 700 }}>
                    Total
                  </td>
                  <td style={{ padding: '14px 8px', textAlign: 'right', fontSize: '22px', fontWeight: 900, color: gold, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                    {fmtINR(bd.grandTotal)}
                  </td>
                </tr>
              </tbody>
            </table>

            {quote.displayMode === 'per-sqft' && bd.totalSqft > 0 && (
              <p style={{ textAlign: 'right', fontSize: '10px', color: '#aaa', marginTop: '6px' }}>
                {bd.totalSqft.toFixed(1)} sqft &nbsp;·&nbsp; {fmtINR(bd.pricePerSqft)}/sqft
              </p>
            )}

            {/* Scope */}
            <div style={{ marginTop: '24px', padding: '14px 16px', border: '1px solid #E5E5E5', borderRadius: '6px', backgroundColor: '#FAFAFA' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: '#111', letterSpacing: '0.1em', marginBottom: '6px' }}>
                SCOPE OF SUPPLY &amp; WORK
              </p>
              <p style={{ fontSize: '11px', color: '#555', lineHeight: 1.65 }}>
                Premium PONGS / Descor stretch ceiling fabric
                {hasGripper ? ', aluminium gripper profiles' : ''}
                {hasLighting ? ', integrated LED cove lighting with drivers, controllers &amp; remotes' : ''}
                {hasPrinting ? ', custom digital printing on fabric' : ''}
                , and professional installation by certified technicians. All measurements, cutting, and fitting are included.
              </p>
            </div>

            {/* Notes */}
            {quote.notes && (
              <div style={{ marginTop: '16px', padding: '14px 16px', border: '1px solid #FDE68A', borderRadius: '6px', backgroundColor: '#FFFBEB' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: '#B45309', letterSpacing: '0.1em', marginBottom: '6px' }}>
                  SPECIAL NOTES
                </p>
                <p style={{ fontSize: '11px', color: '#555', lineHeight: 1.65, whiteSpace: 'pre-line' }}>{quote.notes}</p>
              </div>
            )}

            {/* T&C */}
            <div style={{ marginTop: '28px', border: '1px solid #333', borderRadius: '6px', padding: '18px 20px' }}>
              <p style={{ fontSize: '11px', fontWeight: 800, color: '#111', marginBottom: '12px', letterSpacing: '0.03em' }}>
                Terms &amp; Conditions:
              </p>
              <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {tcPoints.map((t, i) => (
                  <li key={i} style={{ display: 'flex', gap: '8px', fontSize: '10px', color: '#444', lineHeight: 1.55, marginBottom: '5px' }}>
                    <span style={{ fontWeight: 700, flexShrink: 0, color: '#111' }}>{i + 1}.</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Banking details */}
            <div style={{ marginTop: '16px', border: '1px solid #333', borderRadius: '6px', padding: '18px 20px', minHeight: '80px' }}>
              <p style={{ fontSize: '11px', fontWeight: 800, color: '#111', marginBottom: '12px' }}>
                Banking Details:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {[
                  ['Bank Name', 'HDFC Bank'],
                  ['Account Name', 'Next Level Solutions'],
                  ['Account Number', '• • • • • • • • 1234'],
                  ['IFSC Code', 'HDFC0001234'],
                ].map(([label, value]) => (
                  <p key={label} style={{ fontSize: '10px', color: '#555' }}>
                    <strong style={{ color: '#111' }}>{label}:</strong> {value}
                  </p>
                ))}
              </div>
            </div>

            {/* Signature footer */}
            <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #E5E5E5', display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '160px', height: '40px', borderBottom: '1px solid #111', marginBottom: '8px' }} />
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#111' }}>Authority Signature</p>
                <p style={{ fontSize: '10px', color: '#777', marginTop: '2px' }}>Sidharth Trading Co.</p>
              </div>
            </div>

          </div>
        </div>

        {/* ════════════════════════════════════════
            PAGE 4 — WHY CHOOSE PONGS
        ════════════════════════════════════════ */}
        <div className="quote-pdf-page print-break print:shadow-none" style={{ backgroundColor: '#F7F5F0', minHeight: '1123px', position: 'relative' }}>

          {/* About Us header */}
          <div style={{ padding: '40px 60px 0', display: 'flex', alignItems: 'center', gap: '24px' }}>
            <p style={{ fontSize: '11px', color: '#888', letterSpacing: '0.15em', fontWeight: 600, whiteSpace: 'nowrap' }}>About Us</p>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#D5D0C8' }} />
          </div>

          {/* Main heading */}
          <div style={{ textAlign: 'center', padding: '50px 60px 0' }}>
            <p style={{ fontSize: '32px', fontWeight: 400, color: '#111', letterSpacing: '0.02em', margin: 0 }}>
              WHY CHOOSE <strong style={{ fontWeight: 900 }}>PONGS?</strong>
            </p>
          </div>

          {/* Circular arrangement */}
          <div style={{ position: 'relative', width: '560px', height: '540px', margin: '20px auto 0' }}>

            {/* Ring */}
            <div style={{
              position: 'absolute',
              left: `${CX - CR}px`, top: `${CY - CR}px`,
              width: `${CR * 2}px`, height: `${CR * 2}px`,
              borderRadius: '50%', border: '1px solid #C8C2B8',
            }} />

            {/* Center PONGS mark */}
            <div style={{
              position: 'absolute', left: `${CX - 36}px`, top: `${CY - 28}px`,
              textAlign: 'center',
            }}>
              {/* Swoosh lines decoration */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '4px', alignItems: 'center' }}>
                {[40, 30, 20].map((w, i) => (
                  <div key={i} style={{ width: `${w}px`, height: '1.5px', backgroundColor: '#888', borderRadius: '2px' }} />
                ))}
              </div>
            </div>

            {/* Circle items */}
            {circleItems.map((item, i) => {
              // Determine text anchor direction based on angle
              const d = item.deg
              const isRight = d > -60 && d < 60
              const isLeft = d > 120 || d < -120
              const isBottom = d > 60 && d < 120
              // isTop covers rest

              // Label offset direction
              const labelOffset = isRight ? { left: '70px', top: '-14px' }
                : isLeft ? { right: '70px', top: '-14px' }
                : isBottom ? { left: '-40px', top: '60px' }
                : { left: '-40px', bottom: '60px', top: 'auto' }

              const textAlign: 'left' | 'right' | 'center' = isRight ? 'left' : isLeft ? 'right' : 'center'

              return (
                <div key={i} style={{
                  position: 'absolute',
                  left: `${item.x - 28}px`,
                  top: `${item.y - 28}px`,
                }}>
                  {/* Dark circle */}
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '50%',
                    backgroundColor: '#111',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative',
                  }}>
                    <span style={{ fontSize: '9px', fontWeight: 800, color: 'white', letterSpacing: '0.05em' }}>
                      {item.icon}
                    </span>
                  </div>

                  {/* Label */}
                  <div style={{
                    position: 'absolute',
                    whiteSpace: 'pre-line',
                    fontSize: '9.5px',
                    fontWeight: 600,
                    color: '#333',
                    lineHeight: 1.4,
                    textAlign,
                    width: '90px',
                    ...labelOffset,
                  }}>
                    {item.label}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Bottom logo */}
          <div style={{
            position: 'absolute', bottom: '36px', right: '60px',
            display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
          }}>
            <span style={{ fontSize: '24px', fontWeight: 900, color: '#111', letterSpacing: '-0.02em', lineHeight: 1 }}>PONGS</span>
            <span style={{ fontSize: '9px', fontWeight: 700, color: '#888', letterSpacing: '0.3em', marginTop: '3px' }}>INDIA</span>
          </div>

          {/* Bottom left footer */}
          <div style={{ position: 'absolute', bottom: '36px', left: '60px' }}>
            <p style={{ fontSize: '10px', color: '#999', letterSpacing: '0.1em' }}>
              Sidharth Trading Co. &nbsp;·&nbsp; Bengaluru, Karnataka
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
