// =============================================================
// useNotify.ts — Helper para notificaciones Quasar unificadas
// =============================================================
import { useQuasar } from 'quasar'

export function useNotify() {
  const $q = useQuasar()

  function notifySuccess(message: string, pos = 'top-right'): void {
    $q.notify({
      type: 'positive',
      message,
      position: pos as 'top-right',
      timeout: 3000,
      icon: 'check_circle',
      actions: [{ icon: 'close' }],
    })
  }
  function notifyError(message: string, pos = 'top-right'): void {
    $q.notify({
      type: 'negative',
      message,
      position: pos as 'top-right',
      timeout: 5000,
      icon: 'error',
      actions: [{ icon: 'close' }],
    })
  }
  function notifyWarning(message: string, pos = 'top-right'): void {
    $q.notify({
      type: 'warning',
      message,
      position: pos as 'top-right',
      timeout: 3000,
      icon: 'warning',
      actions: [ { icon: 'close'}],
    })
  }
  function notifyInfo(message: string, pos = 'top-right'): void {
    $q.notify({
      type: 'info',
      message,
      position: pos as 'top-right',
      timeout: 3000,
      icon: 'info',
      actions: [{ icon: 'close' }],
    })
  }

  return { notifySuccess, notifyError, notifyWarning, notifyInfo }
}
