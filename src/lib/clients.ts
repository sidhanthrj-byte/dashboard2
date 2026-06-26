// Client book stored in localStorage (browser-side only)
export interface SavedClient {
  id: string
  name: string
  phone: string
  email: string
  location: string
  priceTier: string
  markupPercent: number
  notes: string
  createdAt: string
}

const KEY = 'pongs_clients'

export function listClients(): SavedClient[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

export function saveClient(client: SavedClient): void {
  const clients = listClients()
  const idx = clients.findIndex(c => c.id === client.id)
  if (idx >= 0) clients[idx] = client
  else clients.push(client)
  localStorage.setItem(KEY, JSON.stringify(clients))
}

export function deleteClient(id: string): void {
  localStorage.setItem(KEY, JSON.stringify(listClients().filter(c => c.id !== id)))
}
