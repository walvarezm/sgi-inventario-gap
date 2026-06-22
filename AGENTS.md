# SGI — Inventario GAP

Fullstack inventory system (multi-sucursal, POS, facturación, reportes).

- `frontend/` — Vue 3 + TypeScript + Quasar SPA (Vite, Pinia, strict TS)
- `backend/`  — Google Apps Script Web App (JS V8, deployed via `clasp`)
- `base-datos/` — Google Sheets schema docs + seed reference
- `public/`   — Firebase Hosting output (gitignored, populated from `frontend/dist/spa/`)
- `docs/`     — full project docs (start at `docs/README.md`)

## Quick start

```bash
cd frontend
npm install
cp .env.example .env.local          # set VITE_GAS_API_URL
quasar dev                           # http://localhost:9000
```

Default seeded admin (created by `seedDatosIniciales` in GAS): `admin@distmaxel.com` / `Admin2026!` — change on first login.

## Commands (run from `frontend/`)

| Purpose | Command |
|---------|---------|
| Dev server | `quasar dev` |
| Type check | `npm run type-check` (runs `vue-tsc --noEmit`) |
| Lint | `npm run lint` |
| Format | `npm run format` |
| Test (once) | `npx vitest run` |
| Test (watch) | `npx vitest` |
| Build prod | `quasar build` → `frontend/dist/spa/` |

Pre-commit: `npm run type-check && npm run lint && npx vitest run`

## Backend (Google Apps Script)

```bash
cd backend
clasp login     # one-time
clasp push      # upload src/ to GAS project
clasp open      # open GAS editor
```

- Router: `backend/src/main.js` `doPost` dispatches to 20 services in `backend/src/services/*.js` (services are `.js`, not `.ts`).
- API contract: all calls POST `{ action, payload, token }` to the Web App URL. Response shape: `{ success, message, result }`.
- **No-token actions:** `login` (its own branch), `getProductoBySku` (sanitized — excludes `precioCompra` and `stock`), `getCategorias`. Everything else requires a valid JWT in `token`.
- **Auth:** custom HMAC-SHA256 JWT, 8-hour TTL, in `backend/src/auth.js`. Verification raises 401 on error.
- **Access control:** services call `AccessService.assertInSucursal(session, permission, sucursalId)` for every mutating/read action. Role → permission map is in `backend/src/services/AccessService.js`.
- **Script Properties** (GAS editor → Project Settings): `SPREADSHEET_ID` (req), `JWT_SECRET` (req, ≥32 chars in prod), `ENV` (`development`|`production`), `DRIVE_FOLDER_IMAGENES`, `DRIVE_FOLDER_FACTURAS`, `DRIVE_FOLDER_BACKUPS`, `ADMIN_EMAIL`.
- **First-time deploy:** run `seedDatosIniciales()` once in the GAS editor (seeds `Config`, first `Sucursal`, admin user, `Categorias`, `Marcas`, security roles/permissions, and ensures schema of `MovimientoCabecera`/`Movimientos`/`Inventario`/`Facturas`/`DetalleFactura`/`PagosDocumento`).
- **Daily backup:** run `instalarTriggerBackup()` once. It schedules `hacerBackupDiario` (2 AM) which copies the Spreadsheet to `DRIVE_FOLDER_BACKUPS` (falls back to Drive root if unset).
- **Every `clasp push` requires a new Web App deployment** → new URL → update `VITE_GAS_API_URL` → rebuild frontend.

## Architecture & gotchas

- **CORS workaround:** `frontend/src/services/api.ts` sends `Content-Type: text/plain` even for JSON bodies — GAS does not respond to CORS preflight for `application/json`. Do not change it. Body is still JSON-stringified.
- **API timeout is 30 min** (`api.ts`) — GAS can be slow on large reports.
- **Dev proxy:** `quasar.config.ts` proxies `/api/gas/*` → `https://script.google.com/macros/s/*`. Production calls GAS directly.
- **Vue Router history mode** → any path reload needs a server-side rewrite to `/index.html` (`.htaccess` for Apache, `try_files` for Nginx, `_redirects` for Netlify, Firebase/Vercel rewrite). Without it, deep links 404.
- **Theme system** (`src/css/app.scss` + `src/stores/themeStore.ts`): two themes — `light` and `dark`. Initial value resolves to `prefers-color-scheme` if the user has no override. Switch via the sun/moon toggle in the header. All colors are exposed as `--sgi-*` CSS variables; do not hardcode hex in components. Motion tokens (`--sgi-ease-out`, `--sgi-dur-normal`, etc.) are also defined there.
- **Global branch selector** (`src/stores/sucursalActiva.ts`): admins/supervisors and users with `sucursales.ver` permission get a `SucursalSwitcher` in the header (`MainLayout.vue`) that is **always visible** and lets them switch the active branch from any page. State persists in LocalStorage. Non-admin users see a static chip with their own branch. All pages should read the active branch from `useSucursalActivaStore()` rather than holding local copies.
- **Standard table components** (`src/components/shared/`):
  - `StandardTableToolbar.vue` — header with title, subtitle, eyebrow icon, primary action button, and slots for filters/actions
  - `StandardFilters.vue` — search input + result counter + slot for extra filter controls + "Limpiar" button
  - `StandardTable.vue` — `q-table` wrapper with **standard pagination (10 default, options 10/20/50/100)**, sticky header, designed empty state, footer pagination
  - All new table pages should compose these. Use `var(--sgi-*)` design tokens; avoid hardcoded hex.
  - Status pills use the `.std-status` / `.std-status--active|warning|danger|info|primary|inactive` classes (defined in `src/css/_table-shared.scss`).
- **Standard table options** (from `src/components/shared/table-constants.ts`):
  - `STANDARD_ROWS_PER_PAGE = 10`
  - `STANDARD_ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100]`
  - Use these in all `q-table` pagination configs.
- **Public QR detail page:** `/producto/:sku` (`meta: { public: true }`) calls `getProductoBySku` without auth and receives a sanitized payload (no `precioCompra`, no `stock`).
- **QR mode:** `VITE_QR_MODE=texto` (QR encodes product data) or `enlace` (QR encodes `{VITE_QR_BASE_URL}/producto/{sku}`). Logic in `src/composables/useQR.ts`.
- **Auth/session state:** `src/stores/authStore.ts`, persisted in Quasar `LocalStorage` under key `sgi_session`. 401 from API → auto-logout + redirect to `/login`.
- **Routing guards:** `src/router/guards.ts` exports `authGuard`, `guestGuard`, `permissionGuard(perm)`, `anyPermissionGuard([...])`. Use `meta: { public: true }` for routes that bypass auth.

## Env vars (frontend, in `frontend/.env.local`)

| Var | Purpose |
|-----|---------|
| `VITE_GAS_API_URL` | GAS Web App URL (mandatory) |
| `VITE_APP_NAME`, `VITE_APP_NAME_SUBTITLE`, `VITE_APP_VERSION`, `VITE_APP_AUTHOR` | UI branding only |
| `VITE_QR_BASE_URL` | Public domain used in QR `enlace` mode |
| `VITE_QR_MODE` | `texto` (default) or `enlace` |

All `VITE_*` are inlined at build time — no runtime override. Update env → rebuild to take effect.

## Conventions

- Code: English. UI strings and user-facing docs: Spanish.
- TS strict, 2-space indent, single quotes, no semicolons, max line 100.
- Files: Components `PascalCase.vue`; pages `kebab-case.vue`; composables/stores/services `camelCase.ts`; type files `kebab-case.types.ts`.
- New Vue components use `<script setup lang="ts">` (enforced by `vue/component-api-style`).
- API responses are typed `ApiResponse<T>` (`src/types/api.types.ts`); throw `new Error(data.message)` when `!data.success`.
- Avoid `any` (warn). Use `import type` for type-only imports.
- Git: `main` (protected) ← `dev` ← `feature/*` / `fix/*`. Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, etc.). No direct commits to `main`/`dev`.
- Never commit: `.env.local`, `.env.production`, `backend/.clasprc.json`, `public/*`, `backend/src/.clasp.json`.

## Testing

- Vitest + jsdom. Tests in `frontend/tests/unit/{composables,stores,utils,pages}/`. Setup mocks `quasar` and `vue-router` (`frontend/tests/setup.ts`).
- No `npm test` / `npm run test:unit` script — use `npx vitest run` directly.
- `npm run test:e2e` exists (`cypress open`) but cypress is not installed in this repo — script is dead.
- Coverage: `npx vitest run --coverage` → `frontend/coverage/`.
- There is a stray empty folder `frontend/tests/unit/{composables,utils,stores}` (literal braces) — safe to delete.

## Deploy

**Frontend → Firebase Hosting** (active project: `sgi-maxel-1`, see `.firebaserc`):

```bash
cd frontend && quasar build                              # → frontend/dist/spa/
# firebase.json "public" points to the ROOT public/ dir (gitignored),
# so mirror the build there before deploying:
xcopy /E /I /Y frontend\dist\spa\* public\               # Windows
# cp -R frontend/dist/spa/* public/                       # macOS/Linux
firebase deploy --only hosting
```

Note: `docs/04_GUIA_FIREBASE_HOSTING.md` says `firebase.json` `public` is `frontend/dist/spa` — that's outdated. Actual value in `firebase.json` is `public` (root), which is why the mirror step is required.

**Backend → GAS:** `clasp push` → editor → Deploy → New version → copy URL → update `VITE_GAS_API_URL` → rebuild & redeploy frontend.

Hosting alternatives (cPanel, Netlify, Vercel) are documented in `docs/03_GUIA_PRODUCCION.md`; each requires the SPA rewrite rule above.
