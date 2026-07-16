'use client'

import Gate from '@/components/Gate'
import QuoteRegister from '@/components/QuoteRegister'

// The Quotes module — accessible to any user granted quotes.view. Server-side
// ownership scoping means each user sees only their own quotes here (admins see
// every quote). This is the page the top-nav "Quotes" tab points to.
export default function QuotesPage() {
  return (
    <Gate module="quotes">
      <QuoteRegister variant="quotes" />
    </Gate>
  )
}
