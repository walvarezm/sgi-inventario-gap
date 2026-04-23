// =============================================================
// validators.ts — Validadores reutilizables para formularios
// =============================================================

export const required = (val: unknown): boolean | string =>
  (val !== null && val !== undefined && String(val).trim() !== '') || 'Este campo es requerido'

export const emailValid = (val: string): boolean | string =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || 'Ingrese un email válido'

export const positiveNumber = (val: unknown): boolean | string => {
  const n = Number(val)
  return (!isNaN(n) && n > 0) || 'Debe ser un número mayor a 0'
}

export const nonNegativeNumber = (val: unknown): boolean | string => {
  const n = Number(val)
  return (!isNaN(n) && n >= 0) || 'Debe ser un número igual o mayor a 0'
}

export const minLength = (min: number) => (val: string): boolean | string =>
  (val && val.length >= min) || `Mínimo ${min} caracteres`

export const maxLength = (max: number) => (val: string): boolean | string =>
  !val || val.length <= max || `Máximo ${max} caracteres`

export const skuFormat = (val: string): boolean | string =>
  /^[A-Z0-9\-_]+$/i.test(val) || 'Solo letras, números, guiones y guiones bajos'

export const phoneBolivia = (val: string): boolean | string =>
  !val || /^\+?[0-9\s\-()]{7,15}$/.test(val) || 'Formato de teléfono inválido'
