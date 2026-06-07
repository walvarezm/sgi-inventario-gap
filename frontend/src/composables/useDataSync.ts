// =============================================================
// useDataSync.ts — Bus de eventos reactivo para sincronización
// cross-store cuando hay mutaciones (create / update / delete).
//
// PROBLEMA QUE RESUELVE:
//   Cuando el módulo de Productos actualiza un producto, los
//   módulos de Inventario, Catálogo y POS siguen mostrando la
//   versión anterior porque cada uno tiene su propia copia en
//   memoria. Este composable permite que el store mutante
//   notifique a todos los demás sin acoplamiento directo.
//
// PATRÓN:
//   - El store que muta emite: dataSyncBus.emit('producto:updated', item)
//   - Los stores suscritos reaccionan y actualizan su copia local
//     SIN hacer un nuevo request al backend.
//
// USO EN UN STORE (mutante):
//   const sync = useDataSync()
//   // después de update local:
//   sync.emit('producto:updated', productoActualizado)
//
// USO EN UN STORE (receptor):
//   const sync = useDataSync()
//   sync.on('producto:updated', (p: Producto) => {
//     cache.patchItem(p.id, 'id', p)
//   })
// =============================================================
import { ref } from 'vue'

// ── Tipos de eventos disponibles ────────────────────────────────
export type DataSyncEvent =
  | 'producto:created'
  | 'producto:updated'
  | 'producto:deleted'
  | 'marca:created'
  | 'marca:updated'
  | 'marca:deleted'
  | 'categoria:created'
  | 'categoria:updated'
  | 'categoria:deleted'
  | 'sucursal:created'
  | 'sucursal:updated'
  | 'sucursal:deleted'
  | 'inventario:stock_changed'
  | 'catalogo:invalidate'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (payload: any) => void

// ── Singleton reactivo ─────────────────────────────────────────
// Se usa un Map global para que todos los stores compartan
// el mismo bus independientemente del orden de instanciación.
const _handlers = new Map<DataSyncEvent, Set<Handler>>()
const _lastEvent = ref<{ event: DataSyncEvent; payload: unknown } | null>(null)

export function useDataSync() {
  /**
   * Suscribe un handler a un evento.
   * Retorna una función de limpieza (unsub) que debe llamarse
   * en onUnmounted si se usa desde un componente.
   */
  function on(event: DataSyncEvent, handler: Handler): () => void {
    if (!_handlers.has(event)) {
      _handlers.set(event, new Set())
    }
    _handlers.get(event)!.add(handler)

    // Retorna función de cleanup
    return () => off(event, handler)
  }

  /**
   * Des-suscribe un handler de un evento.
   */
  function off(event: DataSyncEvent, handler: Handler): void {
    _handlers.get(event)?.delete(handler)
  }

  /**
   * Emite un evento a todos los handlers suscritos.
   */
  function emit<T>(event: DataSyncEvent, payload: T): void {
    _lastEvent.value = { event, payload }
    if (import.meta.env.DEV) {
      console.debug(`[DataSync] ${event}`, payload)
    }
    _handlers.get(event)?.forEach((handler) => {
      try {
        handler(payload)
      } catch (e) {
        console.error(`[DataSync] Error en handler de "${event}":`, e)
      }
    })
  }

  /**
   * Último evento emitido (útil para debugging).
   */
  const lastEvent = _lastEvent

  return { on, off, emit, lastEvent }
}
