// =============================================================
// useMovimientoDraft.ts
// Persiste el borrador del formulario de movimiento en localStorage.
// Sobrevive refresco de página y caducidad de sesión.
// =============================================================
import { watch } from 'vue'
import type { Ref } from 'vue'
import type { TipoMovimiento } from 'src/types'

// ── Tipos locales ─────────────────────────────────────────────
export interface DraftItem {
  localId: string
  secuencial: number
  productoId: string
  cantidad: number
  precioOfrecido: number
  precioFinal: number
  detalleAccion: string
  productoNombre?: string
  movimientoOrigenId?: string
  id?: string
}

export interface MovimientoDraft {
  tipo: TipoMovimiento
  modo: 'UNITARIO' | 'MASIVO'
  fechaRegistro: string
  sucursalId: string
  sucursalOrigen: string
  sucursalDestino: string
  referenciaTipo: string
  referenciaTexto: string
  notas: string
  items: DraftItem[]
  savedAt: number   // timestamp para expiración
}

/** Máximo de horas que el draft se considera válido antes de descartarse */
const DRAFT_TTL_HOURS = 24
const DRAFT_TTL_MS = DRAFT_TTL_HOURS * 60 * 60 * 1000

function buildKey(tipo: TipoMovimiento): string {
  return `sgi_movimiento_draft_${tipo.toLowerCase()}`
}

/** Lee y valida el draft almacenado para el tipo dado. */
export function loadDraft(tipo: TipoMovimiento): MovimientoDraft | null {
  try {
    const raw = localStorage.getItem(buildKey(tipo))
    if (!raw) return null
    const draft = JSON.parse(raw) as MovimientoDraft
    // Descartar si ha expirado o si el tipo no coincide
    if (!draft.savedAt || Date.now() - draft.savedAt > DRAFT_TTL_MS) {
      clearDraft(tipo)
      return null
    }
    if (draft.tipo !== tipo) {
      clearDraft(tipo)
      return null
    }
    return draft
  } catch {
    clearDraft(tipo)
    return null
  }
}

/** Guarda el draft en localStorage. */
export function saveDraft(draft: MovimientoDraft): void {
  try {
    localStorage.setItem(buildKey(draft.tipo), JSON.stringify({ ...draft, savedAt: Date.now() }))
  } catch {
    // Silencioso: cuota excedida, modo privado sin storage, etc.
  }
}

/** Elimina el draft almacenado para el tipo dado. */
export function clearDraft(tipo: TipoMovimiento): void {
  try {
    localStorage.removeItem(buildKey(tipo))
  } catch { /* noop */ }
}

// ─────────────────────────────────────────────────────────────
// Composable principal
// Registra watchers sobre los refs del formulario y guarda/carga
// el draft de forma automática.
// ─────────────────────────────────────────────────────────────
export interface MovimientoDraftRefs {
  tipo: TipoMovimiento
  modo: Ref<'UNITARIO' | 'MASIVO'>
  fechaRegistro: Ref<string>
  sucursalId: Ref<string>
  sucursalOrigen: Ref<string>
  sucursalDestino: Ref<string>
  referenciaTipo: Ref<string>
  referenciaTexto: Ref<string>
  notas: Ref<string>
  items: Ref<DraftItem[]>
}

export function useMovimientoDraft(refs: MovimientoDraftRefs) {
  const { tipo } = refs

  /** Devuelve snapshot actual del formulario como draft. */
  function snapshot(): MovimientoDraft {
    return {
      tipo,
      modo: refs.modo.value,
      fechaRegistro: refs.fechaRegistro.value,
      sucursalId: refs.sucursalId.value,
      sucursalOrigen: refs.sucursalOrigen.value,
      sucursalDestino: refs.sucursalDestino.value,
      referenciaTipo: refs.referenciaTipo.value,
      referenciaTexto: refs.referenciaTexto.value,
      notas: refs.notas.value,
      items: refs.items.value.map((i) => ({ ...i })),
      savedAt: Date.now(),
    }
  }

  /** Persiste el draft inmediatamente. */
  function persist(): void {
    // Solo guardar si hay productos reales ingresados
    const hasRealItems = refs.items.value.some((i) => i.productoId)
    if (!hasRealItems) return
    saveDraft(snapshot())
  }

  /**
   * Aplica un draft guardado a los refs del formulario.
   * Devuelve true si se restauró algo.
   */
  function restoreDraft(): boolean {
    const draft = loadDraft(tipo)
    if (!draft) return false
    refs.modo.value = draft.modo
    refs.fechaRegistro.value = draft.fechaRegistro
    refs.sucursalId.value = draft.sucursalId
    refs.sucursalOrigen.value = draft.sucursalOrigen
    refs.sucursalDestino.value = draft.sucursalDestino
    refs.referenciaTipo.value = draft.referenciaTipo as MovimientoDraft['referenciaTipo']
    refs.referenciaTexto.value = draft.referenciaTexto
    refs.notas.value = draft.notas
    refs.items.value = draft.items.map((i) => ({
      ...i,
      localId: i.localId || `${Date.now()}-${Math.random()}`,
    }))
    return true
  }

  /** Descarta el draft guardado (llamar tras guardar con éxito). */
  function discardDraft(): void {
    clearDraft(tipo)
  }

  /** Activa la auto-persistencia reactiva. Llamar desde onMounted. */
  function enableAutosave(): void {
    // Persistir cada vez que los items cambien (deep)
    watch(refs.items, persist, { deep: true })
    // Persistir cambios en cabecera
    watch(
      [
        refs.modo,
        refs.fechaRegistro,
        refs.sucursalId,
        refs.sucursalOrigen,
        refs.sucursalDestino,
        refs.referenciaTipo,
        refs.referenciaTexto,
        refs.notas,
      ],
      persist,
    )
  }

  /** ¿Existe un draft guardado con al menos un producto? */
  function hasDraft(): boolean {
    const d = loadDraft(tipo)
    return !!d && d.items.some((i) => i.productoId)
  }

  return { restoreDraft, discardDraft, enableAutosave, hasDraft, persist }
}
