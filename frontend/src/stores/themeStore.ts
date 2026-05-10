import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { LocalStorage, type QVueGlobals } from 'quasar'

export type AppTheme = 'light' | 'medium' | 'dark'

const THEME_KEY = 'sgi_theme'
const THEMES: AppTheme[] = ['light', 'medium', 'dark']

function normalizeTheme(value: unknown): AppTheme {
  return THEMES.includes(value as AppTheme) ? (value as AppTheme) : 'dark'
}

export const useThemeStore = defineStore('theme', () => {
  const selectedTheme = ref<AppTheme>(normalizeTheme(LocalStorage.getItem(THEME_KEY)))

  const isDarkFamily = computed(() => selectedTheme.value === 'dark' || selectedTheme.value === 'medium')
  const currentThemeClass = computed(() => `sgi-theme-${selectedTheme.value}`)

  function setTheme(theme: AppTheme): void {
    selectedTheme.value = normalizeTheme(theme)
    LocalStorage.set(THEME_KEY, selectedTheme.value)
  }

  function applyTheme($q: QVueGlobals): void {
    if (typeof document === 'undefined') return

    document.body.classList.remove('sgi-theme-light', 'sgi-theme-medium', 'sgi-theme-dark')
    document.body.classList.add(currentThemeClass.value)
    $q.dark.set(isDarkFamily.value)
  }

  return {
    selectedTheme,
    currentThemeClass,
    isDarkFamily,
    setTheme,
    applyTheme,
  }
})
