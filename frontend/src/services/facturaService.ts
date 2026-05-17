// =============================================================
// facturaService.ts — Wrapper legacy sobre documentoVentaService
// =============================================================
import type { DocumentoVenta, DocumentoVentaForm } from 'src/types'
import { documentoVentaService } from './documentoVentaService'

export const facturaService = {
  getAll: documentoVentaService.getAll,
  getById: documentoVentaService.getById,
  create(form: DocumentoVentaForm): Promise<DocumentoVenta> {
    return documentoVentaService.create({
      ...form,
      tipo: form.tipo || 'FACTURA',
    })
  },
  anular: documentoVentaService.anular,
  generarHtml: documentoVentaService.generarHtml,
  convertir: documentoVentaService.convertir,
}
