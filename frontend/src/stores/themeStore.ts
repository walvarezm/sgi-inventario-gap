import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { LocalStorage, type QVueGlobals } from 'quasar'

export type AppTheme = 'light' | 'dark'

const THEME_KEY = 'sgi_theme'
const THEMES: AppTheme[] = ['light', 'dark']

function normalizeTheme(value: unknown): AppTheme {
  return THEMES.includes(value as AppTheme) ? (value as AppTheme) : 'light'
}

function readPersistedTheme(): AppTheme {
  if (typeof window === 'undefined') return 'light'
  // 1) preferencia explícita del usuario
  const stored = LocalStorage.getItem(THEME_KEY) as unknown
  if (stored && THEMES.includes(stored as AppTheme)) return stored as AppTheme
  // 2) preferencia del sistema operativo
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark'
  return 'light'
}

export const useThemeStore = defineStore('theme', () => {
  const selectedTheme = ref<AppTheme>(readPersistedTheme())

  const isDark = computed(() => selectedTheme.value === 'dark')
  const currentThemeClass = computed(() => `sgi-theme-${selectedTheme.value}`)

  function setTheme(theme: AppTheme): void {
    selectedTheme.value = normalizeTheme(theme)
    LocalStorage.set(THEME_KEY, selectedTheme.value)
  }

  function toggleTheme(): void {
    setTheme(isDark.value ? 'light' : 'dark')
  }

  function applyTheme($q: QVueGlobals): void {
    if (typeof document === 'undefined') return

    document.body.classList.remove('sgi-theme-light', 'sgi-theme-dark')
    document.body.classList.add(currentThemeClass.value)
    $q.dark.set(isDark.value)
  }

  // Sincronizar con cambios del sistema operativo (solo si no hay override explícito)
  if (typeof window !== 'undefined' && window.matchMedia) {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const onSystemChange = (e: MediaQueryListEvent): void => {
      const stored = LocalStorage.getItem(THEME_KEY)
      // Solo aplicar si el usuario nunca eligió un tema manualmente
      if (!stored) {
        selectedTheme.value = e.matches ? 'dark' : 'light'
      }
    }
    mql.addEventListener?.('change', onSystemChange)
  }

  // Re-aplicar clase cuando cambia el tema
  watch(selectedTheme, () => {
    if (typeof document === 'undefined') return
    document.body.classList.remove('sgi-theme-light', 'sgi-theme-dark')
    document.body.classList.add(currentThemeClass.value)
  })

  return {
    selectedTheme,
    currentThemeClass,
    isDark,
    setTheme,
    toggleTheme,
    applyTheme,
  }
})
