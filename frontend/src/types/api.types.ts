// =============================================================
// API Types — Respuestas estandarizadas del backend GAS
// =============================================================

export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  result: T
}

export interface ApiError {
  success: false
  message: string
  result: null
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface ApiRequestConfig {
  action: string
  payload?: Record<string, unknown>
  token?: string
}
