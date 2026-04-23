// =============================================================
// 03_hojas_fase5.md — Hojas adicionales para Fase 5
// Agregar estas hojas al Spreadsheet de producción
// =============================================================

/*
  Nuevas hojas requeridas en Fase 5:

  ── OrdenesCompra ────────────────────────────────────────────
  Encabezados Fila 1:
  id | numero | proveedor_id | sucursal_id | fecha_emision |
  fecha_estimada | estado | subtotal | total | notas | usuario_id

  Estado posibles: PENDIENTE | PARCIAL | COMPLETADA | CANCELADA

  ── DetalleOrdenCompra ───────────────────────────────────────
  Encabezados Fila 1:
  id | orden_id | producto_id | cantidad_pedida |
  cantidad_recibida | precio_unitario | subtotal

  ── Proveedores (ya existe) ────────────────────────────────────
  Agregar columnas faltantes si la hoja ya existía:
  id | nombre | ruc_nit | contacto | telefono | email |
  direccion | ciudad | notas | activo | fecha_creacion
*/
