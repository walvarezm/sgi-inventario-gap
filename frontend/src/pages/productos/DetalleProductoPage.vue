
<template>
  <q-layout view="lHh lpr lFf" class="detalle-layout">
    <q-page-container>
      <q-page class="detalle-page">
        <!-- Header público minimalista -->
        <header class="detalle-header">
          <div class="detalle-header__brand">
            <q-icon name="inventory_2" size="20px" class="q-mr-xs" />
            <span>{{ appName }}</span>
            <span v-if="!isMobile" class="detalle-header__sub">{{ appNameSub }}</span>
          </div>
        </header>

        <!-- Loading -->
        <div
          v-if="estado === 'cargando'"
          class="detalle-estado"
        >
          <q-spinner color="primary" size="48px" />
          <p class="detalle-estado__text">
            Buscando producto <strong>{{ skuParam }}</strong>…
          </p>
        </div>

        <!-- Error -->
        <div
          v-else-if="estado === 'error'"
          class="detalle-estado"
        >
          <q-icon name="search_off" size="64px" color="grey-4" />
          <div class="detalle-estado__title">Producto no encontrado</div>
          <p class="detalle-estado__text">
            El código <code class="detalle-code">{{ skuParam }}</code> no corresponde a ningún producto activo.
          </p>
          <q-btn
            outline
            color="primary"
            icon="arrow_back"
            label="Volver"
            class="q-mt-lg"
            @click="$router.back()"
          />
        </div>

        <!-- Producto -->
        <div v-else-if="estado === 'ok' && producto" class="detalle-contenido">
          <article class="detalle-card">
            <!-- Imagen -->
            <div class="detalle-card__image">
              <div v-if="producto.imagenUrl" class="detalle-img-wrap">
                <ProductoImagenIFrame
                  :imagen-url="producto.imagenUrl"
                  :imagen-location="producto.imagenLocation"
                  type="card"
                  :width="100"
                  :height="100"
                />
              </div>
              <div v-else class="detalle-img-placeholder">
                <q-icon name="inventory_2" size="48px" color="grey-4" />
                <span class="text-caption text-grey-5">Sin imagen</span>
              </div>

              <!-- QR -->
              <div v-if="qrDataUrl" class="detalle-qr-wrap">
                <div class="detalle-qr-label">Código QR</div>
                <img
                  :src="qrDataUrl"
                  :alt="`QR ${producto.sku}`"
                  class="detalle-qr-img"
                />
                <div class="detalle-qr-sku">{{ producto.sku }}</div>
              </div>
            </div>

            <!-- Datos -->
            <div class="detalle-card__data">
              <!-- Badges -->
              <div class="detalle-badges">
                <q-chip
                  dense
                  :color="producto.activo ? 'positive' : 'grey'"
                  text-color="white"
                  icon="circle"
                  size="sm"
                >
                  {{ producto.activo ? 'Activo' : 'Inactivo' }}
                </q-chip>
                <q-chip
                  v-if="categoriaNombre"
                  dense
                  outline
                  color="primary"
                  icon="category"
                  size="sm"
                >
                  {{ categoriaNombre }}
                </q-chip>
              </div>

              <!-- Marca + SKU -->
              <div class="detalle-head-row">
                <span class="detalle-marca">{{ producto.marca }}</span>
                <code class="detalle-code">{{ producto.sku }}</code>
              </div>

              <!-- Nombre -->
              <h1 class="detalle-nombre">{{ producto.nombre }}</h1>

              <!-- Descripción -->
              <p
                v-if="producto.descripcion && producto.descripcion !== producto.nombre"
                class="detalle-descripcion"
              >
                {{ producto.descripcion }}
              </p>

              <q-separator class="q-my-lg" />

              <!-- Precios -->
              <section class="detalle-precios">
                <div class="detalle-precio-item">
                  <span class="detalle-precio-label">Precio compra</span>
                  <span class="detalle-precio-valor detalle-precio-valor--muted">
                    {{ formatCurrency(producto.precioCompra ?? 0) }}
                  </span>
                </div>
                <div class="detalle-precio-item">
                  <span class="detalle-precio-label">Precio lista</span>
                  <span class="detalle-precio-valor">
                    {{ formatCurrency(producto.precioOfrecido) }}
                  </span>
                </div>
                <div class="detalle-precio-item detalle-precio-item--featured">
                  <span class="detalle-precio-label">Precio venta</span>
                  <span class="detalle-precio-valor detalle-precio-valor--principal">
                    {{ formatCurrency(producto.precioFinal) }}
                  </span>
                </div>
              </section>

              <q-separator class="q-my-lg" />

              <!-- Props -->
              <div v-if="producto.unidad" class="detalle-props">
                <div class="detalle-prop">
                  <q-icon name="straighten" size="16px" class="text-grey-5" />
                  <span class="detalle-prop__label">Unidad</span>
                  <span class="detalle-prop__value">{{ producto.unidad }}</span>
                </div>
              </div>

              <!-- Banner informativo -->
              <q-banner dense rounded class="detalle-banner">
                <template #avatar>
                  <q-icon name="info" color="blue" />
                </template>
                El stock disponible y el precio de compra son visibles solo para usuarios autorizados del sistema.
              </q-banner>
            </div>
          </article>

          <footer class="detalle-footer">
            <q-icon name="copyright" size="12px" class="q-mr-xs" />
            {{ appAuthor }}
          </footer>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import type { Producto } from 'src/types'
import { productoService } from 'src/services/productoService'
import { useCategoriaStore } from 'src/stores/categoriaStore'
import { useQR } from 'src/composables/useQR'
import { formatCurrency } from 'src/utils/formatters'
import ProductoImagenIFrame from 'src/components/productos/ProductoImagenIFrame.vue'

const $q = useQuasar()
const route = useRoute()
const categoriaStore = useCategoriaStore()
const { generarDataUrl, buildQrEnlace } = useQR()

const skuParam = computed(() => (route.params.sku as string) ?? '')
const isMobile = computed(() => $q.screen.lt.md)

const appName = computed(() =>
  !isMobile.value ? (import.meta.env.VITE_APP_NAME ?? 'SGI') : 'SGI - MAXEL',
)
const appNameSub = computed(() => (!isMobile.value ? import.meta.env.VITE_APP_NAME_SUBTITLE : ''))
const appAuthor = computed(() => import.meta.env.VITE_APP_AUTHOR ?? 'AlvareX')

type Estado = 'cargando' | 'ok' | 'error'
const estado = ref<Estado>('cargando')
const producto = ref<Producto | null>(null)
const qrDataUrl = ref('')

const categoriaNombre = computed(() => {
  if (!producto.value?.categoriaId) return ''
  return categoriaStore.getById(producto.value.categoriaId)?.nombre ?? ''
})

async function generarQR(sku: string): Promise<void> {
  try {
    const contenido = buildQrEnlace(sku)
    qrDataUrl.value = await generarDataUrl(contenido, 160)
  } catch {
    // QR no crítico
  }
}

async function cargar(): Promise<void> {
  estado.value = 'cargando'
  try {
    await categoriaStore.fetchAll()
    const p = await productoService.getBySku(skuParam.value)
    if (!p || !p.activo) {
      estado.value = 'error'
      return
    }
    producto.value = p
    estado.value = 'ok'
    await generarQR(p.sku)
  } catch {
    estado.value = 'error'
  }
}

onMounted(cargar)
</script>

<style scoped lang="scss">
// ── Layout ────────────────────────────────────────────────────
.detalle-layout {
  background: var(--sgi-surface-alt);
  min-height: 100vh;
}

.detalle-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
}

// ── Header ────────────────────────────────────────────────────
.detalle-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0 28px;
  height: var(--sgi-header-height);
  background: var(--sgi-header-bg);
  border-bottom: 1px solid var(--sgi-border);

  &__brand {
    display: flex;
    align-items: center;
    font-weight: 700;
    font-size: 0.95rem;
    color: var(--sgi-text);
    opacity: 0.8;
  }

  &__sub {
    color: var(--sgi-text-muted);
    font-weight: 600;
    font-size: 0.95rem;
    margin-left: 4px;
    opacity: 0.72;
  }
}

// ── Estados ───────────────────────────────────────────────────
.detalle-estado {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 64px 24px;
  color: var(--sgi-text-muted);

  &__title {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--sgi-text);
  }

  &__text {
    font-size: 0.95rem;
    margin: 0;
    text-align: center;
  }
}

// ── Contenido ─────────────────────────────────────────────────
.detalle-contenido {
  flex: 1;
  width: min(820px, 95vw);
  padding: 24px 0 40px;
  display: flex;
  flex-direction: column;
}

// ── Card ───────────────────────────────────────────────────────
.detalle-card {
  display: grid;
  grid-template-columns: 340px 1fr;
  border-radius: 16px;
  background: var(--sgi-surface);
  border: 1px solid var(--sgi-border);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 4px 12px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  animation: cardIn 400ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes cardIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

// ── Columna imagen ────────────────────────────────────────────
.detalle-card__image {
  background: color-mix(in srgb, var(--sgi-surface-alt) 60%, transparent);
  border-right: 1px solid var(--sgi-border);
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.detalle-img-wrap {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
  background: var(--sgi-surface);
  border: 1px solid var(--sgi-border);
}

.detalle-img-placeholder {
  width: 100%;
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 12px;
  background: var(--sgi-surface);
  border: 1px dashed var(--sgi-border);
}

.detalle-qr-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.detalle-qr-label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--sgi-text-muted);
  font-weight: 600;
}

.detalle-qr-img {
  width: 120px;
  height: 120px;
  border-radius: 8px;
  border: 1px solid var(--sgi-border);
}

.detalle-qr-sku {
  font-size: 0.72rem;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  color: var(--sgi-text-muted);
  word-break: break-all;
  text-align: center;
  max-width: 140px;
}

// ── Columna datos ─────────────────────────────────────────────
.detalle-card__data {
  padding: 28px 32px;
  display: flex;
  flex-direction: column;
}

.detalle-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 16px;
}

.detalle-head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.detalle-marca {
  background: color-mix(in srgb, var(--sgi-info) 75%, transparent);
  color: var(--sgi-chip-text);
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 0.82rem;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.detalle-code {
  background: color-mix(in srgb, var(--sgi-warning) 75%, transparent);
  color: var(--sgi-chip-text);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 0.82rem;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.detalle-nombre {
  font-size: clamp(1.3rem, 2.5vw, 1.9rem);
  font-weight: 800;
  color: var(--sgi-text);
  margin: 0 0 8px;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.detalle-descripcion {
  font-size: 0.95rem;
  color: var(--sgi-text-muted);
  line-height: 1.6;
  margin: 0;
}

// ── Precios ───────────────────────────────────────────────────
.detalle-precios {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.detalle-precio-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 120px;

  &--featured {
    border-left: 3px solid var(--sgi-primary);
    padding-left: 16px;
  }
}

.detalle-precio-label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--sgi-text-muted);
  font-weight: 600;
}

.detalle-precio-valor {
  font-size: 1.25rem;
  font-weight: 700;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  letter-spacing: -0.02em;
  color: var(--sgi-text);

  &--principal {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--sgi-primary);
  }

  &--muted {
    color: var(--sgi-text-muted);
    font-weight: 500;
  }
}

// ── Props ─────────────────────────────────────────────────────
.detalle-props {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detalle-prop {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: var(--sgi-text);

  &__label {
    color: var(--sgi-text-muted);
    min-width: 80px;
  }

  &__value {
    font-weight: 600;
  }
}

// ── Banner ────────────────────────────────────────────────────
.detalle-banner {
  font-size: 0.82rem;
  border-radius: 10px;
  margin-top: 20px;
}

// ── Footer ────────────────────────────────────────────────────
.detalle-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: var(--sgi-text-muted);
  font-size: 0.78rem;
  padding: 24px 0 8px;
}

// ── Responsive ────────────────────────────────────────────────
@media (max-width: 740px) {
  .detalle-card {
    grid-template-columns: 1fr;
  }

  .detalle-card__image {
    border-right: none;
    border-bottom: 1px solid var(--sgi-border);
    padding: 16px;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
  }

  .detalle-img-wrap,
  .detalle-img-placeholder {
    width: 180px;
    aspect-ratio: 1;
  }

  .detalle-qr-img {
    width: 90px;
    height: 90px;
  }

  .detalle-card__data {
    padding: 20px;
  }

  .detalle-contenido {
    width: 100vw;
    padding: 0 0 24px;
  }

  .detalle-header {
    padding: 0 16px;
  }
}

@media (max-width: 480px) {
  .detalle-card__image {
    flex-direction: column;
    align-items: center;
  }

  .detalle-img-wrap,
  .detalle-img-placeholder {
    width: 100%;
    max-width: 240px;
  }

  .detalle-card__data {
    padding: 16px;
  }

  .detalle-precios {
    flex-direction: column;
    gap: 12px;
  }

  .detalle-precio-item--featured {
    border-left-width: 3px;
    padding-left: 14px;
  }

  .detalle-precio-valor {
    font-size: 1.1rem;

    &--principal {
      font-size: 1.3rem;
    }
  }
}
</style>
