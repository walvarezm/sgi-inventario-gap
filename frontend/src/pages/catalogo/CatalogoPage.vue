<template>
  <q-page class="sgi-page">
    <!-- ── Header ──────────────────────────────────────────── -->
    <div class="row items-center q-mb-lg">
      <div>
        <div class="sgi-page-title">Catálogo de Productos</div>
        <div class="text-muted text-body2 q-mt-xs">
          Precios y disponibilidad en tiempo real
        </div>
      </div>
      <q-space />
      <div class="row q-gutter-sm">
        <q-btn
          outline color="primary" icon="picture_as_pdf" label="Exportar PDF"
          size="sm" :loading="exportandoPDF" @click="exportarPDF"
        />
        <q-btn
          outline color="positive" icon="table_chart" label="Exportar Excel"
          size="sm" @click="exportarExcel"
        />
      </div>
    </div>

    <!-- ── Controles / Filtros ──────────────────────────────── -->
    <q-card class="sgi-card q-mb-md" flat>
      <q-card-section class="row items-center q-col-gutter-sm">

        <!-- Selector de sucursal (solo Admin/Supervisor) -->
        <div class="col-12 col-sm-4">
          <q-select
            v-model="sucursalSeleccionada"
            :options="opcionesSucursal"
            :label="authStore.isGlobal ? 'Sucursal' : 'Su sucursal'"
            outlined dense emit-value map-options
            :disable="!authStore.isGlobal"
            @update:model-value="onCambioSucursal"
          >
            <template #prepend><q-icon name="store" /></template>
            <template #after>
              <q-btn flat round dense icon="refresh" color="primary"
                :loading="catalogo.loading.value"
                @click="recargar">
                <q-tooltip>Recargar catálogo</q-tooltip>
              </q-btn>
            </template>
          </q-select>
        </div>

        <!-- Búsqueda -->
        <div class="col-12 col-sm-3">
          <q-input
            v-model="catalogo.busqueda.value"
            placeholder="Buscar código, marca, descripción…"
            outlined dense clearable
          >
            <template #prepend><q-icon name="search" /></template>
          </q-input>
        </div>

        <!-- Filtro categoría -->
        <div class="col-12 col-sm-3">
          <q-select
            v-model="catalogo.categoriaFiltro.value"
            :options="[{ label: 'Todas las categorías', value: null }, ...categoriaStore.options]"
            label="Categoría" outlined dense emit-value map-options
          />
        </div>

        <!-- Toggle vista -->
        <div class="col-auto">
          <q-btn-toggle
            v-model="catalogo.vistaTabla.value"
            :options="[
              { value: true,  slot: 'tabla' },
              { value: false, slot: 'tarjetas' },
            ]"
            toggle-color="primary" outline dense rounded
          >
            <template #tabla>
              <q-icon name="table_rows" /><q-tooltip>Vista tabla</q-tooltip>
            </template>
            <template #tarjetas>
              <q-icon name="grid_view" /><q-tooltip>Vista tarjetas</q-tooltip>
            </template>
          </q-btn-toggle>
        </div>

        <q-space />

        <!-- Estadísticas rápidas -->
        <div class="row q-gutter-md items-center">
          <div class="text-center">
            <div class="text-h6 text-weight-bold text-primary">
              {{ catalogo.productosFiltrados.value.length }}
            </div>
            <div class="text-caption text-muted">Productos</div>
          </div>
          <q-separator vertical inset />
          <div class="text-center">
            <div class="text-h6 text-weight-bold text-negative">
              {{ catalogo.conStockBajo.value.length }}
            </div>
            <div class="text-caption text-muted">Stock bajo</div>
          </div>
          <q-separator vertical inset />
          <div class="text-center">
            <div class="text-h6 text-weight-bold text-grey-6">
              {{ productosAgotados }}
            </div>
            <div class="text-caption text-muted">Agotados</div>
          </div>
        </div>
      </q-card-section>

      <!-- Filtro rápido de stock -->
      <q-card-section class="q-pt-none row q-gutter-sm">
        <q-chip
          v-model:selected="mostrarSoloStockBajo"
          clickable outline color="warning" icon="warning"
          label="Ver solo stock bajo"
          size="sm"
        />
        <q-chip
          v-model:selected="mostrarSoloAgotados"
          clickable outline color="grey" icon="remove_circle_outline"
          label="Ver solo agotados"
          size="sm"
        />
      </q-card-section>
    </q-card>

    <!-- ── Contenido principal ──────────────────────────────── -->
    <!-- Sin sucursal seleccionada -->
    <div v-if="!sucursalSeleccionada" class="full-width column flex-center q-pa-xl text-muted">
      <q-icon name="store" size="64px" style="opacity:0.2" class="q-mb-md" />
      <p class="text-body1">Selecciona una sucursal para ver el catálogo</p>
    </div>

    <!-- Vista tabla -->
    <CatalogoTabla
      v-else-if="catalogo.vistaTabla.value"
      :productos="productosMostrados"
      :loading="catalogo.loading.value"
      @ver-qr="verQR"
    />

    <!-- Vista tarjetas -->
    <CatalogoTarjeta
      v-else
      :productos="productosMostrados"
      :loading="catalogo.loading.value"
      @ver-qr="verQR"
    />

    <!-- ── Dialog QR ────────────────────────────────────────── -->
    <q-dialog v-model="dialogQR">
      <q-card class="sgi-card q-pa-md text-center" style="min-width:300px; max-width:360px">
        <q-card-section class="row items-center q-pb-none">
          <div>
            <div class="text-subtitle1 text-weight-bold">{{ productoQR?.sku }}</div>
            <div class="text-caption text-muted">{{ productoQR?.nombre }}</div>
          </div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section>
          <ProductoQR
            v-if="productoQR"
            :sku="productoQR.sku"
            :qr-code="productoQR.qrCode"
          />
          <div class="q-mt-sm">
            <q-chip dense color="blue-1" text-color="blue-9" icon="sell">
              {{ formatCurrency(productoQR?.precioFinal ?? 0) }}
            </q-chip>
            <q-chip
              dense
              :color="(productoQR?.stock ?? 0) === 0 ? 'grey-3' : productoQR?.stockBajo ? 'orange-2' : 'green-2'"
              :text-color="(productoQR?.stock ?? 0) === 0 ? 'grey-6' : productoQR?.stockBajo ? 'orange-9' : 'green-9'"
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

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from 'src/stores/authStore'
import { useSucursalStore } from 'src/stores/sucursalStore'
import { useCategoriaStore } from 'src/stores/categoriaStore'
import { useCataloStore } from 'src/stores/cataloStore'
import { useCatalogo } from 'src/composables/useCatalogo'
import type { ProductoCatalogo } from 'src/types'
import { formatCurrency } from 'src/utils/formatters'
import CatalogoTabla from 'src/components/catalogo/CatalogoTabla.vue'
import CatalogoTarjeta from 'src/components/catalogo/CatalogoTarjeta.vue'
import ProductoQR from 'src/components/productos/ProductoQR.vue'

// ── Stores ─────────────────────────────────────────────────────
const authStore = useAuthStore()
const sucursalStore = useSucursalStore()
const categoriaStore = useCategoriaStore()
const cataloStore = useCataloStore()
const catalogo = useCatalogo()

// ── State ──────────────────────────────────────────────────────
const sucursalSeleccionada = ref(
  authStore.isGlobal ? '' : (authStore.sucursalId ?? ''),
)
const dialogQR = ref(false)
const productoQR = ref<ProductoCatalogo | null>(null)
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

const productosMostrados = computed(() => {
  let lista = catalogo.productosFiltrados.value
  if (mostrarSoloStockBajo.value) lista = lista.filter((p) => p.stockBajo && p.stock > 0)
  if (mostrarSoloAgotados.value)  lista = lista.filter((p) => p.stock === 0)
  return lista
})

// ── Actions ────────────────────────────────────────────────────
async function cargarCatalogo(): Promise<void> {
  if (!sucursalSeleccionada.value) return
  await catalogo.cargarCatalogo(sucursalSeleccionada.value)
}

async function onCambioSucursal(): Promise<void> {
  catalogo.limpiarFiltros()
  mostrarSoloStockBajo.value = false
  mostrarSoloAgotados.value  = false
  await cargarCatalogo()
}

async function recargar(): Promise<void> {
  if (sucursalSeleccionada.value) {
    cataloStore.invalidateCache(sucursalSeleccionada.value)
    await cargarCatalogo()
  }
}

function verQR(producto: ProductoCatalogo): void {
  productoQR.value = producto
  dialogQR.value = true
}

// ── Exportación PDF ────────────────────────────────────────────
async function exportarPDF(): Promise<void> {
  exportandoPDF.value = true
  try {
    const sucursal = sucursalStore.getById(sucursalSeleccionada.value)
    const nombreSucursal = sucursal?.nombre ?? 'Sucursal'
    const fecha = new Date().toLocaleDateString('es-BO')

    const filas = productosMostrados.value
      .map((p) => `
        <tr>
          <td>${p.sku}</td>
          <td>${p.marca}</td>
          <td>${p.nombre}</td>
          <td style="text-align:right">${formatCurrency(p.precioOfrecido)}</td>
          <td style="text-align:right"><strong>${formatCurrency(p.precioFinal)}</strong></td>
          <td style="text-align:center;color:${p.stock === 0 ? '#c62828' : p.stockBajo ? '#f57f17' : '#2e7d32'}">${p.stock}</td>
        </tr>`)
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

  const encabezados = ['SKU', 'Marca', 'Nombre', 'Descripcion', 'Precio_Lista', 'Precio_Venta', 'Stock', 'Stock_Bajo']
  const filas = productosMostrados.value.map((p) => [
    p.sku, p.marca, `"${p.nombre}"`, `"${p.descripcion}"`,
    p.precioOfrecido, p.precioFinal, p.stock, p.stockBajo ? 'SI' : 'NO',
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
  await Promise.all([
    sucursalStore.items.length === 0 ? sucursalStore.fetchAll() : Promise.resolve(),
    categoriaStore.fetchAll(),
  ])

  // Si no es global, fijar sucursal y cargar
  if (!authStore.isGlobal && authStore.sucursalId) {
    sucursalSeleccionada.value = authStore.sucursalId
    await cargarCatalogo()
  } else if (authStore.isGlobal && sucursalStore.activas.length > 0 && !sucursalSeleccionada.value) {
    sucursalSeleccionada.value = sucursalStore.activas[0].id
    await cargarCatalogo()
  }
})
</script>

<style scoped lang="scss">
.catalogo-header-chip {
  font-size: 1.1rem;
  font-weight: 700;
}
</style>
