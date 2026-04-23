// =============================================================
// useNotify.ts — Helper para notificaciones Quasar unificadas
// =============================================================
import { useQuasar } from 'quasar'

export function useNotify() {
  const $q = useQuasar()

  function notifySuccess(message: string): void {
    $q.notify({ type: 'positive', message, position: 'top-right', timeout: 3000, icon: 'check_circle' })
  }
  function notifyError(message: string): void {
    $q.notify({ type: 'negative', message, position: 'top-right', timeout: 5000, icon: 'error' })
  }
  function notifyWarning(message: string): void {
    $q.notify({ type: 'warning', message, position: 'top-right', timeout: 4000, icon: 'warning' })
  }
  function notifyInfo(message: string): void {
    $q.notify({ type: 'info', message, position: 'top-right', timeout: 3000, icon: 'info' })
  }

  return { notifySuccess, notifyError, notifyWarning, notifyInfo }
}
