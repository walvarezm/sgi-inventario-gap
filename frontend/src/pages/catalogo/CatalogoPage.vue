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
import { formatDateTime } from 'src/utils/formatters'
import CatalogoEditDialog from 'src/components/catalogo/CatalogoEditDialog.vue'
import CatalogoTabla from 'src/components/catalogo/CatalogoTabla.vue'
import CatalogoTarjeta from 'src/components/catalogo/CatalogoTarjeta.vue'
import CatalogoStatCard from 'src/components/catalogo/CatalogoStatCard.vue'
import SucursalSwitcher from 'src/components/catalogo/SucursalSwitcher.vue'
import ProductoQR from 'src/components/productos/ProductoQR.vue'
import { useMarcaStore } from 'src/stores/marcaStore'
import { useNotify } from 'src/composables/useNotify'
import ProductoViewImage from 'src/components/productos/ProductoViewImage.vue'
import { TODAS_LAS_SUCURSALES } from 'src/composables/useSucursalCatalog'
import { useSucursalActivaStore } from 'src/stores/sucursalActiva.ts'

// ── Stores ─────────────────────────────────────────────────────
const authStore = useAuthStore()
const sucursalStore = useSucursalStore()
const sucursalActivaStore = useSucursalActivaStore()
const categoriaStore = useCategoriaStore()
const marcaStore = useMarcaStore()
const cataloStore = useCataloStore()
const catalogo = useCatalogo()
const $q = useQuasar()
const { notifyWarning } = useNotify()

// ── State ──────────────────────────────────────────────────────
const sucursalSeleccionada = ref<string>(authStore.isGlobal ? '' : (authStore.sucursalId ?? ''))
const dialogViewImage = ref(false)
const dialogQR = ref(false)
const dialogEditarProducto = ref(false)
const dialogFiltros = ref(false)
const productoQR = ref<ProductoCatalogo | null>(null)
const productoEditar = ref<ProductoCatalogo | null>(null)
const mostrarSoloStockBajo = ref(false)
const mostrarSoloAgotados = ref(false)
const exportandoPDF = ref(false)
const lastUpdated = ref<Date | null>(null)

// ── Computed ───────────────────────────────────────────────────
const opcionesSucursal = computed(() =>
  sucursalStore.activas.map((s) => ({ label: s.nombre, value: s.id })),
)

const sucursalSeleccionadaActiva = computed(() => sucursalActivaStore.sucursalId)
const sucursalActiva = computed(() =>
  sucursalSeleccionada.value && sucursalSeleccionada.value !== TODAS_LAS_SUCURSALES
    ? sucursalStore.getById(sucursalSeleccionada.value)
    : null,
)

const esVistaGlobal = computed(() => sucursalSeleccionada.value === TODAS_LAS_SUCURSALES)

const productosEnStock = computed(() => {
  const base = catalogo.productosFiltrados.value
  if (esVistaGlobal.value) {
    return base.filter((p) => p.stock > 0 && !p.stockBajo).length
  }
  return base.filter(
    (p) => p.sucursalId === sucursalSeleccionada.value && p.stock > 0 && !p.stockBajo,
  ).length
})

const productosMostrados = computed(() => {
  let lista = catalogo.productosFiltrados.value

  if (!esVistaGlobal.value) {
    lista = lista.filter((p) => p.sucursalId === sucursalSeleccionada.value)
  }
  if (mostrarSoloStockBajo.value) {
    lista = lista.filter((p) => p.stockBajo && p.stock > 0)
  }
  if (mostrarSoloAgotados.value) {
    lista = lista.filter((p) => p.stock === 0)
  }
  return lista
})

const productosStockBajo = computed(() => {
  const base = catalogo.productosFiltrados.value
  if (esVistaGlobal.value) {
    return base.filter((p) => p.stockBajo && p.stock > 0).length
  }
  return base.filter(
    (p) => p.stockBajo && p.stock > 0 && p.sucursalId === sucursalSeleccionada.value,
  ).length
})

const productosAgotados = computed(() => {
  const base = catalogo.productosFiltrados.value
  if (esVistaGlobal.value) {
    return base.filter((p) => p.stock === 0).length
  }
  return base.filter((p) => p.stock === 0 && p.sucursalId === sucursalSeleccionada.value).length
})

const filtrosActivosCount = computed(() => {
  let n = 0
  if (catalogo.busqueda.value) n++
  if (catalogo.categoriaFiltro.value) n++
  if (catalogo.marcaFiltro.value) n++
  if (mostrarSoloStockBajo.value) n++
  if (mostrarSoloAgotados.value) n++
  //if (esVistaGlobal.value) n++
  return n
})

const esMovil = computed(() => $q.screen.lt.md)
const vistaActivaEsTabla = computed(() => catalogo.vistaTabla.value)
//const vistaActivaEsTabla = computed(() => !esMovil.value && catalogo.vistaTabla.value)
const puedeCambiarVista = computed(() => !esMovil.value)

const showFiltersAndStats = computed(
  () => !!sucursalSeleccionada.value && productosMostrados.value.length > 0,
)

const showSkeleton = computed(
  () =>
    !!sucursalSeleccionada.value &&
    !esVistaGlobal.value &&
    catalogo.loading.value &&
    productosMostrados.value.length === 0,
)

const showGlobalSkeleton = computed(
  () =>
    esVistaGlobal.value && catalogo.loading.value && catalogo.productosFiltrados.value.length === 0,
)

/** Habilita el cambio de sucursal a admin/supervisor o usuarios con permiso `sucursales.ver`. */
const puedeCambiarSucursal = computed(() => authStore.isGlobal || authStore.can('sucursales.ver'))

// ── Actions ────────────────────────────────────────────────────
async function cargarCatalogo(): Promise<void> {
  if (!sucursalSeleccionada.value) return
  await catalogo.cargarCatalogo(sucursalSeleccionada.value)
  lastUpdated.value = new Date()
}

async function cargarCatalogoForzado(): Promise<void> {
  if (!sucursalSeleccionada.value) return
  await catalogo.cargarCatalogo(sucursalSeleccionada.value, true)
  lastUpdated.value = new Date()
}

async function onCambioSucursal(id: string): Promise<void> {
  // El switcher entrega la nueva id; el ref ya está actualizado.
  catalogo.limpiarFiltros()
  mostrarSoloStockBajo.value = false
  mostrarSoloAgotados.value = false
  if (id === TODAS_LAS_SUCURSALES) {
    // Cargar el catálogo de la primera sucursal para tener datos; el filtrado
    // en `productosMostrados` ignora la sucursal cuando estamos en vista global.
    const primera = sucursalStore.activas[0]
    if (primera) {
      await catalogo.cargarCatalogo(primera.id)
      lastUpdated.value = new Date()
    }
    return
  }
  await cargarCatalogo()
}

async function recargar(): Promise<void> {
  if (!sucursalSeleccionada.value) return
  if (sucursalSeleccionada.value === TODAS_LAS_SUCURSALES) {
    // Refrescar todas las sucursales cacheadas.
    for (const s of sucursalStore.activas) {
      cataloStore.invalidateCache(s.id)
      await catalogo.cargarCatalogo(s.id, true)
    }
    lastUpdated.value = new Date()
    return
  }
  cataloStore.invalidateCache(sucursalSeleccionada.value)
  await cargarCatalogoForzado()
}

function limpiarFiltros(): void {
  catalogo.limpiarFiltros()
  mostrarSoloStockBajo.value = false
  mostrarSoloAgotados.value = false
}

function toggleStockBajo(): void {
  mostrarSoloStockBajo.value = !mostrarSoloStockBajo.value
  if (mostrarSoloStockBajo.value) mostrarSoloAgotados.value = false
}

function toggleAgotados(): void {
  mostrarSoloAgotados.value = !mostrarSoloAgotados.value
  if (mostrarSoloAgotados.value) mostrarSoloStockBajo.value = false
}

function openDialogViewImage(p: ProductoCatalogo): void {
  if (!p.imagenUrl) {
    notifyWarning('Producto Sin Imagen', 'top')
    return
  }
  productoQR.value = p
  dialogViewImage.value = true
}

function closeDialogViewImage(): void {
  productoQR.value = null
  dialogViewImage.value = false
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

const canExport = computed(
  () => authStore.can('catalogo.ver_boton_exportar') && productosMostrados.value.length > 0,
)

// ── Lifecycle ──────────────────────────────────────────────────
onMounted(async () => {
  if (sucursalStore.items.length === 0) await sucursalStore.fetchAll()
  if (categoriaStore.items.length === 0) await categoriaStore.fetchAll()
  if (marcaStore.items.length === 0) await marcaStore.fetchAll()

  if (!authStore.isGlobal && authStore.sucursalId) {
    sucursalSeleccionada.value = authStore.sucursalId
  } else {
    sucursalSeleccionada.value = sucursalSeleccionadaActiva.value
  }
  await cargarCatalogo()
})

watch(
  sucursalSeleccionadaActiva,
  async (sucursalId) => {
    //if (sucursalId) {

    console.log('sucursalSeleccionadaActiva', sucursalId)
    sucursalSeleccionada.value = sucursalId
    await onCambioSucursal(sucursalId)
    //await cargarCatalogo()
    //}
  },
  { immediate: true },
)

watch(esMovil, (movil) => {
  if (movil) {
    catalogo.vistaTabla.value = false
  } else {
    catalogo.vistaTabla.value = true
  }
})

watch(sucursalSeleccionada, (sucursalId) => {
  catalogo.sucursalFiltro.value =
    sucursalId && sucursalId !== TODAS_LAS_SUCURSALES ? sucursalId : null
})
</script>

<template>
  <q-page class="sgi-page catalogo-page">
    <!-- ── HERO ───────────────────────────────────────────── -->
    <header class="catalogo-hero">
      <div class="catalogo-hero__copy">
        <!--        <div class="catalogo-hero__eyebrow">
          <q-icon name="menu_book" size="14px" />
          <span>Catálogo</span>
        </div>-->
        <h1 class="catalogo-hero__title">Catálogo de Productos</h1>
        <div class="catalogo-hero__meta">
          <span class="catalogo-hero__meta-item catalogo-hero__meta-item--muted">
            <q-icon :name="esVistaGlobal ? 'public' : 'store'" size="14px" />
            <span v-if="esVistaGlobal">
              Vista global —
              <strong>{{ productosMostrados.length }}</strong>
              productos de todas las sucursales
            </span>
            <span v-else>
              Catálogo de
              <strong>{{ sucursalActiva?.nombre ?? 'sucursal seleccionada' }}</strong>
            </span>
          </span>
          <span v-if="lastUpdated" class="catalogo-hero__meta-item catalogo-hero__meta-item--muted">
            <q-icon name="schedule" size="14px" />
            <span>Actualizado {{ formatDateTime(lastUpdated.toISOString()) }}</span>
          </span>
        </div>
      </div>

      <div class="catalogo-hero__actions">
        <!--        <SucursalSwitcher
          v-if="sucursalStore.activas.length > 0"
          v-model="sucursalSeleccionada"
          :size="esMovil ? 'sm' : 'md'"
          @change="onCambioSucursal"
        />-->

        <q-btn
          v-if="canExport"
          outline
          color="negative"
          icon="picture_as_pdf"
          :label="esMovil ? '' : 'Exportar PDF'"
          :size="esMovil ? 'sm' : 'md'"
          no-caps
          :loading="exportandoPDF"
          class="catalogo-hero__btn"
          @click="exportarPDF"
        />
        <q-btn
          v-if="canExport"
          outline
          color="positive"
          icon="table_chart"
          :label="esMovil ? '' : 'Exportar Excel'"
          :size="esMovil ? 'sm' : 'md'"
          no-caps
          class="catalogo-hero__btn"
          @click="exportarExcel"
        />
        <q-btn
          v-if="esMovil && !!sucursalSeleccionada"
          unelevated
          color="primary"
          icon="tune"
          :label="esMovil ? '' : 'Filtros'"
          :size="esMovil ? 'sm' : 'md'"
          no-caps
          class="catalogo-hero__btn"
          @click="dialogFiltros = true"
        >
          <q-badge v-if="filtrosActivosCount > 0" color="negative" floating>
            {{ filtrosActivosCount }}
          </q-badge>
        </q-btn>
        <q-btn
          v-if="!!sucursalSeleccionada"
          unelevated
          color="primary"
          icon="refresh"
          :label="esMovil ? '' : 'Recargar'"
          :size="esMovil ? 'sm' : 'md'"
          no-caps
          :loading="catalogo.loading.value"
          class="catalogo-hero__btn"
          @click="recargar"
        >
          <q-tooltip v-if="esMovil">Recargar</q-tooltip>
        </q-btn>
      </div>
    </header>

    <!-- ── SUCURSAL SELECTOR (when none selected) ──────────── -->
    <section v-if="!sucursalSeleccionada" class="catalogo-sucursal-prompt sgi-card">
      <div class="catalogo-sucursal-prompt__art">
        <q-icon name="store" size="56px" />
      </div>
      <h2 class="catalogo-sucursal-prompt__title">Selecciona una sucursal</h2>
      <p class="catalogo-sucursal-prompt__text">
        El catálogo muestra precios y stock específicos de cada sucursal. Comienza eligiendo una.
      </p>
      <q-select
        v-if="!puedeCambiarSucursal && authStore.sucursalId"
        :model-value="authStore.sucursalId"
        :options="opcionesSucursal"
        label="Tu sucursal"
        outlined
        dense
        emit-value
        map-options
        disable
        class="catalogo-sucursal-prompt__select"
      >
        <template #prepend><q-icon name="store" /></template>
      </q-select>
      <div v-else class="catalogo-sucursal-prompt__hint">
        Usa el selector
        <q-icon name="store" size="14px" />
        <strong>Sucursal</strong>
        en la parte superior para elegir.
      </div>
    </section>

    <!-- ── STATS ──────────────────────────────────────────── -->
    <section
      v-if="showFiltersAndStats || showSkeleton"
      class="catalogo-stats"
      aria-label="Resumen del catálogo"
    >
      <CatalogoStatCard
        icon="inventory_2"
        tone="primary"
        :value="productosMostrados.length"
        :active="!mostrarSoloStockBajo && !mostrarSoloAgotados"
        :label="'Total productos (' + catalogo.productosFiltrados.value.length + ')'"
        :loading="showSkeleton"
        @click="
          () => {
            mostrarSoloStockBajo = false
            mostrarSoloAgotados = false
          }
        "
      />
      <CatalogoStatCard
        icon="check_circle"
        tone="positive"
        :value="productosEnStock"
        label="En stock"
        :loading="showSkeleton"
        @click="
          () => {
            mostrarSoloStockBajo = false
            mostrarSoloAgotados = false
          }
        "
      />
      <CatalogoStatCard
        icon="warning_amber"
        tone="warning"
        :value="productosStockBajo"
        :active="mostrarSoloStockBajo"
        :label="mostrarSoloStockBajo ? 'Filtrando: stock bajo' : 'Stock bajo'"
        :loading="showSkeleton"
        @click="toggleStockBajo"
      />
      <CatalogoStatCard
        icon="remove_circle"
        tone="negative"
        :value="productosAgotados"
        :active="mostrarSoloAgotados"
        :label="mostrarSoloAgotados ? 'Filtrando: agotados' : 'Agotados'"
        :loading="showSkeleton"
        @click="toggleAgotados"
      />
    </section>

    <!-- ── FILTERS (desktop) ──────────────────────────────── -->
    <q-card v-if="!!sucursalSeleccionada && !esMovil" class="sgi-card catalogo-toolbar" flat>
      <div class="catalogo-toolbar__row">
        <div class="catalogo-toolbar__search">
          <q-icon name="search" size="20px" class="catalogo-toolbar__search-icon" />
          <input
            v-model="catalogo.busqueda.value"
            class="catalogo-toolbar__search-input"
            type="text"
            placeholder="Buscar por SKU, marca o nombre…"
          />
          <button
            v-if="catalogo.busqueda.value"
            type="button"
            class="catalogo-toolbar__search-clear"
            aria-label="Limpiar búsqueda"
            @click="catalogo.busqueda.value = ''"
          >
            <q-icon name="close" size="16px" />
          </button>
        </div>

        <q-select
          v-model="catalogo.categoriaFiltro.value"
          :options="[{ label: 'Todas las categorías', value: null }, ...categoriaStore.options]"
          label="Categoría"
          outlined
          dense
          emit-value
          map-options
          clearable
          class="catalogo-toolbar__field"
        >
          <template #prepend><q-icon name="category" /></template>
        </q-select>

        <q-select
          v-model="catalogo.marcaFiltro.value"
          :options="[{ label: 'Todas las marcas', value: null }, ...marcaStore.optionsName]"
          label="Marca"
          outlined
          dense
          emit-value
          map-options
          clearable
          class="catalogo-toolbar__field"
        >
          <template #prepend><q-icon name="copyright" /></template>
        </q-select>

        <q-btn
          v-if="filtrosActivosCount > 0"
          outline
          rounded
          color="negative"
          icon="filter_alt_off"
          label="Limpiar"
          no-caps
          size="sm"
          class="catalogo-toolbar__clear"
          @click="limpiarFiltros"
        >
          <q-badge v-if="filtrosActivosCount > 0" color="negative" floating>
            {{ filtrosActivosCount }}
          </q-badge>
        </q-btn>

        <!--        <q-space />-->

        <q-btn-toggle
          v-if="puedeCambiarVista"
          v-model="catalogo.vistaTabla.value"
          :options="[
            { value: true, slot: 'tabla' },
            { value: false, slot: 'tarjetas' },
          ]"
          unelevated
          toggle-color="primary"
          color="grey-3"
          text-color="grey-7"
          rounded
          no-caps
          class="catalogo-toolbar__view"
        >
          <template #tabla>
            <div class="row items-center no-wrap q-gutter-xs q-px-sm q-py-xs">
              <q-icon name="table_rows" size="16px" />
              <span class="text-caption">Tabla</span>
            </div>
          </template>
          <template #tarjetas>
            <div class="row items-center no-wrap q-gutter-xs q-px-sm q-py-xs">
              <q-icon name="grid_view" size="16px" />
              <span class="text-caption">Tarjetas</span>
            </div>
          </template>
        </q-btn-toggle>
      </div>

      <div v-if="false" class="catalogo-toolbar__chips">
        <span class="catalogo-toolbar__chip-info">
          <q-icon :name="esVistaGlobal ? 'public' : 'store'" size="14px" />
          <span v-if="esVistaGlobal">
            Vista global —
            <strong>{{ productosMostrados.length }}</strong>
            productos de todas las sucursales
          </span>
          <span v-else>
            Mostrando catálogo de
            <strong>{{ sucursalActiva?.nombre ?? 'sucursal seleccionada' }}</strong>
          </span>
        </span>
      </div>
    </q-card>

    <!-- ── CONTENT (mobile skeleton) ──────────────────────── -->
    <div v-if="showSkeleton || showGlobalSkeleton" class="catalogo-grid-skeleton">
      <div v-for="n in 6" :key="`sk-${n}`" class="catalogo-grid-skeleton__item">
        <q-skeleton height="100%" square />
      </div>
    </div>
    <!-- ── CONTENT (table or cards) ───────────────────────── -->
    <CatalogoTabla
      v-else-if="!!sucursalSeleccionada && vistaActivaEsTabla"
      :productos="productosMostrados"
      :loading="catalogo.loading.value"
      :show-sucursal-column="esVistaGlobal"
      @ver-image="openDialogViewImage"
      @ver-qr="verQR"
      @editar="abrirEdicion"
    />

    <CatalogoTarjeta
      v-else-if="!!sucursalSeleccionada"
      :productos="productosMostrados"
      :loading="catalogo.loading.value"
      :show-sucursal-column="esVistaGlobal"
      @ver-image="openDialogViewImage"
      @ver-qr="verQR"
      @editar="abrirEdicion"
    />

    <!-- ── FILTERS (mobile drawer) ────────────────────────── -->
    <q-dialog v-if="esMovil" v-model="dialogFiltros" position="bottom">
      <q-card class="catalogo-filtros-sheet">
        <q-card-section class="catalogo-filtros-sheet__head">
          <h3 class="catalogo-filtros-sheet__title">Filtros y búsqueda</h3>
          <q-space />
          <q-btn
            v-if="filtrosActivosCount > 0"
            outline
            rounded
            color="negative"
            label="Limpiar"
            no-caps
            size="sm"
            @click="limpiarFiltros"
          />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section class="catalogo-filtros-sheet__body">
          <q-input
            v-model="catalogo.busqueda.value"
            placeholder="Buscar por SKU, marca o nombre…"
            outlined
            dense
            clearable
            class="q-mb-md"
          >
            <template #prepend><q-icon name="search" /></template>
          </q-input>
          <q-select
            v-model="catalogo.categoriaFiltro.value"
            :options="[{ label: 'Todas las categorías', value: null }, ...categoriaStore.options]"
            label="Categoría"
            outlined
            dense
            emit-value
            map-options
            clearable
            class="q-mb-md"
          />
          <q-select
            v-model="catalogo.marcaFiltro.value"
            :options="[{ label: 'Todas las marcas', value: null }, ...marcaStore.optionsName]"
            label="Marca"
            outlined
            dense
            emit-value
            map-options
            clearable
          />
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- ── MODALS ─────────────────────────────────────────── -->
    <ProductoViewImage
      :is-open="dialogViewImage"
      :producto="productoQR"
      @cancelled="closeDialogViewImage"
    />

    <q-dialog v-model="dialogEditarProducto" persistent transition-show="jump-up">
      <CatalogoEditDialog
        :producto="productoEditar"
        @saved="onProductoEditado"
        @cancelled="dialogEditarProducto = false"
      />
    </q-dialog>

    <q-dialog v-model="dialogQR" transition-show="jump-up">
      <q-card class="sgi-card catalogo-qr-dialog">
        <q-card-section class="catalogo-qr-dialog__head">
          <div>
            <div class="text-overline text-muted">Código QR</div>
            <div class="text-h6 text-weight-bold">{{ productoQR?.sku }}</div>
            <div class="text-caption text-muted product-name-with-ellipsis">
              {{ productoQR?.nombre }}
            </div>
          </div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section>
          <ProductoQR v-if="productoQR" :sku="productoQR.sku" :qr-code="productoQR.qrCode" />
          <div class="catalogo-qr-dialog__chips">
            <q-chip dense color="primary" text-color="white" icon="sell">
              {{ formatCurrency(productoQR?.precioOfrecido ?? 0) }}
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
                  ? 'grey-7'
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
.catalogo-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

// ── Hero ───────────────────────────────────────────────────────
.catalogo-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
  padding: 22px 24px;
  border-radius: 18px;
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--sgi-primary) 6%, transparent),
      transparent 60%
    ),
    var(--sgi-surface-soft);
  border: 1px solid var(--sgi-border);
  box-shadow: 0 6px 18px rgba(15, 23, 40, 0.05);
}

.catalogo-hero__copy {
  flex: 1;
  min-width: 240px;
}

.catalogo-hero__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--sgi-primary) 12%, transparent);
  color: var(--sgi-primary);
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 10px;
}

.catalogo-hero__title {
  margin: 0 0 8px;
  font-size: clamp(1.5rem, 2.2vw, 2.1rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--sgi-text);
  line-height: 1.05;
}

.catalogo-hero__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  font-size: 0.85rem;
  color: var(--sgi-text);
}

.catalogo-hero__meta-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.catalogo-hero__meta-item--muted {
  color: var(--sgi-text-muted);
}

.catalogo-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.catalogo-hero__btn {
  font-weight: 600;
}

// ── Sucursal prompt ────────────────────────────────────────────
.catalogo-sucursal-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 56px 24px;
  gap: 10px;
  border-radius: 18px;
}

.catalogo-sucursal-prompt__art {
  width: 96px;
  height: 96px;
  display: grid;
  place-items: center;
  border-radius: 24px;
  background: color-mix(in srgb, var(--sgi-primary) 10%, transparent);
  color: var(--sgi-primary);
  margin-bottom: 12px;
}

.catalogo-sucursal-prompt__title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--sgi-text);
}

.catalogo-sucursal-prompt__text {
  margin: 0 0 16px;
  color: var(--sgi-text-muted);
  max-width: 360px;
}

.catalogo-sucursal-prompt__select {
  width: 100%;
  max-width: 320px;
}

// ── Stats ──────────────────────────────────────────────────────
.catalogo-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

@media (max-width: 900px) {
  .catalogo-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .catalogo-stats {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
}

// ── Toolbar (filters) ──────────────────────────────────────────
.catalogo-toolbar {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 18px;
  border-radius: 16px;
}

.catalogo-toolbar__row {
  display: grid;
  grid-template-columns: minmax(240px, 1.6fr) minmax(170px, 1fr) minmax(170px, 1fr) auto auto;
  align-items: center;
  gap: 12px;
}

.catalogo-toolbar__search {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  height: 40px;
  border-radius: 10px;
  background: var(--sgi-surface);
  border: 1px solid var(--sgi-border);
  transition:
    border-color 200ms ease,
    box-shadow 200ms ease;
}

.catalogo-toolbar__search:focus-within {
  border-color: color-mix(in srgb, var(--sgi-primary) 45%, var(--sgi-border));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--sgi-primary) 12%, transparent);
}

.catalogo-toolbar__search-icon {
  color: var(--sgi-text-muted);
  flex-shrink: 0;
}

.catalogo-toolbar__search-input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--sgi-text);
  font: inherit;
  font-size: 0.9rem;
  padding: 0;
}

.catalogo-toolbar__search-input::placeholder {
  color: var(--sgi-text-muted);
}

.catalogo-toolbar__search-clear {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 6px;
  background: color-mix(in srgb, var(--sgi-text-muted) 14%, transparent);
  color: var(--sgi-text-muted);
  cursor: pointer;
  flex-shrink: 0;
  transition:
    background 150ms ease,
    color 150ms ease;
}

.catalogo-toolbar__search-clear:hover {
  background: color-mix(in srgb, var(--sgi-negative) 22%, transparent);
  color: var(--sgi-negative);
}

.catalogo-toolbar__field {
  min-width: 0;
}

.catalogo-toolbar__clear {
  font-weight: 600;
}

.catalogo-toolbar__view {
  flex-shrink: 0;
}

.catalogo-toolbar__chips {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding-top: 6px;
  border-top: 1px dashed var(--sgi-border);
}

.catalogo-toolbar__chip-info {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--sgi-text-muted);
  font-size: 0.8rem;
  margin-left: auto;
}

@media (max-width: 1100px) {
  .catalogo-toolbar__row {
    grid-template-columns: minmax(200px, 1fr) minmax(150px, 1fr) auto;
  }
  .catalogo-toolbar__row :nth-child(2),
  .catalogo-toolbar__row :nth-child(3) {
    grid-column: span 1;
  }
}

// ── Chip variants ──────────────────────────────────────────────
.sgi-chip {
  border-radius: 999px !important;
  font-weight: 600;
  letter-spacing: 0.01em;
}

:deep(.sgi-chip--active-primary) {
  background: color-mix(in srgb, var(--sgi-primary) 18%, transparent) !important;
  color: var(--sgi-primary) !important;
  border-color: color-mix(in srgb, var(--sgi-primary) 40%, var(--sgi-border)) !important;
}

// ── Skeleton grid ──────────────────────────────────────────────
.catalogo-grid-skeleton {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 18px;
}

.catalogo-grid-skeleton__item {
  height: 280px;
  border-radius: 16px;
  overflow: hidden;
  background: var(--sgi-surface-soft);
  border: 1px solid var(--sgi-border);
}

// ── QR dialog ──────────────────────────────────────────────────
.catalogo-qr-dialog {
  width: 100%;
  max-width: 420px;
  border-radius: 18px !important;
  overflow: hidden;
}

.catalogo-qr-dialog__head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.catalogo-qr-dialog__chips {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

// ── Filtros sheet (mobile) ─────────────────────────────────────
.catalogo-filtros-sheet {
  width: 100%;
  max-width: 480px;
  border-radius: 18px 18px 0 0 !important;
  padding-bottom: env(safe-area-inset-bottom, 0);
}

.catalogo-filtros-sheet__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 18px 6px;
}

.catalogo-filtros-sheet__title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--sgi-text);
}

.catalogo-filtros-sheet__body {
  padding: 14px 18px 22px;
}

// ── Mobile hero adjustments ────────────────────────────────────
@media (max-width: 720px) {
  .catalogo-hero {
    padding: 18px;
  }

  .catalogo-hero__actions {
    width: 100%;
  }

  .catalogo-hero__btn {
    flex: 1 1 0;
    min-width: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .catalogo-toolbar__search,
  .catalogo-toolbar__search-clear,
  .catalogo-hero__btn {
    transition: none;
  }
}
</style>
