import { configure } from 'quasar/wrappers'

export default configure(function (/* ctx */) {
  return {
    eslint: {
      fix: true,
      include: ['src'],
      exclude: ['node_modules'],
      rawOptions: {},
      warnings: true,
      errors: true,
    },

    boot: ['axios', 'pinia'],

    css: ['app.scss'],

    extras: ['material-icons', 'eva-icons'],

    build: {
      target: {
        browser: ['es2020'],
        node: 'node20',
      },
      vueRouterMode: 'history',
      typescript: {
        strict: true,
        vueShim: true,
      },
    },

    devServer: {
      open: true,
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
  }
})
