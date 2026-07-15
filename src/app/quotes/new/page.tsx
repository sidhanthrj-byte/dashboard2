import QuoteBuilder from '@/components/QuoteBuilder'

export default function NewQuotePage() {
  return (
    <div>
      <div className="max-w-3xl mx-auto pt-8 sm:pt-10 pb-2">
        <div className="flex items-center gap-2 fig text-[10.5px] uppercase mb-3" style={{ color: 'var(--faint)', letterSpacing: '0.1em' }}>
          <a href="/" className="hover:underline">Register</a>
          <span style={{ color: 'var(--rule-2)' }}>/</span>
          <span style={{ color: 'var(--muted)' }}>New sheet</span>
        </div>
        <h1 className="font-display text-[30px] font-semibold tracking-tight" style={{ color: 'var(--ink)' }}>New quotation</h1>
        <p className="text-[13.5px] mt-2" style={{ color: 'var(--muted)' }}>Work top to bottom — figures update as you go, and the running total sits in the title block below.</p>
      </div>
      <QuoteBuilder mode="new" />
    </div>
  )
}
