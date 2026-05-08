# Firebase Hosting para SGI Frontend

Esta guía publica únicamente el frontend SPA ubicado en `frontend/`.

## Cuándo usar Firebase Hosting

Usa **Firebase Hosting** para este proyecto cuando quieras:

- Publicar una SPA estática de `Vue 3 + Quasar`.
- Servir `frontend/dist/spa` por CDN global con HTTPS.
- Mantener el backend separado en Google Apps Script.

No necesitas **Firebase App Hosting** para esta aplicación, porque el frontend no requiere servidor Node en producción.

## Archivos preparados

- `firebase.json`
  - `public`: `frontend/dist/spa`
  - `rewrites`: todas las rutas hacia `index.html`
  - `headers`: cache largo para assets y no-cache para `index.html`

## Requisitos

1. Tener un proyecto de Firebase creado.
2. Instalar Firebase CLI:

```bash
npm install -g firebase-tools
```

3. Iniciar sesión:

```bash
firebase login
```

## Inicialización recomendada

Desde la raíz del repositorio:

```bash
firebase use --add
```

Eso generará el archivo `.firebaserc` local con tu `projectId`.

## Variables de entorno del frontend

El frontend usa variables `VITE_*` en tiempo de build, especialmente:

- `VITE_GAS_API_URL`
- `VITE_APP_VERSION` si decides usarla

Antes de compilar para producción, asegúrate de tener `frontend/.env.local` o un archivo equivalente con la URL real de tu Web App de Apps Script.

Ejemplo:

```env
VITE_GAS_API_URL=https://script.google.com/macros/s/TU_DEPLOYMENT_ID/exec
VITE_APP_VERSION=1.1.0
```

## Build de producción

```bash
cd frontend
npm install
quasar build
```

El resultado debe quedar en:

```text
frontend/dist/spa
```

## Deploy

Desde la raíz del repositorio:

```bash
firebase deploy --only hosting
```

## Preview channels

Para revisar antes de publicar:

```bash
firebase hosting:channel:deploy preview
```

## Dominio personalizado

Después del deploy, puedes conectar tu dominio desde la consola de Firebase:

- Hosting
- Add custom domain

## Notas de configuración

- El proyecto usa `vueRouterMode: 'history'`, por eso `firebase.json` reescribe `**` a `/index.html`.
- `index.html` no debe cachearse agresivamente para que tome nuevas versiones.
- Los assets compilados sí se cachean con `immutable`.

## Flujo recomendado

1. Configurar `VITE_GAS_API_URL` con la URL de producción de Apps Script.
2. Ejecutar `quasar build`.
3. Ejecutar `firebase deploy --only hosting`.
4. Probar login, catálogo, productos y seguridad en producción.
