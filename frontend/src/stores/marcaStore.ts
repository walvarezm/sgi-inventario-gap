// =============================================================
// categoriaStore.ts — Estado global de categorías
// =============================================================
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Marca, MarcaForm } from 'src/types'
import { marcaService } from 'src/services/marcaService'

export const useMarcaStore = defineStore('marca', () => {
  const items = ref<Marca[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const activas = computed(() => items.value.filter((c) => c.activo))
  const options = computed(() => activas.value.map((c) => ({ label: c.nombre, value: c.id })))
  const optionsName = computed(() =>
    activas.value.map((c) => ({ label: c.nombre, value: c.nombre })))

  async function fetchAll(): Promise<void> {
    if (items.value.length > 0) return
    loading.value = true
    error.value = null
    try {
      items.value = await marcaService.getAll()
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function create(form: MarcaForm): Promise<Marca> {
    const nueva = await marcaService.create(form)
    items.value.push(nueva)
    return nueva
  }

  async function update(id: string, changes: Partial<MarcaForm>): Promise<Marca> {
    const actualizada = await marcaService.update(id, changes)
    const idx = items.value.findIndex((c) => c.id === id)
    if (idx !== -1) items.value[idx] = actualizada
    return actualizada
  }

  function getById(id: string): Marca | undefined {
    return items.value.find((c) => c.id === id)
  }

  function forceReload(): void {
    items.value = []
  }

  return {
    items,
    loading,
    error,
    activas,
    options,
    fetchAll,
    create,
    update,
    getById,
    forceReload,
    optionsName,
  }
})
