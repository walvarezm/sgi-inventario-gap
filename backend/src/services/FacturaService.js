// =============================================================
// FacturaService.gs — Wrapper legacy sobre DocumentoVentaService
// =============================================================

const FacturaService = {
  getAll(payload, session) {
    return DocumentoVentaService.getAll(payload, session)
  },

  getById(payload, session) {
    return DocumentoVentaService.getById(payload, session)
  },

  create(payload, session) {
    return DocumentoVentaService.create({
      ...payload,
      tipo: payload && payload.tipo ? payload.tipo : 'FACTURA',
    }, session)
  },

  anular(payload, session) {
    return DocumentoVentaService.anular(payload, session)
  },

  generarHtml(payload, session) {
    return DocumentoVentaService.generarHtml(payload, session)
  },
}
