<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'src/stores/authStore'
import { useSucursalStore } from 'src/stores/sucursalStore'
import { useCategoriaStore } from 'src/stores/categoriaStore'
import { useCataloStore } from 'src/stores/cataloStore'
import { useCatalogo } from 'src/composables/useCatalogo'
import type { ProductoCatalogo } from 'src/types'
import { formatCurrency } from 'src/utils/formatters'
import CatalogoEditDialog from 'src/components/catalogo/CatalogoEditDialog.vue'
import CatalogoTabla from 'src/components/catalogo/CatalogoTabla.vue'
import CatalogoTarjeta from 'src/components/catalogo/CatalogoTarjeta.vue'
import ProductoQR from 'src/components/productos/ProductoQR.vue'
import { useMarcaStore } from 'src/stores/marcaStore.ts'

// ── Stores ─────────────────────────────────────────────────────
const authStore = useAuthStore()
const sucursalStore = useSucursalStore()
const categoriaStore = useCategoriaStore()
const marcaStore = useMarcaStore()
const cataloStore = useCataloStore()
const catalogo = useCatalogo()
const $q = useQuasar()

// ── State ──────────────────────────────────────────────────────
const sucursalSeleccionada = ref(authStore.isGlobal ? '' : (authStore.sucursalId ?? ''))
const dialogQR = ref(false)
const dialogEditarProducto = ref(false)
const productoQR = ref<ProductoCatalogo | null>(null)
const productoEditar = ref<ProductoCatalogo | null>(null)
const mostrarSoloStockBajo = ref(false)
const mostrarSoloAgotados = ref(false)
const exportandoPDF = ref(false)

// ── Computed ───────────────────────────────────────────────────
const opcionesSucursal = computed(() =>
  sucursalStore.activas.map((s) => ({ label: `${s.nombre} — ${s.ciudad}`, value: s.id })),
)

const productosAgotados = computed(
  () => catalogo.productosFiltrados.value.filter((p) => p.stock === 0).length,
)
const esMovil = computed(() => $q.screen.lt.md)
const vistaActivaEsTabla = computed(() => !esMovil.value && catalogo.vistaTabla.value)
const puedeCambiarVista = computed(() => !esMovil.value)
const chipsResumen = computed(() => [
  {
    label: 'Mostrados',
    value: productosMostrados.value.length,
    tone: 'primary',
    icon: 'inventory_2',
  },
  {
    label: 'Stock bajo',
    value: catalogo.conStockBajo.value.length,
    tone: 'warning',
    icon: 'warning_amber',
  },
  {
    label: 'Agotados',
    value: productosAgotados.value,
    tone: 'grey-7',
    icon: 'remove_circle_outline',
  },
])

const productosMostrados = computed(() => {
  let lista = catalogo.productosFiltrados.value
  if (mostrarSoloStockBajo.value) lista = lista.filter((p) => p.stockBajo && p.stock > 0)
  if (mostrarSoloAgotados.value) lista = lista.filter((p) => p.stock === 0)

  lista = lista.map((p) => ({
    ...p,
    imagenLocation: p.imagenUrl ? 'drive' : 'local',
    imagenUrl: p.imagenUrl ? p.imagenUrl : p.sku,
  }))

  return lista
})

// ── Actions ────────────────────────────────────────────────────
async function cargarCatalogo(): Promise<void> {
  if (!sucursalSeleccionada.value) return
  await catalogo.cargarCatalogo(sucursalSeleccionada.value)
}

async function cargarCatalogoForzado(): Promise<void> {
  if (!sucursalSeleccionada.value) return
  await catalogo.cargarCatalogo(sucursalSeleccionada.value, true)
}

async function onCambioSucursal(): Promise<void> {
  catalogo.limpiarFiltros()
  mostrarSoloStockBajo.value = false
  mostrarSoloAgotados.value = false
  await cargarCatalogo()
}

async function recargar(): Promise<void> {
  if (sucursalSeleccionada.value) {
    cataloStore.invalidateCache(sucursalSeleccionada.value)
    await cargarCatalogoForzado()
  }
}

function verQR(producto: ProductoCatalogo): void {
  productoQR.value = producto
  dialogQR.value = true
}

function abrirEdicion(producto: ProductoCatalogo): void {
  productoEditar.value = producto
  dialogEditarProducto.value = true
}

async function onProductoEditado(): Promise<void> {
  dialogEditarProducto.value = false
  productoEditar.value = null
  await recargar()
}

// ── Exportación PDF ────────────────────────────────────────────
async function exportarPDF(): Promise<void> {
  exportandoPDF.value = true
  try {
    const sucursal = sucursalStore.getById(sucursalSeleccionada.value)
    const nombreSucursal = sucursal?.nombre ?? 'Sucursal'
    const fecha = new Date().toLocaleDateString('es-BO')

    const filas = productosMostrados.value
      .map(
        (p) => `
        <tr>
          <td>${p.sku}</td>
          <td>${p.marca}</td>
          <td>${p.nombre}</td>
          ${authStore.can('productos.editar') ? `<td style="text-align:right">${formatCurrency(Number(p.precioCompra) || 0)}</td>` : ''}
          <td style="text-align:right">${formatCurrency(p.precioOfrecido)}</td>
          <td style="text-align:right"><strong>${formatCurrency(p.precioFinal)}</strong></td>
          <td style="text-align:center;color:${p.stock === 0 ? '#c62828' : p.stockBajo ? '#f57f17' : '#2e7d32'}">${p.stock}</td>
        </tr>`,
      )
      .join('')

    const html = `
      <!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Catálogo — ${nombreSucursal}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a2e; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        .subtitle { color: #6b7a99; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #1565c0; color: white; padding: 8px; text-align: left; }
        td { padding: 6px 8px; border-bottom: 1px solid #e0e7ef; }
        tr:nth-child(even) { background: #f5f7fa; }
      </style></head><body>
      <h1>Catálogo de Productos — ${nombreSucursal}</h1>
      <div class="subtitle">Generado: ${fecha} · ${productosMostrados.value.length} productos</div>
      <table>
        <thead><tr>
          <th>SKU</th><th>Marca</th><th>Producto</th>
          ${authStore.can('productos.editar') ? '<th style="text-align:right">P. Compra</th>' : ''}
          <th style="text-align:right">P. Lista</th>
          <th style="text-align:right">P. Venta</th>
          <th style="text-align:center">Stock</th>
        </tr></thead>
        <tbody>${filas}</tbody>
      </table>
      </body></html>`

    const ventana = window.open('', '_blank')
    if (ventana) {
      ventana.document.write(html)
      ventana.document.close()
      ventana.print()
    }
  } finally {
    exportandoPDF.value = false
  }
}

// ── Exportación Excel (CSV) ────────────────────────────────────
function exportarExcel(): void {
  const sucursal = sucursalStore.getById(sucursalSeleccionada.value)
  const nombreSucursal = (sucursal?.nombre ?? 'catalogo').replace(/\s+/g, '_')

  const encabezados = [
    'SKU',
    'Marca',
    'Nombre',
    'Descripcion',
    ...(authStore.can('productos.editar') ? ['Precio_Compra'] : []),
    'Precio_Lista',
    'Precio_Venta',
    'Stock',
    'Stock_Bajo',
  ]
  const filas = productosMostrados.value.map((p) => [
    p.sku,
    p.marca,
    `"${p.nombre}"`,
    `"${p.descripcion}"`,
    ...(authStore.can('productos.editar') ? [Number(p.precioCompra) || 0] : []),
    p.precioOfrecido,
    p.precioFinal,
    p.stock,
    p.stockBajo ? 'SI' : 'NO',
  ])

  const csv = [encabezados, ...filas].map((r) => r.join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `catalogo_${nombreSucursal}_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

// ── Lifecycle ──────────────────────────────────────────────────
onMounted(async () => {
  cataloStore.loading = true
  await Promise.all([
    sucursalStore.items.length === 0 ? sucursalStore.fetchAll() : Promise.resolve(),
    categoriaStore.fetchAll(),
    marcaStore.fetchAll(),
  ])
  cataloStore.loading = false

  // Si no es global, fijar sucursal y cargar
  if (!authStore.isGlobal && authStore.sucursalId) {
    sucursalSeleccionada.value = authStore.sucursalId
    await cargarCatalogo()
  } else if (
    authStore.isGlobal &&
    sucursalStore.activas.length > 0 &&
    !sucursalSeleccionada.value
  ) {
    sucursalSeleccionada.value = sucursalStore.activas[0].id
    await cargarCatalogo()
  }
})

watch(
  esMovil,
  (movil) => {
    if (movil) {
      catalogo.vistaTabla.value = false
    }
  },
  { immediate: true },
)
</script>

<template>
  <q-page class="sgi-page">
    <!-- ── Header ──────────────────────────────────────────── -->
    <section class="catalogo-hero q-mb-md">
      <div class="catalogo-hero__copy">
        <!--        <q-chip dense outline color="primary" icon="flash_on" class="q-mb-sm">
          Consulta rápida
        </q-chip>-->
        <div class="sgi-page-title">Catálogo de Productos</div>
        <!--        <div class="text-body2 sgi-page-subtitle q-mt-xs">
          Visualiza precios y stock de forma ágil, especialmente desde celular para consulta en piso
          de venta.
        </div>-->
      </div>

      <div v-if="authStore.can('productos.editar')" class="catalogo-hero__actions">
        <q-btn
          outline
          color="primary"
          icon="picture_as_pdf"
          :label="esMovil ? 'PDF' : 'Exportar PDF'"
          size="sm"
          :loading="exportandoPDF"
          @click="exportarPDF"
        />
        <q-btn
          outline
          color="positive"
          icon="table_chart"
          :label="esMovil ? 'Excel' : 'Exportar Excel'"
          size="sm"
          @click="exportarExcel"
        />
      </div>
    </section>

    <!-- ── Controles / Filtros ──────────────────────────────── -->
    <q-card class="sgi-card q-mb-md catalogo-panel" flat>
      <q-expansion-item
        icon="tune"
        label="Filtros y búsqueda"
        caption="Sucursal, búsqueda y segmentación del catálogo"
        expand-separator
        :default-opened="!esMovil"
        header-class="sgi-filter-toggle"
      >
        <q-card-section class="catalogo-toolbar sgi-filter-body">
          <!-- Selector de sucursal (solo Admin/Supervisor) -->
          <div class="catalogo-toolbar__field catalogo-toolbar__field--sucursal">
            <q-select
              v-model="sucursalSeleccionada"
              :options="opcionesSucursal"
              :label="authStore.isGlobal ? 'Sucursal' : 'Su sucursal'"
              outlined
              dense
              emit-value
              map-options
              :disable="!authStore.isGlobal"
              @update:model-value="onCambioSucursal"
            >
              <template #prepend><q-icon name="store" /></template>
              <template #after>
                <q-btn
                  flat
                  round
                  dense
                  icon="refresh"
                  color="primary"
                  :loading="catalogo.loading.value"
                  @click="recargar"
                >
                  <q-tooltip>Recargar catálogo</q-tooltip>
                </q-btn>
              </template>
            </q-select>
          </div>

          <!-- Búsqueda -->
          <div class="catalogo-toolbar__field catalogo-toolbar__field--search">
            <q-input
              v-model="catalogo.busqueda.value"
              placeholder="Buscar código, marca o descripción"
              outlined
              dense
              clearable
            >
              <template #prepend><q-icon name="search" /></template>
            </q-input>
          </div>

          <!-- Filtro categoría -->
          <div class="catalogo-toolbar__field">
            <q-select
              v-model="catalogo.categoriaFiltro.value"
              :options="[{ label: 'Todas las categorías', value: null }, ...categoriaStore.options]"
              label="Categoría"
              outlined
              dense
              emit-value
              map-options
            />
          </div>
          <div class="catalogo-toolbar__field">
            <q-select
              v-model="catalogo.marcaFiltro.value"
              :options="[{ label: 'Todas las marcas', value: null }, ...marcaStore.optionsName]"
              label="Marca"
              outlined
              dense
              emit-value
              map-options
            />
          </div>

          <!-- Toggle vista -->
          <div v-if="puedeCambiarVista" class="catalogo-toolbar__toggle">
            <q-btn-toggle
              v-model="catalogo.vistaTabla.value"
              :options="[
                { value: true, slot: 'tabla' },
                { value: false, slot: 'tarjetas' },
              ]"
              toggle-color="primary"
              outline
              dense
              rounded
            >
              <template #tabla>
                <q-icon name="table_rows" />
                <q-tooltip>Vista tabla</q-tooltip>
              </template>
              <template #tarjetas>
                <q-icon name="grid_view" />
                <q-tooltip>Vista tarjetas</q-tooltip>
              </template>
            </q-btn-toggle>
          </div>
        </q-card-section>
        <q-card-section v-if="!esMovil && authStore.can('productos.editar')" class="q-pt-none">
          <div class="catalogo-summary q-mb-md">
            <div v-for="chip in chipsResumen" :key="chip.label" class="catalogo-summary__item">
              <div class="catalogo-summary__icon">
                <q-icon :name="chip.icon" :color="chip.tone" size="18px" />
              </div>
              <div>
                <div class="catalogo-summary__value">{{ chip.value }}</div>
                <div class="catalogo-summary__label">{{ chip.label }}</div>
              </div>
            </div>
          </div>

          <!-- Filtro rápido de stock -->
          <div class="catalogo-quick-filters">
            <q-chip
              v-model:selected="mostrarSoloStockBajo"
              clickable
              outline
              color="warning"
              icon="warning"
              label="Ver solo stock bajo"
              size="sm"
            />
            <q-chip
              v-model:selected="mostrarSoloAgotados"
              clickable
              outline
              color="grey"
              icon="remove_circle_outline"
              label="Ver solo agotados"
              size="sm"
            />
          </div>
        </q-card-section>
      </q-expansion-item>
    </q-card>

    <!-- ── Contenido principal ──────────────────────────────── -->
    <!-- Sin sucursal seleccionada -->
    <div v-if="!sucursalSeleccionada" class="full-width column flex-center q-pa-xl text-muted">
      <q-icon name="store" size="64px" style="opacity: 0.2" class="q-mb-md" />
      <p class="text-body1">Selecciona una sucursal para ver el catálogo</p>
    </div>

    <!-- Vista tabla -->
    <CatalogoTabla
      v-else-if="vistaActivaEsTabla"
      :productos="productosMostrados"
      :loading="catalogo.loading.value"
      @ver-qr="verQR"
      @editar="abrirEdicion"
    />

    <!-- Vista tarjetas -->
    <CatalogoTarjeta
      v-else
      :productos="productosMostrados"
      :loading="catalogo.loading.value"
      @ver-qr="verQR"
      @editar="abrirEdicion"
    />

    <q-dialog v-model="dialogEditarProducto" persistent>
      <CatalogoEditDialog
        :producto="productoEditar"
        @saved="onProductoEditado"
        @cancelled="dialogEditarProducto = false"
      />
    </q-dialog>

    <!-- ── Dialog QR ────────────────────────────────────────── -->
    <q-dialog v-model="dialogQR">
      <q-card class="sgi-card q-pa-md text-center" style="min-width: 300px; max-width: 360px">
        <q-card-section class="row items-center q-pb-none">
          <div>
            <div class="text-subtitle1 text-weight-bold">{{ productoQR?.sku }}</div>
            <div class="text-caption text-muted">{{ productoQR?.nombre }}</div>
          </div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section>
          <ProductoQR v-if="productoQR" :sku="productoQR.sku" :qr-code="productoQR.qrCode" />
          <div class="q-mt-sm">
            <q-chip dense color="blue-1" text-color="blue-9" icon="sell">
              {{ formatCurrency(productoQR?.precioFinal ?? 0) }}
            </q-chip>
            <q-chip
              dense
              :color="
                (productoQR?.stock ?? 0) === 0
                  ? 'grey-3'
                  : productoQR?.stockBajo
                    ? 'orange-2'
                    : 'green-2'
              "
              :text-color="
                (productoQR?.stock ?? 0) === 0
                  ? 'grey-6'
                  : productoQR?.stockBajo
                    ? 'orange-9'
                    : 'green-9'
              "
              :icon="(productoQR?.stock ?? 0) === 0 ? 'remove_circle_outline' : 'inventory_2'"
            >
              Stock: {{ productoQR?.stock ?? 0 }}
            </q-chip>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped lang="scss">
.catalogo-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.catalogo-hero__copy {
  max-width: 760px;
}

.catalogo-hero__actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
}

.catalogo-panel {
  overflow: hidden;
}

.catalogo-toolbar {
  display: grid;
  grid-template-columns:
    minmax(220px, 1.2fr) minmax(220px, 1fr) repeat(2, minmax(170px, 0.7fr))
    auto;
  align-items: center;
  gap: 12px;
}

.catalogo-toolbar__field,
.catalogo-toolbar__toggle {
  min-width: 0;
}

.catalogo-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.catalogo-summary__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--sgi-border);
  border-radius: 18px;
  background: color-mix(in srgb, var(--sgi-surface) 88%, transparent);
}

.catalogo-summary__icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--sgi-primary) 12%, transparent);
}

.catalogo-summary__value {
  color: var(--sgi-text);
  font-size: 1.05rem;
  font-weight: 800;
}

.catalogo-summary__label {
  color: var(--sgi-text-muted);
  font-size: 0.8rem;
}

.catalogo-quick-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 1270px) {
  .catalogo-toolbar {
    grid-template-columns: repeat(2, minmax(220px, 1fr));
  }

  .catalogo-toolbar__toggle {
    justify-self: start;
  }
}

@media (max-width: 768px) {
  .catalogo-hero {
    flex-direction: column;
  }

  .catalogo-hero__actions {
    width: 100%;
    justify-content: stretch;
  }

  .catalogo-hero__actions :deep(.q-btn) {
    flex: 1 1 0;
  }

  .catalogo-toolbar {
    grid-template-columns: 1fr;
  }

  .catalogo-summary {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .catalogo-summary__item {
    padding: 12px 14px;
  }
}
</style>
