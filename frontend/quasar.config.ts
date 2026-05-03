// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { configure } from 'quasar/wrappers'

export default configure(() => {
  return {
    boot: ['axios', 'pinia'],

    css: ['app.scss'],

    extras: ['material-icons', 'eva-icons'],

    build: {
      target: {
        browser: ['es2020'],
        node: 'node20',
      },
      typescript: {
        strict: true,
        vueShim: true,
      },
      vueRouterMode: 'history',
      vitePlugins: [],
    },

    devServer: {
      open: true,
      // ── Proxy para evitar CORS con Google Apps Script en desarrollo ──
      // Las peticiones a /api/gas/* se redirigen a la URL de GAS
      // En producción el frontend llama directamente a GAS (sin proxy)
      proxy: {
        '/api/gas': {
          target: 'https://script.google.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path: string) =>
            path.replace(/^\/api\/gas/, '/macros/s'),
        },
      },
    },

    framework: {
      config: {
        dark: 'auto',
        notify: { position: 'top-right' },
        loading: {},
      },
      plugins: ['Notify', 'Loading', 'Dialog', 'LocalStorage'],
    },

    animations: [],

    pwa: {
      workboxMode: 'generateSW',
      injectPwaMetaTags: true,
      swFilename: 'sw.js',
      manifestFilename: 'manifest.json',
      useCredentialsForManifestTag: false,
    },

    capacitor: {
      hideSplashscreen: true,
    },

    electron: {
      inspectPort: 5858,
      bundler: 'packager',
      packager: {},
      builder: {
        appId: 'sgi-inventarios',
      },
    },

    bex: {
      contentScripts: ['my-content-script'],
    },
  }
})
