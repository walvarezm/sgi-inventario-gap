<template>
  <router-view />
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar'
import { watch } from 'vue'
import { useThemeStore } from 'src/stores/themeStore'

const $q = useQuasar()
const themeStore = useThemeStore()

watch(
  () => themeStore.selectedTheme,
  () => {
    themeStore.applyTheme($q)
  },
  { immediate: true },
)
</script>
