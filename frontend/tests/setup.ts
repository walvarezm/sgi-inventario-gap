// =============================================================
// tests/setup.ts — Configuración global de tests
// =============================================================
import { vi } from 'vitest'

vi.mock('quasar', async () => {
  const actual = await vi.importActual<object>('quasar')
  return {
    ...actual,
    useQuasar: () => ({
      notify: vi.fn(),
      dialog: vi.fn().mockReturnValue({ onOk: vi.fn(), onCancel: vi.fn() }),
      dark: { toggle: vi.fn(), isActive: false },
      loading: { show: vi.fn(), hide: vi.fn() },
    }),
    LocalStorage: {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
    },
  }
})

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<object>('vue-router')
  return {
    ...actual,
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
    useRoute: () => ({ fullPath: '/', query: {}, params: {} }),
  }
})

Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_GAS_API_URL: 'https://mock-gas-api.test/exec',
    VITE_APP_NAME: 'SGI Test',
    VITE_APP_VERSION: '1.1.0-test',
    VITE_QR_BASE_URL: 'https://sgi.test',
  },
})
