export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { initQuotesTable, initInventoryTables, initProjectsTables, getDbClient } from '@/lib/db'

export async function GET() {
  await Promise.all([initQuotesTable(), initInventoryTables(), initProjectsTables()])
  const db = getDbClient()

  // Monthly quotes (last 6 months)
  const quotes = await db.execute('SELECT date, grand_total, status, client_name FROM pongs_quotes ORDER BY date DESC')
  const now = new Date()
  const monthlyMap: Record<string, { count: number; value: number }> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    monthlyMap[key] = { count: 0, value: 0 }
  }
  const clientMap: Record<string, { count: number; value: number; last: string }> = {}
  const statusMap: Record<string, number> = {}
  for (const q of quotes.rows) {
    const m = String(q.date ?? '').slice(0, 7)
    if (monthlyMap[m]) { monthlyMap[m].count++; monthlyMap[m].value += Number(q.grand_total ?? 0) }
    const cn = String(q.client_name ?? 'Unknown')
    if (!clientMap[cn]) clientMap[cn] = { count: 0, value: 0, last: '' }
    clientMap[cn].count++
    clientMap[cn].value += Number(q.grand_total ?? 0)
    if (String(q.date ?? '') > clientMap[cn].last) clientMap[cn].last = String(q.date ?? '')
    const st = String(q.status ?? 'draft')
    statusMap[st] = (statusMap[st] ?? 0) + 1
  }
  const monthlyQuotes = Object.entries(monthlyMap).map(([month, d]) => ({ month: month.slice(5) + '/' + month.slice(0,4), ...d }))
  const topClients = Object.entries(clientMap).sort((a,b) => b[1].value - a[1].value).slice(0,10).map(([name,d]) => ({ name, ...d }))
  const quoteStatus = Object.entries(statusMap).map(([status, count]) => ({ status, count }))

  // Inventory value
  const products = await db.execute('SELECT category, current_stock, cost_price FROM inv_products')
  let totalInvValue = 0
  const invByCategory: Record<string, number> = {}
  for (const p of products.rows) {
    const val = Number(p.current_stock ?? 0) * Number(p.cost_price ?? 0)
    totalInvValue += val
    const cat = String(p.category ?? 'Other')
    invByCategory[cat] = (invByCategory[cat] ?? 0) + val
  }
  const lowStockCount = products.rows.filter(p => Number(p.current_stock ?? 0) <= Number((p as Record<string,unknown>).min_stock ?? 0) && Number((p as Record<string,unknown>).min_stock ?? 0) > 0).length

  // Spend by category (from purchases)
  const purchItems = await db.execute('SELECT category, total_price FROM inv_purchase_items')
  const spendByCategory: Record<string, number> = {}
  for (const pi of purchItems.rows) {
    const cat = String(pi.category ?? 'Other')
    spendByCategory[cat] = (spendByCategory[cat] ?? 0) + Number(pi.total_price ?? 0)
  }

  // Projects pipeline
  const projects = await db.execute('SELECT status, contract_value, ceiling_area_sqft FROM projects')
  const projectsByStatus: Record<string, { count: number; value: number; area: number }> = {}
  for (const p of projects.rows) {
    const st = String(p.status ?? 'scheduled')
    if (!projectsByStatus[st]) projectsByStatus[st] = { count: 0, value: 0, area: 0 }
    projectsByStatus[st].count++
    projectsByStatus[st].value += Number(p.contract_value ?? 0)
    projectsByStatus[st].area += Number(p.ceiling_area_sqft ?? 0)
  }

  return NextResponse.json({
    monthlyQuotes,
    topClients,
    quoteStatus,
    totalInvValue,
    invByCategory: Object.entries(invByCategory).map(([cat,val]) => ({ cat, val })),
    spendByCategory: Object.entries(spendByCategory).sort((a,b)=>b[1]-a[1]).map(([cat,val]) => ({ cat, val })),
    lowStockCount,
    projectsByStatus,
    totalActiveProjects: projects.rows.filter(p => !['completed','invoiced','cancelled'].includes(String(p.status))).length,
    totalQuotesThisMonth: monthlyMap[Object.keys(monthlyMap).at(-1) ?? '']?.count ?? 0,
    totalValueThisMonth: monthlyMap[Object.keys(monthlyMap).at(-1) ?? '']?.value ?? 0,
  })
}
