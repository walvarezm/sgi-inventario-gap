// =============================================================
// formatters.spec.ts — Tests unitarios para formatters
// =============================================================
import { describe, it, expect } from 'vitest'
import { formatCurrency, formatDate, truncate, generateId, formatNumber } from 'src/utils/formatters'

describe('formatters', () => {

  describe('formatCurrency', () => {
    it('formatea moneda BOB por defecto', () => {
      expect(formatCurrency(100)).toContain('100')
    })
    it('formatea correctamente con decimales', () => {
      expect(formatCurrency(99.99)).toContain('99')
    })
    it('maneja cero', () => {
      expect(formatCurrency(0)).toContain('0')
    })
  })

  describe('formatDate', () => {
    it('formatea fecha ISO a formato local', () => {
      const result = formatDate('2026-03-15T00:00:00.000Z')
      expect(result).toBeTruthy()
      expect(result).not.toBe('—')
    })
    it('retorna guión para cadena vacía', () => {
      expect(formatDate('')).toBe('—')
    })
  })

  describe('truncate', () => {
    it('no trunca cadenas cortas', () => {
      expect(truncate('hola', 10)).toBe('hola')
    })
    it('trunca cadenas largas con ellipsis', () => {
      const result = truncate('Esta es una cadena muy larga', 10)
      expect(result).toHaveLength(11)
      expect(result.endsWith('…')).toBe(true)
    })
    it('respeta el límite exacto', () => {
      expect(truncate('12345', 5)).toBe('12345')
    })
  })

  describe('generateId', () => {
    it('genera IDs únicos con formato UUID', () => {
      const id1 = generateId()
      const id2 = generateId()
      expect(id1).not.toBe(id2)
      expect(id1).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      )
    })
  })

  describe('formatNumber', () => {
    it('formatea números con separadores', () => {
      const result = formatNumber(1000)
      expect(result).toContain('1')
      expect(result).toContain('000')
    })
  })
})
