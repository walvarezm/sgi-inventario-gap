<template>
  <q-page class="sgi-page">
    <!-- Header -->
    <div class="row items-center q-mb-lg">
      <div>
        <div class="sgi-page-title">Facturación</div>
        <div class="text-muted text-body2 q-mt-xs">Historial de facturas y notas de crédito</div>
      </div>
      <q-space />
      <q-btn color="primary" unelevated icon="point_of_sale" label="Ir al POS"
        :to="{ name: 'pos' }" />
    </div>

    <!-- Filtros -->
    <q-card class="sgi-card q-mb-md" flat>
      <q-card-section class="row items-center q-col-gutter-sm">
        <div class="col-12 col-sm-3">
          <q-select
            v-model="filtroSucursal"
            :options="[{ label: 'Todas las sucursales', value: null }, ...opcionesSucursal]"
            label="Sucursal" outlined dense emit-value map-options
            :disable="!authStore.isGlobal"
          />
        </div>
        <div class="col-12 col-sm-2">
          <q-select
            v-model="filtroEstado"
            :options="opcionesEstado" label="Estado"
            outlined dense emit-value map-options clearable
          />
        </div>
        <div class="col-12 col-sm-2">
          <q-input v-model="filtroDesde" label="Desde" outlined dense type="date" />
        </div>
        <div class="col-12 col-sm-2">
          <q-input v-model="filtroHasta" label="Hasta" outlined dense type="date" />
        </div>
        <div class="col-auto">
          <q-btn color="primary" unelevated icon="search" label="Buscar"
            :loading="store.loading" @click="cargar" />
        </div>
        <q-space />
        <!-- KPIs -->
        <div class="row q-gutter-md items-center">
          <div class="text-center">
            <div class="text-h6 text-weight-bold text-primary">{{ facturas.length }}</div>
            <div class="text-caption text-muted">Facturas</div>
          </div>
          <q-separator vertical inset />
          <div class="text-center">
            <div class="text-h6 text-weight-bold text-positive">{{ formatCurrency(totalVentas) }}</div>
            <div class="text-caption text-muted">Total emitido</div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Tabla de facturas -->
    <q-card class="sgi-card" flat>
      <q-table
        :rows="facturas" :columns="columnas" :loading="store.loading"
        row-key="id" flat class="sgi-table"
        :pagination="{ rowsPerPage: 20 }"
        no-data-label="No hay facturas en el período seleccionado"
      >
        <!-- Número con tipo -->
        <template #body-cell-numero="{ row }">
          <q-td>
            <div class="text-weight-bold text-mono">{{ row.numero }}</div>
            <div class="text-caption text-muted">{{ labelTipo(row.tipo) }}</div>
          </q-td>
        </template>

        <!-- Fecha -->
        <template #body-cell-fecha="{ value }">
          <q-td>
            <div>{{ formatDate(value) }}</div>
            <div class="text-caption text-muted">{{ formatTime(value) }}</div>
          </q-td>
        </template>

        <!-- Sucursal -->
        <template #body-cell-sucursalId="{ value }">
          <q-td>{{ sucursalStore.getById(value)?.nombre ?? value }}</q-td>
        </template>

        <!-- Total -->
        <template #body-cell-total="{ value }">
          <q-td class="text-right">
            <span class="text-weight-bold text-positive">{{ formatCurrency(value) }}</span>
          </q-td>
        </template>

        <!-- Estado -->
        <template #body-cell-estado="{ value }">
          <q-td class="text-center">
            <q-chip dense size="sm"
              :color="colorEstado(value)" text-color="white"
              :label="value"
            />
          </q-td>
        </template>

        <!-- Acciones -->
        <template #body-cell-acciones="{ row }">
          <q-td class="text-right">
            <q-btn flat round dense icon="print" color="primary" size="sm"
              @click="imprimir(row.id)">
              <q-tooltip>Imprimir / PDF</q-tooltip>
            </q-btn>
            <q-btn flat round dense icon="visibility" color="teal" size="sm"
              @click="verDetalle(row)">
              <q-tooltip>Ver detalle</q-tooltip>
            </q-btn>
            <q-btn
              v-if="row.estado === 'EMITIDA' && authStore.hasRole(['ADMINISTRADOR', 'SUPERVISOR'])"
              flat round dense icon="cancel" color="negative" size="sm"
              @click="confirmarAnular(row)">
              <q-tooltip>Anular</q-tooltip>
            </q-btn>
          </q-td>
        </template>

        <template #no-data="{ message }">
          <div class="full-width column flex-center q-pa-xl text-muted">
            <q-icon name="receipt_long" size="48px" style="opacity:0.3" class="q-mb-md" />
            <span>{{ message }}</span>
          </div>
        </template>
      </q-table>
    </q-card>

    <!-- Dialog: Detalle de factura -->
    <q-dialog v-model="dialogDetalle">
      <q-card class="sgi-card" style="min-width:480px; max-width:600px">
        <q-card-section class="row items-center q-pb-none">
          <div>
            <div class="text-h6 text-weight-bold">{{ facturaDetalle?.numero }}</div>
            <div class="text-caption text-muted">{{ facturaDetalle?.cliente }}</div>
          </div>
          <q-space />
          <q-btn
            flat dense icon="print" color="primary" label="Imprimir"
            @click="imprimir(facturaDetalle?.id ?? '')"
          />
          <q-btn icon="close" flat round dense v-close-popup class="q-ml-sm" />
        </q-card-section>

        <q-card-section v-if="facturaDetalle">
          <q-table
            :rows="facturaDetalle.detalles ?? []"
            :columns="columnasDetalle"
            row-key="id" flat dense hide-bottom
          >
            <template #body-cell-subtotal="{ value }">
              <q-td class="text-right text-weight-bold">{{ formatCurrency(value) }}</q-td>
            </template>
          </q-table>

          <q-separator class="q-my-md" />
          <div class="row justify-end q-gutter-xs">
            <div style="width:280px">
              <div class="row q-mb-xs">
                <span class="text-muted">Subtotal:</span>
                <q-space />
                <span>{{ formatCurrency(facturaDetalle.subtotal) }}</span>
              </div>
              <div class="row q-mb-xs">
                <span class="text-muted">IVA:</span>
                <q-space />
                <span>{{ formatCurrency(facturaDetalle.impuesto) }}</span>
              </div>
              <div class="row text-h6 text-weight-bold">
                <span>TOTAL:</span>
                <q-space />
                <span class="text-positive">{{ formatCurrency(facturaDetalle.total) }}</span>
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import type { QTableColumn } from 'quasar'
import type { Factura, TipoFactura, EstadoFactura } from 'src/types'
import { TIPO_FACTURA_LABELS, ESTADO_FACTURA_COLOR } from 'src/types'
import { useAuthStore } from 'src/stores/authStore'
import { useSucursalStore } from 'src/stores/sucursalStore'
import { useFacturaStore } from 'src/stores/facturaStore'
import { facturaService } from 'src/services/facturaService'
import { formatCurrency, formatDate } from 'src/utils/formatters'
import { useNotify } from 'src/composables/useNotify'

const authStore = useAuthStore()
const sucursalStore = useSucursalStore()
const store = useFacturaStore()
const { notifySuccess, notifyError } = useNotify()
const $q = useQuasar()

const facturas = ref<Factura[]>([])
const filtroSucursal = ref<string | null>(authStore.isGlobal ? null : authStore.sucursalId)
const filtroEstado = ref<string | null>(null)
const filtroDesde = ref('')
const filtroHasta = ref('')
const dialogDetalle = ref(false)
const facturaDetalle = ref<Factura | null>(null)

const opcionesSucursal = computed(() =>
  sucursalStore.activas.map((s) => ({ label: s.nombre, value: s.id })),
)
const opcionesEstado = [
  { label: 'Emitidas', value: 'EMITIDA' },
  { label: 'Anuladas', value: 'ANULADA' },
]

const totalVentas = computed(() =>
  facturas.value.filter((f) => f.estado === 'EMITIDA').reduce((s, f) => s + f.total, 0),
)

const columnas: QTableColumn[] = [
  { name: 'numero',     label: 'Número',    field: 'numero',    align: 'left',  sortable: true },
  { name: 'fecha',      label: 'Fecha',     field: 'fecha',     align: 'left',  sortable: true },
  { name: 'cliente',    label: 'Cliente',   field: 'cliente',   align: 'left' },
  { name: 'sucursalId', label: 'Sucursal',  field: 'sucursalId',align: 'left' },
  { name: 'total',      label: 'Total',     field: 'total',     align: 'right', sortable: true },
  { name: 'estado',     label: 'Estado',    field: 'estado',    align: 'center', sortable: true },
  { name: 'acciones',   label: 'Acciones',  field: 'id',        align: 'right' },
]

const columnasDetalle: QTableColumn[] = [
  { name: 'productoSku',    label: 'SKU',       field: 'productoSku',    align: 'left' },
  { name: 'productoNombre', label: 'Producto',  field: 'productoNombre', align: 'left' },
  { name: 'cantidad',       label: 'Cant.',     field: 'cantidad',       align: 'center' },
  { name: 'precioUnitario', label: 'P. Unit.',  field: 'precioUnitario',
    align: 'right', format: (v) => formatCurrency(v) },
  { name: 'subtotal',       label: 'Subtotal',  field: 'subtotal',       align: 'right' },
]

function labelTipo(tipo: TipoFactura): string { return TIPO_FACTURA_LABELS[tipo] ?? tipo }
function colorEstado(estado: EstadoFactura): string { return ESTADO_FACTURA_COLOR[estado] ?? 'grey' }

function formatTime(iso: string): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat('es-BO', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

async function cargar(): Promise<void> {
  store.loading = true
  try {
    facturas.value = await facturaService.getAll({
      sucursalId: filtroSucursal.value ?? undefined,
      estado: filtroEstado.value ?? undefined,
      desde: filtroDesde.value || undefined,
      hasta: filtroHasta.value || undefined,
    })
  } catch (e) {
    notifyError((e as Error).message)
  } finally {
    store.loading = false
  }
}

async function imprimir(id: string): Promise<void> {
  if (!id) return
  await store.imprimirFactura(id)
}

async function verDetalle(factura: Factura): Promise<void> {
  try {
    facturaDetalle.value = await facturaService.getById(factura.id)
    dialogDetalle.value = true
  } catch (e) { notifyError((e as Error).message) }
}

function confirmarAnular(factura: Factura): void {
  $q.dialog({
    title: 'Anular factura',
    message: `¿Anular la factura <strong>${factura.numero}</strong>? Se revertirá el inventario.`,
    html: true,
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Anular', color: 'negative', unelevated: true },
  }).onOk(async () => {
    try {
      await store.anular(factura.id)
      notifySuccess(`Factura ${factura.numero} anulada`)
      const idx = facturas.value.findIndex((f) => f.id === factura.id)
      if (idx !== -1) facturas.value[idx] = { ...facturas.value[idx], estado: 'ANULADA' }
    } catch (e) { notifyError((e as Error).message) }
  })
}

onMounted(async () => {
  if (sucursalStore.items.length === 0) await sucursalStore.fetchAll()
  await cargar()
})
</script>
