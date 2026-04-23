// =============================================================
// validators.spec.ts — Tests unitarios para validadores
// =============================================================
import { describe, it, expect } from 'vitest'
import {
  required, emailValid, positiveNumber, nonNegativeNumber,
  minLength, maxLength, skuFormat, phoneBolivia,
} from 'src/utils/validators'

describe('validators', () => {

  describe('required', () => {
    it('retorna true para valor con contenido', () => {
      expect(required('hola')).toBe(true)
      expect(required(0)).toBe(true)
    })
    it('retorna mensaje de error para valor vacío', () => {
      expect(required('')).toBeTypeOf('string')
      expect(required('   ')).toBeTypeOf('string')
      expect(required(null)).toBeTypeOf('string')
      expect(required(undefined)).toBeTypeOf('string')
    })
  })

  describe('emailValid', () => {
    it('acepta emails válidos', () => {
      expect(emailValid('user@example.com')).toBe(true)
      expect(emailValid('admin@sgi.bo')).toBe(true)
    })
    it('rechaza emails inválidos', () => {
      expect(emailValid('no-es-email')).toBeTypeOf('string')
      expect(emailValid('falta@')).toBeTypeOf('string')
      expect(emailValid('@dominio.com')).toBeTypeOf('string')
    })
  })

  describe('positiveNumber', () => {
    it('acepta números positivos', () => {
      expect(positiveNumber(1)).toBe(true)
      expect(positiveNumber('10.5')).toBe(true)
    })
    it('rechaza cero y negativos', () => {
      expect(positiveNumber(0)).toBeTypeOf('string')
      expect(positiveNumber(-1)).toBeTypeOf('string')
      expect(positiveNumber('abc')).toBeTypeOf('string')
    })
  })

  describe('nonNegativeNumber', () => {
    it('acepta cero y positivos', () => {
      expect(nonNegativeNumber(0)).toBe(true)
      expect(nonNegativeNumber(5)).toBe(true)
    })
    it('rechaza negativos', () => {
      expect(nonNegativeNumber(-1)).toBeTypeOf('string')
    })
  })

  describe('minLength', () => {
    it('acepta cadena con longitud suficiente', () => {
      expect(minLength(3)('hola')).toBe(true)
      expect(minLength(3)('abc')).toBe(true)
    })
    it('rechaza cadena muy corta', () => {
      expect(minLength(3)('ab')).toBeTypeOf('string')
    })
  })

  describe('maxLength', () => {
    it('acepta cadena dentro del límite', () => {
      expect(maxLength(10)('hola')).toBe(true)
      expect(maxLength(10)('')).toBe(true)
    })
    it('rechaza cadena que supera el límite', () => {
      expect(maxLength(3)('hola')).toBeTypeOf('string')
    })
  })

  describe('skuFormat', () => {
    it('acepta SKUs válidos', () => {
      expect(skuFormat('ABC123')).toBe(true)
      expect(skuFormat('PROD-001')).toBe(true)
      expect(skuFormat('SKU_ABC_123')).toBe(true)
    })
    it('rechaza SKUs con caracteres inválidos', () => {
      expect(skuFormat('prod 001')).toBeTypeOf('string')
      expect(skuFormat('sku@001')).toBeTypeOf('string')
    })
  })

  describe('phoneBolivia', () => {
    it('acepta teléfonos válidos y vacío', () => {
      expect(phoneBolivia('+591 70000000')).toBe(true)
      expect(phoneBolivia('')).toBe(true)
    })
    it('rechaza formatos inválidos', () => {
      expect(phoneBolivia('abc')).toBeTypeOf('string')
    })
  })
})
