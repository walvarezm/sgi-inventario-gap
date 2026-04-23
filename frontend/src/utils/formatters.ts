// =============================================================
// formatters.ts — Formateo de datos para la UI
// =============================================================

export function formatCurrency(amount: number, currency = 'BOB'): string {
  return new Intl.NumberFormat('es-BO', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount)
}

export function formatDate(isoString: string): string {
  if (!isoString) return '—'
  return new Intl.DateTimeFormat('es-BO', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(isoString))
}

export function formatDateTime(isoString: string): string {
  if (!isoString) return '—'
  return new Intl.DateTimeFormat('es-BO', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(isoString))
}

export function truncate(text: string, maxLength = 50): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}…`
}

export function formatStock(stock: number, minimo: number): string {
  const emoji = stock <= minimo ? '⚠️' : '✅'
  return `${emoji} ${stock}`
}

export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('es-BO').format(n)
}
