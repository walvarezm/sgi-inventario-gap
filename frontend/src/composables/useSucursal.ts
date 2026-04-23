// =============================================================
// useSucursal.ts — Composable para gestión de sucursales
// =============================================================
import { computed } from 'vue'
import { useSucursalStore } from 'src/stores/sucursalStore'
import { useAuthStore } from 'src/stores/authStore'

export function useSucursal() {
  const sucursalStore = useSucursalStore()
  const authStore = useAuthStore()

  const sucursalesVisibles = computed(() => {
    if (authStore.isGlobal) return sucursalStore.activas
    return sucursalStore.activas.filter((s) => s.id === authStore.sucursalId)
  })

  const opcionesSucursal = computed(() =>
    sucursalesVisibles.value.map((s) => ({
      label: `${s.nombre} — ${s.ciudad}`,
      value: s.id,
    })),
  )

  const sucursalDefecto = computed(() => {
    if (!authStore.sucursalId) return null
    if (authStore.isGlobal) return sucursalStore.activas[0] ?? null
    return sucursalStore.getById(authStore.sucursalId) ?? null
  })

  function getNombre(id: string): string {
    return sucursalStore.getById(id)?.nombre ?? id
  }

  return {
    sucursalesVisibles,
    opcionesSucursal,
    sucursalDefecto,
    getNombre,
    loading: computed(() => sucursalStore.loading),
    activas: computed(() => sucursalStore.activas),
  }
}
