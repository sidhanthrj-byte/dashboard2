export function fmtINR(n: number): string {
  return '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN')
}

export function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  const date = new Date(d)
  if (isNaN(date.getTime())) return String(d)
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
