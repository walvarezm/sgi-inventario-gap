// =============================================================
// api.ts — Instancia base de Axios para comunicación con GAS
// =============================================================
import axios from 'axios'
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios'
import { useAuthStore } from 'src/stores/authStore'

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_GAS_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor — inyecta el token de sesión
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    try {
      const authStore = useAuthStore()
      if (authStore.token && config.data) {
        const body = JSON.parse(config.data as string)
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
