# Implementación POS Multidocumento

## Resumen
Evolucionar el POS actual de “venta básica con factura” a un flujo único de `documentos de venta` que soporte `FACTURA`, `VENTA_SIN_FACTURA`, `PROFORMA` y `COTIZACION`, con edición de precio final por ítem, descuento por línea, y modalidades de pago.  
Se adopta como decisión funcional:

- `VENTA_SIN_FACTURA` vende y descuenta stock
- `PROFORMA` y `COTIZACION` no descuentan stock; solo cambia intención/formato
- edición de precio y descuento controlada por permisos finos

## Cambios de implementación

### 1. Modelo documental unificado
- Extender la cabecera actual (`Facturas`) para usarla como documento comercial general, sin crear una segunda cabecera paralela.
- Mantener `DetalleFactura`, agregando campos de precio lista y descuento por línea.
- Crear nueva hoja `PagosDocumento` para registrar uno o varios pagos por documento.
- Ampliar tipos documentales a:
  - `FACTURA`
  - `VENTA_SIN_FACTURA`
  - `PROFORMA`
  - `COTIZACION`
  - `NOTA_CREDITO`
- Ampliar estados a:
  - `BORRADOR`
  - `EMITIDA`
  - `ANULADA`
  - `VENCIDA`
  - `CONVERTIDA`

### 2. Reglas de negocio por tipo
- `FACTURA`: requiere pago, descuenta stock, genera movimientos, calcula impuesto.
- `VENTA_SIN_FACTURA`: requiere pago, descuenta stock, genera movimientos, no es fiscal.
- `PROFORMA`: no requiere pago, no descuenta stock, no genera movimientos.
- `COTIZACION`: no requiere pago, no descuenta stock, no genera movimientos.
- `PROFORMA` y `COTIZACION` comparten lógica operativa; se diferencian por tipo, impresión y uso comercial.
- Las conversiones permitidas serán:
  - `PROFORMA -> FACTURA`
  - `PROFORMA -> VENTA_SIN_FACTURA`
  - `COTIZACION -> FACTURA`
  - `COTIZACION -> VENTA_SIN_FACTURA`
- La conversión crea un nuevo documento y marca el origen como `CONVERTIDA`.

### 3. Tipos frontend y payloads
- Crear un tipo nuevo de dominio, por ejemplo `DocumentoVenta`, separado del nombre histórico `Factura`, para evitar seguir mezclando conceptos.
- Extender `ItemCarrito` con:
  - `precioLista`
  - `precioUnitario`
  - `descuentoTipo`
  - `descuentoValor`
  - `descuentoMonto`
  - `subtotal`
  - `notas`
- El payload de creación debe incluir:
  - `tipo`
  - `cliente`
  - `items`
  - descuentos globales opcionales
  - `pagos`
  - `vigenciaHasta`
  - `documentoOrigenId`
- Los `items` deben guardar explícitamente el precio final usado al vender, no recalcularse desde catálogo en backend.

### 4. Backend
- Implementar un servicio único tipo `DocumentoVentaService` y dejar `FacturaService` como wrapper temporal o migrarlo internamente.
- Métodos mínimos:
  - `getAll`
  - `getById`
  - `create`
  - `anular`
  - `convertir`
  - `generarHtml`
- `create` debe:
  - validar permisos por tipo
  - validar stock solo si `afectaStock = true`
  - calcular subtotales, descuentos, impuesto y total
  - insertar cabecera, detalle y pagos
  - ajustar inventario y movimientos solo para ventas reales
- `anular` debe revertir stock solo si el documento afectó stock.
- `generarHtml` debe soportar plantilla por tipo:
  - factura
  - venta sin factura / recibo
  - proforma
  - cotización

### 5. POS frontend
- Reemplazar el checkout actual por un panel de operación con:
  - selector de tipo de documento
  - datos de cliente
  - forma de pago
  - notas / observaciones
  - vigencia para proforma/cotización
- Actualizar `CarritoItem` para editar:
  - cantidad
  - precio final
  - descuento
  - subtotal
- Mostrar resumen con:
  - subtotal
  - descuento total
  - impuesto
  - total
- El botón principal debe cambiar según el tipo:
  - `Emitir factura`
  - `Registrar venta`
  - `Generar proforma`
  - `Generar cotización`

### 6. Pagos y permisos
- Métodos de pago iniciales:
  - `EFECTIVO`
  - `QR`
  - `TRANSFERENCIA`
  - `TARJETA`
  - `CREDITO`
  - `MIXTO`
- Para v1, `MIXTO` se implementa como múltiples filas en `PagosDocumento` cuya suma debe igualar el total.
- Permisos nuevos:
  - `pos.vender_factura`
  - `pos.vender_sin_factura`
  - `pos.crear_proforma`
  - `pos.crear_cotizacion`
  - `pos.editar_precio`
  - `pos.aplicar_descuento`
  - `pos.usar_pago_mixto`
  - `pos.convertir_documentos`
  - `documentos.ver`
  - `documentos.anular`

## Plan de ejecución

### Fase 1
- Extender tipos TS y hojas Sheets.
- Crear `DocumentoVentaService`.
- Mantener compatibilidad con el listado actual de facturación.

### Fase 2
- Enriquecer `ItemCarrito`, `facturaStore` y `usePOS`.
- Incorporar precio editable y descuento por línea.
- Validar permisos de edición de precio/descuento en frontend y backend.

### Fase 3
- Rehacer el checkout del POS para soportar tipo de documento y pagos.
- Implementar `FACTURA` y `VENTA_SIN_FACTURA` primero.

### Fase 4
- Implementar `PROFORMA` y `COTIZACION`.
- Agregar impresión específica por tipo.

### Fase 5
- Implementar conversión desde proforma/cotización hacia venta real.
- Ajustar historial, filtros y vistas de consulta.

## Pruebas y criterios de aceptación
- Crear `FACTURA` con dos ítems, pago único y descuento por línea; debe descontar stock y generar movimientos.
- Crear `VENTA_SIN_FACTURA`; debe descontar stock y no marcarse como fiscal.
- Crear `PROFORMA`; no debe modificar inventario.
- Crear `COTIZACION`; no debe modificar inventario.
- Convertir `PROFORMA` a `FACTURA`; debe crear nuevo documento, descontar stock y marcar origen como `CONVERTIDA`.
- Anular `FACTURA` o `VENTA_SIN_FACTURA`; debe revertir stock.
- Usuario sin `pos.editar_precio` no puede cambiar precio final.
- Usuario sin `pos.aplicar_descuento` no puede aplicar descuento.
- Pago `MIXTO` inválido si la suma no coincide con el total.
- El HTML impreso debe reflejar correctamente el tipo de documento.

## Supuestos y defaults
- Se reutiliza la hoja `Facturas` como cabecera general para minimizar ruptura.
- Se reutiliza `DetalleFactura` y se amplía, en vez de crear `DetalleDocumentoVenta`.
- `VENTA_SIN_FACTURA` usará numeración propia por tipo, separada de `FACTURA`.
- `PROFORMA` y `COTIZACION` tendrán numeración propia por tipo.
- `PROFORMA` y `COTIZACION` no reservan stock en v1.
- El impuesto se mantiene para `FACTURA`; para `VENTA_SIN_FACTURA` se guarda `esFiscal = false` y el cálculo se mantiene configurable sin bloquear la implementación.
