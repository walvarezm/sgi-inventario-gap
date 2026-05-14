# Migración de Productos desde otra Google Sheet

Se añadió soporte backend para migrar productos desde una Google Sheet externa cruzando:

- hoja `Productos`
- hoja `Registro de entradas`

Acciones disponibles:

- `previewMigracionProductosSpreadsheet`
- `importarProductosSpreadsheet`

## Objetivo

Construir automáticamente filas compatibles con la importación del sistema usando:

- `sku` desde `CODIGO`
- `marca` desde `MARCA`
- `nombre` desde `DESCRIPCION`
- `descripcion` desde `PRODUCTO`
- precios desde `Registro de entradas`

## Configuración por defecto

Si no envías parámetros, usa:

- `spreadsheetId`: `1BtOahzJCvnI_pw8_v8YRSxH7fJX5f6xAoXcgrQeYhBA`
- `productosSheetName`: `Productos`
- `entradasSheetName`: `Registro de entradas`
- `defaultUnidad`: `Unidad`
- `defaultStockMinimo`: `0`
- `priceSource`: `ultimo`
- `mode`: `upsert`

## Estrategias de precio

`priceSource: "ultimo"`
- `precioCompra` = `Precio COSTO Ultimo`
- `precioOfrecido` = `Precio VENTA Ultimo`
- `precioFinal` = `Precio VENTA Ultimo`

`priceSource: "entrada"`
- `precioCompra` = `Precio Costo`
- `precioOfrecido` = `Precio Venta`
- `precioFinal` = `Precio Venta`

## Preview

Permite revisar antes de importar.

Ejemplo payload:

```json
{
  "action": "previewMigracionProductosSpreadsheet",
  "token": "JWT",
  "payload": {
    "spreadsheetId": "1BtOahzJCvnI_pw8_v8YRSxH7fJX5f6xAoXcgrQeYhBA",
    "productosSheetName": "Productos",
    "entradasSheetName": "Registro de entradas",
    "priceSource": "ultimo",
    "defaultUnidad": "Unidad",
    "defaultStockMinimo": 0,
    "defaultCategoria": "",
    "onlyWithPrices": false,
    "limitPreview": 30
  }
}
```

Retorna:

- configuración usada
- resumen
- primeras filas transformadas
- advertencias

## Importación real

Ejemplo payload:

```json
{
  "action": "importarProductosSpreadsheet",
  "token": "JWT",
  "payload": {
    "spreadsheetId": "1BtOahzJCvnI_pw8_v8YRSxH7fJX5f6xAoXcgrQeYhBA",
    "productosSheetName": "Productos",
    "entradasSheetName": "Registro de entradas",
    "priceSource": "ultimo",
    "defaultUnidad": "Unidad",
    "defaultStockMinimo": 0,
    "defaultCategoria": "",
    "onlyWithPrices": false,
    "mode": "upsert",
    "dryRun": false
  }
}
```

## Opciones relevantes

`onlyWithPrices`
- `true`: solo migra productos con coincidencia de precio
- `false`: migra todo, dejando precios en `0` si no encuentra coincidencia

`mode`
- `upsert`: crea nuevos y actualiza existentes por SKU
- `create_only`: solo crea productos nuevos

`dryRun`
- `true`: no escribe nada; solo simula
- `false`: ejecuta la importación real

## Recomendación operativa

1. Ejecutar `previewMigracionProductosSpreadsheet`
2. Ejecutar `importarProductosSpreadsheet` con `dryRun: true`
3. Revisar resumen y advertencias
4. Ejecutar importación real con `dryRun: false`
