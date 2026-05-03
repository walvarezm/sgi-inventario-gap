import { createApp } from 'vue'
import { Quasar, Notify, Dialog, Loading } from 'quasar'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'

// Import icon libraries
import '@quasar/extras/material-icons/material-icons.css'

// Import Quasar css
import 'quasar/dist/quasar.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(Quasar, {
  plugins: {
    Notify,
    Dialog,
    Loading
  }
})

app.mount('#q-app')
