# 📊 Estructura de Google Sheets — SGI v1.1

> Guía para crear manualmente la base de datos en Google Sheets.
> Cada sección indica el **nombre exacto de la hoja** y sus **encabezados en la Fila 1**.

---

## Instrucciones generales

1. Crear un nuevo Spreadsheet en [sheets.google.com](https://sheets.google.com)
2. Nombrarlo: **SGI - Base de Datos Producción**
3. Crear cada hoja con el nombre exacto indicado (respetar mayúsculas)
4. Escribir los encabezados en la **Fila 1**, una columna por encabezado
5. Copiar el ID del Spreadsheet desde la URL para configurar `SPREADSHEET_ID`

---

## Hojas requeridas

### 0. `Categorias` *(Fase 2)*
| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | Identificador único |
| `nombre` | String | Nombre de la categoría |
| `descripcion` | String | Descripción opcional |
| `activo` | Boolean | TRUE / FALSE |
| `fecha_creacion` | ISO String | Fecha de registro |

**Encabezados Fila 1:**
```
id	nombre	descripcion	activo	fecha_creacion
```

**Datos iniciales sugeridos:**
```
[UUID]  Calzado     Zapatos y sandalias    TRUE  2026-01-01T00:00:00.000Z
[UUID]  Ropa        Prendas de vestir      TRUE  2026-01-01T00:00:00.000Z
[UUID]  Accesorios  Gorras, bolsos, etc.   TRUE  2026-01-01T00:00:00.000Z
[UUID]  Deportes    Equipamiento deportivo TRUE  2026-01-01T00:00:00.000Z
```

---

### 1. `Productos`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | Identificador único |
| `sku` | String | Código único del producto |
| `marca` | String | Marca / fabricante |
| `nombre` | String | Nombre del producto |
| `descripcion` | String | Descripción larga |
| `categoria_id` | UUID | Referencia a Categorías |
| `unidad` | String | Unidad de medida (Unidad, Caja, Kg…) |
| `precio_compra` | Number | Costo de adquisición |
| `precio_ofrecido` | Number | Precio de lista / referencia |
| `precio_final` | Number | Precio de venta al cliente |
| `stock_minimo` | Number | Umbral para alerta de stock bajo |
| `imagen_url` | String | URL pública en Google Drive |
| `qr_code` | String | Contenido del QR (SKU o URL) |
| `activo` | Boolean | TRUE / FALSE |
| `fecha_creacion` | ISO String | Fecha de registro |

**Encabezados Fila 1:**
```
id	sku	marca	nombre	descripcion	categoria_id	unidad	precio_compra	precio_ofrecido	precio_final	stock_minimo	imagen_url	qr_code	activo	fecha_creacion
```

---

### 2. `Sucursales`
**Encabezados Fila 1:**
```
id	nombre	direccion	ciudad	telefono	email	responsable_id	activo	fecha_creacion
```

---

### 3. `Inventario`
> **Regla:** Una fila por combinación `(producto_id, sucursal_id)`.

**Encabezados Fila 1:**
```
id	producto_id	sucursal_id	stock_actual	fecha_actualizacion
```

---

### 4. `Movimientos`
**Encabezados Fila 1:**
```
id	tipo	producto_id	sucursal_origen	sucursal_destino	cantidad	referencia	usuario_id	fecha	notas
```

---

### 5. `Proveedores`
**Encabezados Fila 1:**
```
id	nombre	ruc_nit	contacto	telefono	email	direccion	activo
```

---

### 6. `Facturas`
**Encabezados Fila 1:**
```
id	numero	tipo	cliente	sucursal_id	fecha	subtotal	impuesto	total	estado	usuario_id
```

---

### 7. `DetalleFactura`
**Encabezados Fila 1:**
```
id	factura_id	producto_id	cantidad	precio_unitario	subtotal
```

---

### 8. `Usuarios`
**Encabezados Fila 1:**
```
id	nombre	email	password_hash	rol	sucursal_id	activo	fecha_creacion
```

---

### 9. `Config`
**Encabezados Fila 1:**
```
clave	valor	descripcion
```

**Datos iniciales:**
| clave | valor | descripcion |
|-------|-------|-------------|
| `app_nombre` | SGI - Inventarios | Nombre del sistema |
| `app_version` | 1.1.0 | Versión actual |
| `iva_porcentaje` | 13 | Porcentaje de IVA |
| `moneda` | BOB | Moneda por defecto |

---

### 10. `LogAcciones`
**Encabezados Fila 1:**
```
id	usuario_id	accion	modulo	sucursal_id	detalle	fecha
```

---

## Datos iniciales requeridos

### Hoja `Usuarios` — Administrador inicial
```
[UUID]  Admin SGI  admin@tudominio.com  [HASH]  ADMINISTRADOR  ALL  TRUE  2026-01-01T00:00:00.000Z
```

> **Generar el password_hash** desde el editor GAS:
> ```javascript
> function generarHash() {
>   const pass = 'tu_contraseña_aqui'
>   const secret = 'tu_jwt_secret_aqui'
>   const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pass + secret)
>   console.log(bytes.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join(''))
> }
> ```

### Hoja `Sucursales` — Primera sucursal
```
[UUID]  Casa Matriz  Av. Principal 123  La Paz  591-2-XXXXXXX  info@tudominio.com  [UUID_ADMIN]  TRUE  2026-01-01T00:00:00.000Z
```

---

## Notas de performance

- Mantener cada hoja bajo **50,000 filas**
- Archivar movimientos de más de 1 año en hojas separadas
- El `ScriptCache` de GAS tiene límite de **100KB por entrada**; paginar si el catálogo es grande
