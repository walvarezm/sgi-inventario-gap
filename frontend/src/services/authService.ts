// =============================================================
// authService.ts — Autenticación contra GAS
// =============================================================
import axios from 'axios'
import type { ApiResponse, LoginCredentials, LoginResponse } from 'src/types'

export const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    // Login usa axios directo (sin interceptor de token)
    const { data } = await axios.post<ApiResponse<LoginResponse>>(
      import.meta.env.VITE_GAS_API_URL,
      {
        action: 'login',
        payload: credentials,
      },
    )
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async verificarToken(token: string): Promise<boolean> {
    const { data } = await axios.post<ApiResponse<boolean>>(
      import.meta.env.VITE_GAS_API_URL,
      {
        action: 'verificarToken',
        token,
      },
    )
    return data.success && data.result === true
  },
}
