export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { initInventoryTables, initClientsTable, getDbClient } from '@/lib/db'

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN ?? ''
const INV_BASE = 'app2FrlwV3q6xJj2O'
const CRM_BASE = 'appf0IuDxOc3YaAid'

async function fetchAll(baseId: string, tableId: string) {
  const records: Record<string, unknown>[] = []
  let offset: string | undefined
  do {
    const url = `https://api.airtable.com/v0/${baseId}/${tableId}?pageSize=100${offset ? `&offset=${offset}` : ''}`
    const r = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } })
    const data = await r.json() as { records: { id: string; fields: Record<string, unknown> }[]; offset?: string }
    records.push(...data.records.map(r => ({ _id: r.id, ...r.fields })))
    offset = data.offset
  } while (offset)
  return records
}

export async function POST(req: NextRequest) {
  // Simple security check
  const { secret } = await req.json()
  if (secret !== 'pongs-import-2024') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!AIRTABLE_TOKEN) return NextResponse.json({ error: 'AIRTABLE_TOKEN env var not set' }, { status: 500 })

  await initInventoryTables()
  await initClientsTable()
  const db = getDbClient()

  const results: Record<string, number> = {}

  // 1. Import Suppliers
  const suppliers = await fetchAll(INV_BASE, 'tbldtQjWVq9otFPbQ')
  let supplierCount = 0
  for (const s of suppliers) {
    const id = String(s._id)
    const existing = await db.execute('SELECT id FROM inv_suppliers WHERE id = ?', [id])
    if (existing.rows.length > 0) continue
    await db.execute(
      'INSERT INTO inv_suppliers (id, name, contact_name, email, phone, address, notes) VALUES (?,?,?,?,?,?,?)',
      [id, String(s['Company Name'] ?? ''), String(s['Contact Person'] ?? ''), String(s['Email'] ?? ''), String(s['Phone'] ?? ''), String(s['Address'] ?? ''), String(s['Supplier Category'] ?? '')]
    )
    supplierCount++
  }
  results.suppliers = supplierCount

  // 2. Import Inventory Products
  const products = await fetchAll(INV_BASE, 'tblkzt1mJsp1eKfAK')
  let productCount = 0
  for (const p of products) {
    const id = String(p._id)
    const existing = await db.execute('SELECT id FROM inv_products WHERE id = ?', [id])
    const name = String(p['Product Title'] ?? '')
    const category = String(p['Category'] ?? '')
    const sku = String(p['Product Code (SKU)'] ?? '')
    const unit = Array.isArray(p['Measuring Unit']) ? String(p['Measuring Unit'][0] ?? 'nos') : 'nos'
    const currentStock = Number(p['Current Stock'] ?? 0)
    const costPrice = Number(p['Dealer Price'] ?? 0)
    const sellPrice = Number(p['Customer Price'] ?? 0)
    const supplierIds = Array.isArray(p['Supplier']) ? p['Supplier'] : []
    const supplierId = supplierIds.length > 0 ? String(supplierIds[0]) : null
    const notes = `HSN: ${p['HSN Code'] ?? ''} | GST: ${Math.round(Number(p['GST'] ?? 0.18) * 100)}% | MSP: ${p['MSP'] ?? ''}`

    if (existing.rows.length > 0) {
      await db.execute(
        'UPDATE inv_products SET name=?, category=?, sku=?, unit=?, current_stock=?, cost_price=?, sell_price=?, supplier_id=?, notes=? WHERE id=?',
        [name, category, sku, unit, currentStock, costPrice, sellPrice, supplierId, notes, id]
      )
    } else {
      await db.execute(
        'INSERT INTO inv_products (id, name, category, sku, unit, current_stock, cost_price, sell_price, supplier_id, notes) VALUES (?,?,?,?,?,?,?,?,?,?)',
        [id, name, category, sku, unit, currentStock, costPrice, sellPrice, supplierId, notes]
      )
      productCount++
    }
  }
  results.products = productCount

  // 3. Import Customers from CRM
  const customers = await fetchAll(CRM_BASE, 'tblkPyi2TCZwNiBHp')
  let clientCount = 0
  for (const c of customers) {
    const id = String(c._id)
    const existing = await db.execute('SELECT id FROM clients WHERE id = ?', [id])
    const name = String(c['Contact Person'] || c['Customer Name'] || '')
    if (!name) continue
    const company = String(c['Company Name'] || c['Customer Name'] || '')
    const email = String(c['Email'] || '')
    const phone = String(c['Phone'] || '')
    const city = String(c['City'] || '')
    const address = String(c['Address'] || '')
    const gst = String(c['GSTIN'] || '')
    const status = String(c['Customer Type'] === 'Inactive' ? 'inactive' : 'active')

    if (existing.rows.length > 0) continue
    await db.execute(
      'INSERT INTO clients (id, name, company, email, phone, city, address, gst_number, source, status) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [id, name, company, email, phone, city, address, gst, 'airtable', status]
    )
    clientCount++
  }
  results.clients = clientCount

  return NextResponse.json({ ok: true, imported: results })
}
