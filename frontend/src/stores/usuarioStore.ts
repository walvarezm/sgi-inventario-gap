// =============================================================
// usuarioStore.ts — Estado global de usuarios
// =============================================================
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Usuario, UsuarioForm } from 'src/types'
import { usuarioService } from 'src/services/usuarioService'

type UsuarioPayload = UsuarioForm & { password?: string; roles?: string[]; scopeValues?: string[] }

export const useUsuarioStore = defineStore('usuario', () => {
  const items = ref<Usuario[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  const activos = computed(() => items.value.filter((u) => u.activo))

  async function fetchAll(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      items.value = await usuarioService.getAll()
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function create(payload: UsuarioPayload): Promise<Usuario> {
    saving.value = true
    error.value = null
    try {
      const nuevo = await usuarioService.create(payload)
      items.value.push(nuevo)
      return nuevo
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      saving.value = false
    }
  }

  async function update(id: string, payload: Partial<UsuarioPayload>): Promise<Usuario> {
    saving.value = true
    error.value = null
    try {
      const actualizado = await usuarioService.update(id, payload)
      const idx = items.value.findIndex((u) => u.id === id)
      if (idx !== -1) items.value[idx] = actualizado
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
    error.value = null
    try {
      await usuarioService.remove(id)
      const idx = items.value.findIndex((u) => u.id === id)
      if (idx !== -1) items.value[idx] = { ...items.value[idx], activo: false }
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      saving.value = false
    }
  }

  function getById(id: string): Usuario | undefined {
    return items.value.find((u) => u.id === id)
  }

  return {
    items, loading, saving, error, activos,
    fetchAll, create, update, remove, getById,
  }
})
