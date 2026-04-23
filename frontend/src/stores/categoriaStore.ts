// =============================================================
// categoriaStore.ts — Estado global de categorías
// =============================================================
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Categoria } from 'src/types'
import { categoriaService, type CategoriaForm } from 'src/services/categoriaService'

export const useCategoriaStore = defineStore('categoria', () => {
  const items = ref<Categoria[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const activas = computed(() => items.value.filter((c) => c.activo))
  const options = computed(() => activas.value.map((c) => ({ label: c.nombre, value: c.id })))

  async function fetchAll(): Promise<void> {
    if (items.value.length > 0) return
    loading.value = true
    error.value = null
    try {
      items.value = await categoriaService.getAll()
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function create(form: CategoriaForm): Promise<Categoria> {
    const nueva = await categoriaService.create(form)
    items.value.push(nueva)
    return nueva
  }

  async function update(id: string, changes: Partial<CategoriaForm>): Promise<Categoria> {
    const actualizada = await categoriaService.update(id, changes)
    const idx = items.value.findIndex((c) => c.id === id)
    if (idx !== -1) items.value[idx] = actualizada
    return actualizada
  }

  function getById(id: string): Categoria | undefined {
    return items.value.find((c) => c.id === id)
  }

  function forceReload(): void { items.value = [] }

  return { items, loading, error, activas, options, fetchAll, create, update, getById, forceReload }
})
