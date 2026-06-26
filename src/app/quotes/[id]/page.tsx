import { redirect } from 'next/navigation'

export default function QuoteIndexPage({ params }: { params: { id: string } }) {
  redirect(`/quotes/${params.id}/team`)
}
