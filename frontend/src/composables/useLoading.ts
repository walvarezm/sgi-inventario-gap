import { Loading } from 'quasar'
import { QSpinnerGears} from 'quasar'
import type { QLoadingShowOptions } from 'quasar'


//import ImageSpinner from './ImageSpinnerComponent.vue'

export const useLoading = (isLoading: boolean, message?: string): void => {
  if (!isLoading) {
    Loading.hide()
    return
  }

  const setup: QLoadingShowOptions = {
    spinner: QSpinnerGears,
    backgroundColor: 'dark',
    message: message ?? 'Espere un momento por favor',
    messageColor: 'white',
  }
  Loading.show(setup)
}
