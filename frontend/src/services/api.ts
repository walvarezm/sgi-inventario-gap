// =============================================================
// api.ts — Instancia base de Axios para comunicación con GAS
// IMPORTANTE: GAS requiere Content-Type: text/plain para evitar
// el preflight CORS. El body sigue siendo JSON serializado.
// =============================================================
import axios from 'axios'
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios'
import { useAuthStore } from 'src/stores/authStore'

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_GAS_API_URL,
  timeout: 1800000,
  headers: {
    // GAS no responde el preflight OPTIONS para application/json
    // text/plain evita el preflight y GAS igual parsea el JSON del body
    'Content-Type': 'text/plain',
  },
})

// Request interceptor — inyecta el token de sesión
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    try {
      const authStore = useAuthStore()
      if (authStore.token && config.data) {
        const body =
          typeof config.data === 'string' ? JSON.parse(config.data) : config.data
        body.token = authStore.token
        config.data = JSON.stringify(body)
      }
    } catch {
      // Si no hay store disponible (ej. durante login), continuar sin token
    }
    return config
  },
  (error) => Promise.reject(error),
)

// Response interceptor — manejo global de errores
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response?.status === 401) {
      try {
        const authStore = useAuthStore()
        authStore.logout()
        window.location.href = '/login'
      } catch {
        // Silently fail if store not available
      }
    }
    return Promise.reject(error)
  },
)

export { api }
