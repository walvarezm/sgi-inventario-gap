<template>
  <!-- ── Layout público: sin sidebar, sin header de sesión ── -->
  <q-layout view="lHh lpr lFf" class="detalle-layout">
    <q-page-container>
      <q-page class="detalle-page">
        <!-- ── Header público minimalista ─────────────────── -->
        <q-header elevated class="detalle-header">
          <div class="detalle-header__brand">
            <q-icon name="inventory_2" size="20px" class="q-mr-xs" />
            <span>{{ appName }}</span>
            <span v-if="!isMobile" class="sgi-logo-sub">{{ appNameSub }}</span>
          </div>
          <!--          <q-chip dense outline color="grey-6" icon="public" label="Consulta pública" size="sm" />-->
        </q-header>

        <!-- ── Estado: cargando ────────────────────────────── -->
        <div
          v-if="estado === 'cargando'"
          class="detalle-estado flex flex-center column q-gutter-md"
        >
          <q-spinner color="primary" size="52px" />
          <div class="text-body2 text-muted">
            Buscando producto
            <strong>{{ skuParam }}</strong>
            …
          </div>
        </div>

        <!-- ── Estado: error / no encontrado ──────────────── -->
        <div
          v-else-if="estado === 'error'"
          class="detalle-estado flex flex-center column q-gutter-sm text-center"
        >
          <q-icon name="search_off" size="72px" color="grey-4" />
          <div class="text-h6 text-weight-bold q-mt-md">Producto no encontrado</div>
          <div class="text-body2 text-muted">
            El código
            <code class="detalle-code">{{ skuParam }}</code>
            no corresponde a ningún producto activo en el catálogo.
          </div>
          <q-btn
            outline
            color="primary"
            icon="arrow_back"
            label="Volver"
            class="q-mt-lg"
            @click="$router.back()"
          />
        </div>

        <!-- ── Detalle del producto ────────────────────────── -->
        <div v-else-if="estado === 'ok' && producto" class="detalle-contenido">
          <!-- Tarjeta principal -->
          <q-card class="detalle-card" flat>
            <div :class="producto.imagenUrl ? 'detalle-card__inner' : 'detalle-card__inner_flex'">
              <!-- Columna imagen -->
              <div class="detalle-imagen-col">
                <div v-if="producto.imagenUrl" class="detalle-imagen-wrap">
                  <q-img
                    v-if="producto.imagenUrl"
                    :src="imagenSrc"
                    :alt="producto.nombre"
                    fit="contain"
                    class="detalle-imagen"
                    loading="lazy"
                  >
                    <template #error>
                      <div class="detalle-imagen-placeholder flex flex-center column">
                        <q-icon name="image_not_supported" size="48px" color="grey-4" />
                        <span class="text-caption text-muted q-mt-xs">Sin imagen</span>
                      </div>
                    </template>
                  </q-img>
                  <div v-else class="detalle-imagen-placeholder flex flex-center column">
                    <q-icon name="inventory_2" size="56px" color="grey-4" />
                    <span class="text-caption text-muted q-mt-xs">Sin imagen 2</span>
                  </div>
                </div>

                <!-- QR -->
                <div v-if="mostrarCampo && qrDataUrl" class="detalle-qr-wrap q-mt-md text-center">
                  <div class="text-caption text-muted q-mb-xs">Código QR</div>
                  <img
                    v-if="qrDataUrl"
                    :src="qrDataUrl"
                    :alt="`QR ${producto.sku}`"
                    class="detalle-qr-img"
                  />
                  <q-spinner v-else-if="generandoQr" color="grey" size="32px" />
                  <div
                    class="text-caption text-muted q-mt-xs"
                    style="word-break: break-all; max-width: 200px; margin: 0 auto"
                  >
                    {{ producto.sku }}
                  </div>
                </div>
              </div>

              <!-- Columna datos -->
              <div class="detalle-datos-col">
                <!-- Badges -->
                <div v-if="mostrarCampo" class="detalle-badges q-mb-sm">
                  <q-chip
                    dense
                    :color="producto.activo ? 'positive' : 'grey'"
                    text-color="white"
                    icon="circle"
                    size="sm"
                  >
                    {{ producto.activo ? 'Activo' : 'Inactivo' }}
                  </q-chip>
                  <!--                  <q-chip
                    v-if="producto.categoriaId"
                    dense
                    outline
                    color="primary"
                    icon="category"
                    size="sm"
                  >
                    {{ nombreCategoria }}
                  </q-chip>-->
                </div>

                <!-- Marca y nombre -->
                <div class="detalle-marcas text-muteds q-mb-xs">
                  <div class="row">
                    <span class="detalle-marca">{{ producto.marca }}</span>
                    <q-space />
                    <span class="detalle-code">{{ producto.sku }}</span>
                  </div>
                </div>
                <h1 class="detalle-nombre">{{ producto.nombre }}</h1>

                <!-- SKU -->
                <!--                <div class="detalle-sku-row q-mb-md">
                  <q-icon name="qr_code" size="16px" class="q-mr-xs text-muted" />
                  <code class="detalle-code">{{ producto.sku }}</code>
                </div>-->

                <!-- Descripción -->
                <div
                  v-if="producto.descripcion && producto.descripcion !== producto.nombre"
                  class="detalle-descripcion q-mb-lg"
                >
                  {{ producto.descripcion }}
                </div>

                <q-separator class="q-mb-lg" />

                <!-- Precios -->
                <div class="detalle-precios">
                  <div class="detalle-precio-item detalle-precio-item--final">
                    <div class="detalle-precio-label">Precio de venta</div>
                    <div class="detalle-precio-valor detalle-precio-valor--principal">
                      {{ formatCurrency(producto.precioOfrecido) }}
                    </div>
                  </div>
                  <div
                    v-if="mostrarCampo && producto.precioOfrecido !== producto.precioFinal"
                    class="detalle-precio-item"
                  >
                    <div class="detalle-precio-label">Precio final</div>
                    <div class="detalle-precio-valor detalle-precio-valor--lista">
                      {{ formatCurrency(producto.precioFinal) }}
                    </div>
                  </div>
                </div>

                <q-separator class="q-my-lg" />

                <!-- Propiedades adicionales -->
                <div v-if="mostrarCampo" class="detalle-props">
                  <div v-if="producto.unidad" class="detalle-prop">
                    <q-icon name="straighten" size="16px" class="text-muted" />
                    <span class="detalle-prop-label">Unidad</span>
                    <span class="detalle-prop-valor">{{ producto.unidad }}</span>
                  </div>
                </div>

                <!-- Nota de acceso restringido -->
                <q-banner
                  v-if="mostrarCampo"
                  dense
                  rounded
                  class="detalle-nota q-mt-lg bg-blue-1 text-blue-9"
                >
                  <template #avatar>
                    <q-icon name="info" color="blue" />
                  </template>
                  El stock disponible y el precio de compra son visibles solo para usuarios
                  autorizados del sistema.
                </q-banner>
              </div>
            </div>
          </q-card>

          <!-- Footer de la tarjeta -->
          <!--          <div class="detalle-footer text-center text-caption text-muted">
            <q-icon name="inventory_2" size="14px" class="q-mr-xs" />
            {{ appName }}
          </div>-->
          <!--          <div class="sgi-drawer-footer q-pa-md">
            <div class="text-caption text-muted">v{{ appVersion }}</div>
          </div>-->
        </div>
        <q-footer elevated class="detalle-footer">
          <q-icon name="copyright" size="14px" class="q-mr-xs" />
          {{ appAuthor }}
        </q-footer>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import type { Producto } from 'src/types'
import { productoService } from 'src/services/productoService'
import { useQR } from 'src/composables/useQR'
//import { useCategoriaStore } from 'src/stores/categoriaStore'
import { drivePreviewUrl } from 'src/utils/qrUtils'
import { formatCurrency } from 'src/utils/formatters'
import { useQuasar } from 'quasar'
const $q = useQuasar()

// ── Route ───────────────────────────────────────────────────
const route = useRoute()
const skuParam = computed(() => (route.params.sku as string) ?? '')
const isMobile = computed(() => $q.screen.lt.md)

// ── Config ──────────────────────────────────────────────────
const appName = computed(() =>
  !isMobile.value ? (import.meta.env.VITE_APP_NAME ?? 'SGI') : 'SGI - MAXEL',
)
const appNameSub = computed(() => (!isMobile.value ? import.meta.env.VITE_APP_NAME_SUBTITLE : ''))
const appAuthor = computed(
  () => import.meta.env.VITE_APP_AUTHOR ?? 'AlvareX',
  //!isMobile.value ? (import.meta.env.VITE_APP_AUTHOR ?? 'AlvareX') : '',
)

// ── Estado ──────────────────────────────────────────────────
type Estado = 'cargando' | 'ok' | 'error'
const estado = ref<Estado>('cargando')
const producto = ref<Producto | null>(null)
const mostrarCampo = ref<boolean>(false)

// ── Stores y composables ────────────────────────────────────
//const categoriaStore = useCategoriaStore()
const { generarDataUrl, buildQrEnlace } = useQR()

// ── QR ──────────────────────────────────────────────────────
const qrDataUrl = ref('')
const generandoQr = ref(false)

async function generarQR(sku: string): Promise<void> {
  generandoQr.value = true
  try {
    const contenido = buildQrEnlace(sku)
    qrDataUrl.value = await generarDataUrl(contenido, 160)
  } finally {
    generandoQr.value = false
  }
}

// ── Imagen ──────────────────────────────────────────────────
const imagenSrc = computed(() => {
  if (!producto.value?.imagenUrl) return ''
  const url = producto.value.imagenUrl
  // Si es un ID de Drive (no comienza con http), construir URL de preview
  if (!url.startsWith('http')) return drivePreviewUrl(url)
  return url
})

// ── Categoría ───────────────────────────────────────────────
/*const nombreCategoria = computed(() => {
  if (!producto.value?.categoriaId) return ''
  const cat = categoriaStore.items.find((c) => c.id === producto.value!.categoriaId)
  return cat?.nombre ?? producto.value.categoriaId
})*/

// ── Carga principal ─────────────────────────────────────────
async function cargar(): Promise<void> {
  estado.value = 'cargando'
  try {
    //await categoriaStore.fetchAll()
    const p = await productoService.getBySku(skuParam.value)
    if (!p || !p.activo) {
      estado.value = 'error'
      return
    }
    producto.value = p
    estado.value = 'ok'
    //await generarQR(p.sku)
  } catch {
    estado.value = 'error'
  }
}

onMounted(cargar)
</script>

<style scoped lang="scss">
// ── Layout ──────────────────────────────────────────────────
.detalle-layout {
  background: var(--sgi-surface-alt);
  min-height: 100vh;
}

.detalle-page {
  min-height: 100vh;
  padding: 0;
  display: flex;
  flex-direction: column;
}

// ── Header público ──────────────────────────────────────────
.detalle-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px 1px 28px;
  margin: 0;
  /*background: var(--sgi-surface);*/
  background: var(--sgi-header-bg);
  border-bottom: 1px solid var(--sgi-border);
  /*height: var(--sgi-header-height);*/
  /*height: auto !important;*/
  height: var(--sgi-header-height);

  &__brand {
    display: flex;
    align-items: center;
    font-weight: 700;
    font-size: 0.95rem;
    color: var(--sgi-text);
    opacity: 0.8;
  }
}

.sgi-logo-sub {
  color: var(--sgi-text-muted);
  font-weight: 600;
  font-size: 0.95rem;
  margin-left: 4px;
  opacity: 0.72;
}

// ── Estados ─────────────────────────────────────────────────
.detalle-estado {
  flex: 1;
  padding: 64px 24px;
  color: var(--sgi-text-muted);
}

// ── Contenido principal ─────────────────────────────────────
.detalle-contenido {
  flex: 1;
  max-width: 960px;
  width: 100%;
  margin: 15px auto 40px auto;
  padding: 0 24px 0 42px;
}

// ── Tarjeta ─────────────────────────────────────────────────
.detalle-card {
  border-radius: var(--sgi-radius-lg);
  background: var(--sgi-surface);
  border: 1px solid var(--sgi-border);
  box-shadow: var(--sgi-shadow);
  overflow: hidden;

  &__inner {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 0;
  }

  &__inner_flex {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
}

// ── Columna imagen ───────────────────────────────────────────
.detalle-imagen-col {
  background: color-mix(in srgb, var(--sgi-surface-alt) 60%, transparent);
  border-right: 1px solid var(--sgi-border);
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.detalle-imagen-wrap {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 14px;
  overflow: hidden;
  background: var(--sgi-surface);
  border: 1px solid var(--sgi-border);
}

.detalle-imagen {
  width: 100%;
  height: 100%;
}

.detalle-imagen-placeholder {
  width: 100%;
  height: 100%;
  min-height: 200px;
}

.detalle-qr-img {
  width: 160px;
  height: 160px;
  border-radius: 8px;
  border: 1px solid var(--sgi-border);
}

.detalle-qr-wrap {
  width: 100%;
}

// ── Columna datos ────────────────────────────────────────────
.detalle-datos-col {
  padding: 32px 36px;
}

.detalle-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.detalle-marca {
  background: color-mix(in srgb, var(--sgi-info) 75%, transparent) !important;
  color: var(--sgi-chip-text);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.88rem;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.detalle-nombre {
  font-size: clamp(1.2rem, 2.5vw, 1.9rem);
  font-weight: 800;
  color: var(--sgi-text);
  margin: 10px 0;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.detalle-sku-row {
  display: flex;
  align-items: center;
}

.detalle-code {
  background: color-mix(in srgb, var(--sgi-warning) 75%, transparent) !important;
  color: var(--sgi-chip-text);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 0.88rem;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.detalle-descripcion {
  font-size: 0.95rem;
  color: var(--sgi-text-muted);
  line-height: 1.6;
}

// ── Precios ──────────────────────────────────────────────────
.detalle-precios {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
}

.detalle-precio-item {
  display: flex;
  flex-direction: column;
  gap: 4px;

  &--final {
    border-left: 3px solid var(--sgi-warning);
    padding-left: 14px;
  }
}

.detalle-precio-label {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--sgi-text-muted);
  font-weight: 600;
}

.detalle-precio-valor {
  font-weight: 800;
  border-radius: 6px;
  padding: 2px 8px;

  &--principal {
    background: color-mix(in srgb, var(--sgi-info) 95%, transparent) !important;
    font-size: 1.5rem;
    color: var(--sgi-surface-alt);
    letter-spacing: -0.03em;
  }

  &--lista {
    font-size: 1.5rem;
    color: var(--sgi-text-muted);
    /*text-decoration: line-through;*/
    font-weight: 600;
  }
}

// ── Propiedades ──────────────────────────────────────────────
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
}

.detalle-prop-label {
  color: var(--sgi-text-muted);
  min-width: 80px;
}

.detalle-prop-valor {
  font-weight: 600;
}

// ── Nota ─────────────────────────────────────────────────────
.detalle-nota {
  font-size: 0.82rem;
  border-radius: 10px;
}

// ── Footer ───────────────────────────────────────────────────
.detalle-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--sgi-text-muted);
  font-size: 0.8rem;
  padding: 20px 28px 0 28px;
  margin: 0;
  position: absolute;

  bottom: 0;
  width: 100%;
  height: 20px !important;
  background: var(--sgi-surface-alt);
  border-top: 1px solid var(--sgi-border);
}

// ── Responsive ───────────────────────────────────────────────
@media (max-width: 700px) {
  .detalle-card__inner {
    grid-template-columns: 1fr;
  }

  .detalle-imagen-col {
    border-right: none;
    border-bottom: 1px solid var(--sgi-border);
    padding: 8px 0 8px 0;
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }

  .detalle-imagen-wrap {
    width: 180px;
    flex-shrink: 0;
  }

  .detalle-qr-wrap {
    width: auto;
  }

  .detalle-qr-img {
    width: 100px;
    height: 100px;
  }

  .detalle-datos-col {
    padding: 20px;
  }

  .detalle-contenido {
    padding: 0 0 32px 0;
    margin: 0;
  }

  .detalle-header {
    padding: 5px 16px 5px 16px;
    margin: 0;
  }

  .sgi-logo-sub {
    display: none;
  }
}

@media (max-width: 480px) {
  .detalle-imagen-col {
    flex-direction: column;
    align-items: center;
  }

  .detalle-imagen-wrap {
    width: 180px;
  }
}
</style>
