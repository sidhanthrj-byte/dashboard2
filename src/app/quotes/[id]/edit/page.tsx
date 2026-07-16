import { dbGetQuote } from "@/lib/db"
import { canAccessQuote } from "@/lib/session"
export const dynamic = 'force-dynamic'
import { notFound } from 'next/navigation'
import QuoteBuilder from '@/components/QuoteBuilder'

export default async function EditQuotePage({ params }: { params: { id: string } }) {
  const quote = await dbGetQuote(params.id)
  if (!quote) notFound()
  if (!(await canAccessQuote(quote.ownerEmail))) notFound()

  return (
    <div>
      <div className="max-w-3xl mx-auto pt-8 sm:pt-10 pb-2">
        <div className="flex items-center gap-2 fig text-[10.5px] uppercase mb-3" style={{ color: 'var(--faint)', letterSpacing: '0.1em' }}>
          <a href="/" className="hover:underline">Register</a>
          <span style={{ color: 'var(--rule-2)' }}>/</span>
          <a href={`/quotes/${quote.id}/team`} className="hover:underline">{quote.quoteNumber}</a>
          <span style={{ color: 'var(--rule-2)' }}>/</span>
          <span style={{ color: 'var(--muted)' }}>Edit</span>
        </div>
        <h1 className="font-display text-[30px] font-semibold tracking-tight" style={{ color: 'var(--ink)' }}>Edit — {quote.quoteNumber}</h1>
        <p className="text-[13.5px] mt-2" style={{ color: 'var(--muted)' }}>{quote.clientName}{quote.projectName ? ` · ${quote.projectName}` : ''}</p>
      </div>
      <QuoteBuilder mode="edit" initial={quote} />
    </div>
  )
}
