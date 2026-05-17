// =============================================================
// documentoVentaService.ts — Documentos de venta contra GAS
// =============================================================
import { api } from './api'
import type { ApiResponse, DocumentoVenta, DocumentoVentaForm } from 'src/types'

export const documentoVentaService = {
  async getAll(filtros?: {
    sucursalId?: string
    estado?: string
    tipo?: string
    desde?: string
    hasta?: string
  }): Promise<DocumentoVenta[]> {
    const { data } = await api.post<ApiResponse<DocumentoVenta[]>>('', {
      action: 'getDocumentosVenta',
      payload: filtros ?? {},
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async getById(id: string): Promise<DocumentoVenta> {
    const { data } = await api.post<ApiResponse<DocumentoVenta>>('', {
      action: 'getDocumentoVentaById',
      payload: { id },
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async create(form: DocumentoVentaForm): Promise<DocumentoVenta> {
    const { data } = await api.post<ApiResponse<DocumentoVenta>>('', {
      action: 'createDocumentoVenta',
      payload: form,
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async anular(id: string): Promise<boolean> {
    const { data } = await api.post<ApiResponse<boolean>>('', {
      action: 'anularDocumentoVenta',
      payload: { id },
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async convertir(payload: {
    documentoOrigenId: string
    tipoDestino: 'FACTURA' | 'VENTA_SIN_FACTURA'
    pagos?: DocumentoVentaForm['pagos']
  }): Promise<DocumentoVenta> {
    const { data } = await api.post<ApiResponse<DocumentoVenta>>('', {
      action: 'convertirDocumentoVenta',
      payload,
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async generarHtml(id: string): Promise<string> {
    const { data } = await api.post<ApiResponse<string>>('', {
      action: 'generarHtmlDocumentoVenta',
      payload: { id },
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },
}
