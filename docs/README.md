# 📦 SGI — Sistema de Gestión de Inventarios

> Sistema fullstack multi-sucursal para gestión de inventarios, POS y facturación.  
> Stack: **Vue 3 + TypeScript + Quasar** | **Google Apps Script** | **Google Sheets**

**v1.1** — Con soporte de sucursales, consulta de catálogo por sucursal, imágenes y QR en productos.

---

## Documentación del Proyecto

| Documento | Descripción |
|-----------|-------------|
| [📋 01 — Planificación del Proyecto](./01_PLANIFICACION_PROYECTO.md) | Objetivos, alcance, arquitectura, modelo de datos, roles, fases de desarrollo |
| [🛠️ 02 — Guidelines de Desarrollo](./02_GUIDELINES_DESARROLLO.md) | TypeScript, convenciones, tipos, patrones de código, Git workflow, seguridad |
| [🚀 03 — Guía de Producción](./03_GUIA_PRODUCCION.md) | Deploy GAS, Drive, build TypeScript, hosting, dominio, HTTPS, mantenimiento |

---

## Inicio Rápido

```bash
git clone https://github.com/tu-org/sgi-inventarios.git
cd sgi-inventarios/frontend
npm install
cp .env.example .env.local
# Editar VITE_GAS_API_URL y VITE_QR_BASE_URL

quasar dev          # Desarrollo
npx tsc --noEmit    # Verificar TypeScript
quasar build        # Build de producción
```

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Vue 3 + **TypeScript** + Quasar Framework |
| Estado | Pinia (tipado con interfaces) |
| Backend | Google Apps Script |
| Base de datos | Google Sheets |
| Almacenamiento | Google Drive (imágenes + PDFs) |
| Email | Gmail API |
| QR generación | qrcode |
| QR lectura (POS) | vue-qrcode-reader |
| Hosting | cPanel / Netlify / Vercel |

---

## Módulos del Sistema

- 🏷️ Productos con **marca**, **imagen** y **código QR**
- 🏭 Control de Inventario por sucursal (entradas, salidas, transferencias)
- 🏪 Gestión de **Sucursales** con stock independiente
- 🔍 **Consulta de Catálogo por Sucursal** (marca, código, descripción, precio ofrecido, precio final, stock)
- 🚚 Gestión de Proveedores
- 🔔 Alertas de Stock Mínimo
- 🛒 Punto de Venta (POS) con escáner QR
- 🧾 Facturación con PDF
- 📊 Reportes y Dashboard por sucursal
- 👥 Usuarios y Permisos con acceso restringido por sucursal

---

## Roles y Acceso al Catálogo

| Rol | Catálogo visible |
|-----|-----------------|
| Administrador | Todas las sucursales |
| Supervisor | Todas las sucursales |
| Bodeguero / Vendedor / Contador | Solo su sucursal asignada |

---

*SGI v1.1 — 2026*
