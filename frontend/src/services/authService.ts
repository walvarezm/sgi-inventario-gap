// =============================================================
// authService.ts — Autenticación contra GAS
// IMPORTANTE: Content-Type text/plain para evitar preflight CORS
// =============================================================
import axios from 'axios'
import type { ApiResponse, LoginCredentials, LoginResponse, SesionUsuario } from 'src/types'

// Instancia específica para login (sin interceptor de token)
const gasAxios = axios.create({
  baseURL: import.meta.env.VITE_GAS_API_URL,
  headers: {
    'Content-Type': 'text/plain',
  },
  timeout: 30000,
})

export const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const { data } = await gasAxios.post<ApiResponse<LoginResponse>>(
      import.meta.env.VITE_GAS_API_URL,
      JSON.stringify({
        action: 'login',
        payload: credentials,
      }),
    )
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async verificarToken(token: string): Promise<SesionUsuario | null> {
    const { data } = await gasAxios.post<ApiResponse<SesionUsuario>>(
      import.meta.env.VITE_GAS_API_URL,
      JSON.stringify({
        action: 'verificarToken',
        token,
      }),
    )
    return data.success ? data.result : null
  },
}
