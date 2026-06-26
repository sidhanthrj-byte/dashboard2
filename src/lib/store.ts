import fs from 'fs'
import path from 'path'
import type { Quote } from './types'

const DATA_FILE = path.join(process.cwd(), 'data', 'quotes.json')

function ensureFile() {
  const dir = path.dirname(DATA_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf8')
}

export function readQuotes(): Quote[] {
  ensureFile()
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) as Quote[]
}

export function writeQuotes(quotes: Quote[]): void {
  ensureFile()
  fs.writeFileSync(DATA_FILE, JSON.stringify(quotes, null, 2), 'utf8')
}

export function getQuote(id: string): Quote | undefined {
  return readQuotes().find(q => q.id === id)
}

export function saveQuote(quote: Quote): void {
  const quotes = readQuotes()
  const idx = quotes.findIndex(q => q.id === quote.id)
  if (idx >= 0) quotes[idx] = quote
  else quotes.push(quote)
  writeQuotes(quotes)
}

export function deleteQuote(id: string): void {
  writeQuotes(readQuotes().filter(q => q.id !== id))
}

export function nextQuoteNumber(): string {
  const quotes = readQuotes()
  const max = quotes.reduce((n, q) => {
    const num = parseInt(q.quoteNumber?.replace(/\D/g, '') || '0', 10)
    return Math.max(n, num)
  }, 0)
  return `Q-${String(max + 1).padStart(4, '0')}`
}
