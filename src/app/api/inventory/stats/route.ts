export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { initInventoryTables, getDbClient } from '@/lib/db'
import { requirePermission } from '@/lib/session'

export async function GET() {
  const _auth = await requirePermission('inventory', 'view')
  if ('error' in _auth) return _auth.error
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
  let stockValue = 0
  let lowStockCount = 0
  for (const p of products.rows) {
    const cat = String(p.category ?? 'Uncategorized')
    productCounts[cat] = (productCounts[cat] ?? 0) + 1
    stockValue += Number(p.current_stock ?? 0) * Number(p.cost_price ?? 0)
    const min = Number((p as Record<string, unknown>).min_stock ?? 0)
    if (min > 0 && Number(p.current_stock ?? 0) <= min) lowStockCount++
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
    stockValue,
    lowStockCount,
  })
}
