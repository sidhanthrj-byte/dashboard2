import QuoteBuilder from '@/components/QuoteBuilder'

export default function NewQuotePage() {
  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
          <a href="/" className="hover:text-slate-600">Quotes</a>
          <span>/</span>
          <span className="text-slate-600">New Quote</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">New Quotation</h1>
        <p className="text-slate-500 text-sm mt-1">Fill in the details below. All calculations happen automatically.</p>
      </div>
      <QuoteBuilder mode="new" />
    </div>
  )
}
