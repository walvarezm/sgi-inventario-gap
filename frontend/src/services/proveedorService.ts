// =============================================================
// proveedorService.ts — CRUD de Proveedores y Órdenes de Compra
// =============================================================
import { api } from './api'
import type {
  ApiResponse,
  Proveedor,
  ProveedorForm,
  OrdenCompra,
  OrdenCompraForm,
  RecepcionPayload,
} from 'src/types'

export const proveedorService = {
  // ── Proveedores ──────────────────────────────────────────────
  async getAll(soloActivos = true): Promise<Proveedor[]> {
    const { data } = await api.post<ApiResponse<Proveedor[]>>('', {
      action: 'getProveedores',
      payload: { todos: !soloActivos },
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async getById(id: string): Promise<Proveedor> {
    const { data } = await api.post<ApiResponse<Proveedor>>('', {
      action: 'getProveedorById',
      payload: { id },
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async create(form: ProveedorForm): Promise<Proveedor> {
    const { data } = await api.post<ApiResponse<Proveedor>>('', {
      action: 'createProveedor',
      payload: form,
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async update(id: string, changes: Partial<ProveedorForm>): Promise<Proveedor> {
    const { data } = await api.post<ApiResponse<Proveedor>>('', {
      action: 'updateProveedor',
      payload: { id, ...changes },
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async remove(id: string): Promise<boolean> {
    const { data } = await api.post<ApiResponse<boolean>>('', {
      action: 'deleteProveedor',
      payload: { id },
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  // ── Órdenes de Compra ────────────────────────────────────────
  async getOrdenes(filtros?: {
    sucursalId?: string
    estado?: string
    proveedorId?: string
  }): Promise<OrdenCompra[]> {
    const { data } = await api.post<ApiResponse<OrdenCompra[]>>('', {
      action: 'getOrdenesCompra',
      payload: filtros ?? {},
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async getOrdenById(id: string): Promise<OrdenCompra> {
    const { data } = await api.post<ApiResponse<OrdenCompra>>('', {
      action: 'getOrdenCompraById',
      payload: { id },
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async createOrden(form: OrdenCompraForm): Promise<OrdenCompra> {
    const { data } = await api.post<ApiResponse<OrdenCompra>>('', {
      action: 'createOrdenCompra',
      payload: form,
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async recibirMercancia(payload: RecepcionPayload): Promise<OrdenCompra> {
    const { data } = await api.post<ApiResponse<OrdenCompra>>('', {
      action: 'recibirMercancia',
      payload,
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async cancelarOrden(id: string): Promise<boolean> {
    const { data } = await api.post<ApiResponse<boolean>>('', {
      action: 'cancelarOrdenCompra',
      payload: { id },
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },
}
