# SGI — Inventario GAP

Fullstack inventory management (Vue 3 + TypeScript + Quasar SPA frontend, Google Apps Script backend, Google Sheets DB).

## Quick start

```bash
cd frontend
npm install
cp .env.example .env.local   # fill VITE_GAS_API_URL
quasar dev                    # localhost:9000
```

## Commands (run from `frontend/`)

| Purpose | Command |
|---------|---------|
| Dev server | `quasar dev` |
| Type check | `npx tsc --noEmit` or `npm run type-check` |
| Lint | `npm run lint` |
| Format | `npm run format` |
| Test (once) | `npx vitest run` |
| Test (watch) | `npx vitest` |
| Build prod | `quasar build` (output: `dist/spa/`) |

Pre-commit order: `npx tsc --noEmit && npm run lint && npx vitest run`

## Backend (Google Apps Script)

```bash
cd backend
clasp push   # deploy to GAS
clasp open   # open GAS editor in browser
```

- Backend is a single GAS Web App with `doPost` router dispatching to 20 services (`backend/src/services/*.js`).
- Public actions (no token): `getProductoBySku`, `getCategorias`, `login`.
- All API calls use `{ action, payload, token }` POST body.
- Script Properties required: `SPREADSHEET_ID`, `JWT_SECRET`, `DRIVE_FOLDER_IMAGENES`, `DRIVE_FOLDER_FACTURAS`, `ENV`.

## Architecture

- Frontend calls GAS via Axios (`src/services/api.ts`) with `Content-Type: text/plain` (CORS workaround — GAS ignores preflight for text/plain).
- Dev proxy: `/api/gas` → `https://script.google.com` (config in `quasar.config.ts`).
- DB: 13 Google Sheets tabs (`Productos`, `Sucursales`, `Inventario`, `Movimientos`, etc.) — see `docs/GUIA_INSTALACION_DEV.md` for exact headers.
- Auth: custom JWT (HMAC-SHA256) with 5 roles: `ADMINISTRADOR`, `SUPERVISOR`, `BODEGUERO`, `VENDEDOR`, `CONTADOR`.
- Images stored in Google Drive, served as `https://drive.google.com/uc?export=view&id={FILE_ID}`.

## Env vars (frontend)

| Var | Purpose |
|-----|---------|
| `VITE_GAS_API_URL` | GAS Web App URL |
| `VITE_QR_BASE_URL` | Domain for QR links |
| `VITE_QR_MODE` | `texto` (product data in QR) or `enlace` (URL to `/producto/:sku`) |

## Conventions

- Code: English. UI/docs: Spanish.
- TypeScript strict mode, 2-space indent, single quotes (TS), double quotes (HTML), no semicolons.
- Components: PascalCase, pages: kebab-case, composables/stores/services: camelCase, types: `kebab-case.types.ts`.
- Git branches: `main` → `dev` → `feature/*` / `fix/*`. Conventional commits (`feat:`, `fix:`, etc.).
- Every backend action validates session + permission via `AccessService.assertInSucursal(session, permission, sucursalId)`.

## Testing

- Vitest + jsdom, tests in `frontend/tests/unit/`. Setup file: `tests/setup.ts`.
- No npm test:unit script — use `npx vitest run` directly.

## Deployment

1. `cd frontend && npx tsc --noEmit && quasar build` → upload `dist/spa/` to cPanel/Netlify/Vercel.
2. `cd backend && clasp push` → create new GAS deployment → copy new URL → update `VITE_GAS_API_URL` → rebuild frontend.
3. SPA routing requires `.htaccess` (Apache) or `try_files` (Nginx) rule on the server.
