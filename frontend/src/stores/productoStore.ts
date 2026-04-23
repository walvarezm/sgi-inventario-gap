// =============================================================
// productoStore.ts — Estado global de productos
// =============================================================
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Producto, ProductoForm } from 'src/types'
import { productoService } from 'src/services/productoService'

export const useProductoStore = defineStore('producto', () => {
  const items = ref<Producto[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)
  const selected = ref<Producto | null>(null)

  const activos = computed(() => items.value.filter((p) => p.activo))
  const bySku = computed(() => {
    const map = new Map<string, Producto>()
    items.value.forEach((p) => map.set(p.sku, p))
    return map
  })

  async function fetchAll(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      items.value = await productoService.getAll()
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function create(form: ProductoForm): Promise<Producto> {
    saving.value = true
    error.value = null
    try {
      const nuevo = await productoService.create(form)
      items.value.push(nuevo)
      return nuevo
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      saving.value = false
    }
  }

  async function update(id: string, changes: Partial<ProductoForm>): Promise<Producto> {
    saving.value = true
    error.value = null
    try {
      const actualizado = await productoService.update(id, changes)
      const idx = items.value.findIndex((p) => p.id === id)
      if (idx !== -1) items.value[idx] = actualizado
      if (selected.value?.id === id) selected.value = actualizado
      return actualizado
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      saving.value = false
    }
  }

  async function remove(id: string): Promise<void> {
    saving.value = true
    try {
      await productoService.remove(id)
      items.value = items.value.filter((p) => p.id !== id)
      if (selected.value?.id === id) selected.value = null
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      saving.value = false
    }
  }

  function getById(id: string): Producto | undefined {
    return items.value.find((p) => p.id === id)
  }
  function findBySku(sku: string): Producto | undefined { return bySku.value.get(sku) }
  function select(producto: Producto | null): void { selected.value = producto }
  function clearError(): void { error.value = null }

  return {
    items, loading, saving, error, selected, activos, bySku,
    fetchAll, create, update, remove, getById, findBySku, select, clearError,
  }
})
