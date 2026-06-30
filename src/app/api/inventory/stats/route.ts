import { NextResponse } from 'next/server'
import { initInventoryTables, getDbClient } from '@/lib/db'

export async function GET() {
  await initInventoryTables()
  const db = getDbClient()

  const purchases = await db.execute('SELECT * FROM inv_purchases')
  const products = await db.execute('SELECT * FROM inv_products')

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  let totalAmount = 0
  let last30DaysAmount = 0
  let last30DaysCount = 0
  const byMonthMap: Record<string, number> = {}

  for (const p of purchases.rows) {
    const amount = Number(p.total_amount ?? 0)
    const date = String(p.purchase_date ?? '')
    totalAmount += amount
    if (date >= thirtyDaysAgo) {
      last30DaysAmount += amount
      last30DaysCount++
    }
    const month = date.slice(0, 7)
    if (month) {
      byMonthMap[month] = (byMonthMap[month] ?? 0) + amount
    }
  }

  const byMonth = Object.entries(byMonthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({ month, amount }))

  const productCounts: Record<string, number> = {}
  for (const p of products.rows) {
    const cat = String(p.category ?? 'Uncategorized')
    productCounts[cat] = (productCounts[cat] ?? 0) + 1
  }

  return NextResponse.json({
    purchases: {
      total: purchases.rows.length,
      last30Days: last30DaysCount,
      totalAmount,
      last30DaysAmount,
      byMonth,
    },
    productCounts,
    totalProducts: products.rows.length,
  })
}
