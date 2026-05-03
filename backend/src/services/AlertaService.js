// =============================================================
// AlertaService.gs — Alertas automáticas de stock mínimo
// =============================================================

const AlertaService = {

  /**
   * Verifica si el stock de un producto está por debajo del mínimo
   * y envía una notificación por email si corresponde.
   */
  verificarStockMinimo(productoId, sucursalId, stockActual) {
    try {
      const producto = Sheets.getBy('Productos', 'id', productoId)
      if (!producto) return

      const stockMinimo = Number(producto.stock_minimo) || 0
      if (stockActual > stockMinimo) return

      const sucursal = Sheets.getBy('Sucursales', 'id', sucursalId)
      const nombreSucursal = sucursal ? sucursal.nombre : sucursalId
      const emailAlerta = CONFIG.ADMIN_EMAIL

      if (!emailAlerta) return

      const asunto = `⚠️ SGI: Stock bajo — ${producto.nombre} [${producto.sku}]`
      const cuerpo = [
        `Alerta de stock mínimo en SGI Inventarios`,
        ``,
        `Producto: ${producto.nombre} (${producto.sku})`,
        `Sucursal: ${nombreSucursal}`,
        `Stock actual: ${stockActual}`,
        `Stock mínimo: ${stockMinimo}`,
        ``,
        `Por favor, gestione la reposición de este producto.`,
        ``,
        `SGI - Sistema de Gestión de Inventarios`,
      ].join('\n')

      MailApp.sendEmail(emailAlerta, asunto, cuerpo)
      Logger.log(`Alerta enviada: ${producto.sku} en ${nombreSucursal} — stock=${stockActual}`)
    } catch (e) {
      Logger.log('AlertaService error: ' + e.message)
    }
  },

  /**
   * Trigger programado: ejecutar cada día para revisar todo el inventario.
   * Instalar con: instalarTriggerAlertas()
   */
  revisarTodoElInventario() {
    try {
      const inventario = Sheets.getAll('Inventario')
      const productosMap = {}
      Sheets.getAll('Productos').forEach(p => { productosMap[p.id] = p })
      const sucursalesMap = {}
      Sheets.getAll('Sucursales').forEach(s => { sucursalesMap[s.id] = s })

      const alertas = []
      inventario.forEach(i => {
        const p = productosMap[i.producto_id]
        if (!p || !(p.activo === true || p.activo === 'TRUE')) return
        const stock = Number(i.stock_actual) || 0
        const minimo = Number(p.stock_minimo) || 0
        if (stock <= minimo) {
          alertas.push({
            sku: p.sku,
            nombre: p.nombre,
            sucursal: (sucursalesMap[i.sucursal_id] || {}).nombre || i.sucursal_id,
            stockActual: stock,
            stockMinimo: minimo,
          })
        }
      })

      if (alertas.length === 0) {
        Logger.log('Revisión diaria: sin alertas de stock.')
        return
      }

      const emailAlerta = CONFIG.ADMIN_EMAIL
      if (!emailAlerta) return

      const filas = alertas.map(a =>
        `• ${a.sku} — ${a.nombre} | Sucursal: ${a.sucursal} | Stock: ${a.stockActual} (mín: ${a.stockMinimo})`
      ).join('\n')

      MailApp.sendEmail(
        emailAlerta,
        `⚠️ SGI: ${alertas.length} producto(s) con stock bajo`,
        `Resumen diario de alertas de stock:\n\n${filas}\n\nSGI - Sistema de Gestión de Inventarios`
      )

      Logger.log(`Alertas diarias enviadas: ${alertas.length} productos`)
    } catch (e) {
      Logger.log('AlertaService.revisarTodoElInventario error: ' + e.message)
    }
  },
}

/**
 * Instalar el trigger de revisión diaria.
 * Ejecutar UNA SOLA VEZ desde el editor GAS.
 */
function instalarTriggerAlertas() {
  // Eliminar triggers existentes del mismo nombre
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'revisarInventarioDiario')
    .forEach(t => ScriptApp.deleteTrigger(t))

  ScriptApp.newTrigger('revisarInventarioDiario')
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create()

  Logger.log('Trigger de alertas instalado: diario a las 8am')
}

function revisarInventarioDiario() {
  AlertaService.revisarTodoElInventario()
}
