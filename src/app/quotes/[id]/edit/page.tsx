import { dbGetQuote } from "@/lib/db"
export const dynamic = 'force-dynamic'
import { notFound } from 'next/navigation'
import QuoteBuilder from '@/components/QuoteBuilder'

export default async function EditQuotePage({ params }: { params: { id: string } }) {
  const quote = await dbGetQuote(params.id)
  if (!quote) notFound()

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
          <a href="/" className="hover:text-slate-600">Quotes</a>
          <span>/</span>
          <a href={`/quotes/${quote.id}/team`} className="hover:text-slate-600">{quote.quoteNumber}</a>
          <span>/</span>
          <span className="text-slate-600">Edit</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Edit Quote — {quote.quoteNumber}</h1>
        <p className="text-slate-500 text-sm mt-1">{quote.clientName} · {quote.projectName}</p>
      </div>
      <QuoteBuilder mode="edit" initial={quote} />
    </div>
  )
}
