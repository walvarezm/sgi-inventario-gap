// =============================================================
// productoService.ts — CRUD de Productos contra GAS
// =============================================================
import { api } from './api'
import type { ApiResponse, Producto, ProductoForm, ImagenUploadPayload } from 'src/types'

export const productoService = {
  async getAll(): Promise<Producto[]> {
    const { data } = await api.post<ApiResponse<Producto[]>>('', {
      action: 'getProductos',
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async getById(id: string): Promise<Producto> {
    const { data } = await api.post<ApiResponse<Producto>>('', {
      action: 'getProductoById',
      payload: { id },
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async getBySku(sku: string): Promise<Producto> {
    const { data } = await api.post<ApiResponse<Producto>>('', {
      action: 'getProductoBySku',
      payload: { sku },
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async create(producto: ProductoForm): Promise<Producto> {
    const { data } = await api.post<ApiResponse<Producto>>('', {
      action: 'createProducto',
      payload: producto,
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async update(id: string, changes: Partial<ProductoForm>): Promise<Producto> {
    const { data } = await api.post<ApiResponse<Producto>>('', {
      action: 'updateProducto',
      payload: { id, ...changes },
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async remove(id: string): Promise<boolean> {
    const { data } = await api.post<ApiResponse<boolean>>('', {
      action: 'deleteProducto',
      payload: { id },
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async subirImagen(payload: ImagenUploadPayload): Promise<string> {
    const { data } = await api.post<ApiResponse<string>>('', {
      action: 'subirImagenProducto',
      payload,
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },
}
