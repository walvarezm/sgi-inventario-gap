// =============================================================
// boot/pinia.ts — Verificación de sesión al arrancar la app
// =============================================================
import { boot } from 'quasar/wrappers'
import { useAuthStore } from 'src/stores/authStore'

export default boot(async () => {
  const authStore = useAuthStore()
  if (authStore.sesion && !authStore.isAuthenticated) {
    authStore.logout()
  }
})
