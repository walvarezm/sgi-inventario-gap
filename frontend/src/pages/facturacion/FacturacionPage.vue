<template>
  <q-page class="sgi-page">
    <div class="row items-center q-mb-lg">
      <div>
        <div class="sgi-page-title">Documentos de venta</div>
        <div class="text-muted text-body2 q-mt-xs">
          Historial de facturas, ventas, proformas y cotizaciones
        </div>
      </div>
      <q-space />
      <q-btn
        color="primary"
        unelevated
        icon="point_of_sale"
        label="Ir al POS"
        :to="{ name: 'pos' }"
      />
    </div>

    <q-card class="sgi-card q-mb-md" flat>
      <q-expansion-item
        icon="tune"
        label="Filtros y búsqueda"
        caption="Sucursal, tipo, estado y rango de fechas"
        expand-separator
        :default-opened="!esMovil"
        header-class="sgi-filter-toggle"
      >
        <q-card-section class="row items-center q-col-gutter-sm sgi-filter-body">
          <div class="col-12 col-sm-2">
            <q-select
              v-model="filtroSucursal"
              :options="[{ label: 'Todas las sucursales', value: null }, ...opcionesSucursal]"
              label="Sucursal"
              outlined
              dense
              emit-value
              map-options
              :disable="!authStore.isGlobal"
            />
          </div>
          <div class="col-12 col-sm-2">
            <q-select
              v-model="filtroTipo"
              :options="opcionesTipo"
              label="Tipo"
              outlined
              dense
              emit-value
              map-options
              clearable
            />
          </div>
          <div class="col-12 col-sm-2">
            <q-select
              v-model="filtroEstado"
              :options="opcionesEstado"
              label="Estado"
              outlined
              dense
              emit-value
              map-options
              clearable
            />
          </div>
          <div class="col-12 col-sm-2">
            <q-input v-model="filtroDesde" label="Desde" outlined dense type="date" />
          </div>
          <div class="col-12 col-sm-2">
            <q-input v-model="filtroHasta" label="Hasta" outlined dense type="date" />
          </div>
          <div class="col-auto">
            <q-btn
              color="primary"
              unelevated
              icon="search"
              label="Buscar"
              :loading="store.loading"
              @click="cargar"
            />
          </div>
        </q-card-section>
      </q-expansion-item>
    </q-card>

    <q-card class="sgi-card" flat>
      <q-table
        :rows="documentos"
        :columns="columnas"
        :loading="store.loading"
        row-key="id"
        flat
        class="sgi-table"
        :pagination="{ rowsPerPage: 20 }"
        no-data-label="No hay documentos en el período seleccionado"
      >
        <template #body-cell-numero="{ row }">
          <q-td>
            <div class="text-weight-bold text-mono">{{ row.numero }}</div>
            <div class="text-caption text-muted">{{ labelTipo(row.tipo) }}</div>
          </q-td>
        </template>

        <template #body-cell-fecha="{ value }">
          <q-td>
            <div>{{ formatDate(value) }}</div>
            <div class="text-caption text-muted">{{ formatTime(value) }}</div>
          </q-td>
        </template>

        <template #body-cell-sucursalId="{ value }">
          <q-td>{{ sucursalStore.getById(value)?.nombre ?? value }}</q-td>
        </template>

        <template #body-cell-total="{ value }">
          <q-td class="text-right">
            <span class="text-weight-bold text-positive">{{ formatCurrency(value) }}</span>
          </q-td>
        </template>

        <template #body-cell-estado="{ value }">
          <q-td class="text-center">
            <q-chip dense size="sm" :color="colorEstado(value)" text-color="white" :label="value" />
          </q-td>
        </template>

        <template #body-cell-acciones="{ row }">
          <q-td class="text-right">
            <q-btn
              flat
              round
              dense
              icon="print"
              color="primary"
              size="sm"
              @click="imprimir(row.id)"
            >
              <q-tooltip>Imprimir / PDF</q-tooltip>
            </q-btn>
            <q-btn
              flat
              round
              dense
              icon="visibility"
              color="teal"
              size="sm"
              :loading="store.loading"
              @click="verDetalle(row)"
            >
              <q-tooltip>Ver detalle</q-tooltip>
            </q-btn>
            <q-btn
              v-if="puedeConvertir(row)"
              flat
              round
              dense
              icon="published_with_changes"
              color="amber-8"
              size="sm"
              @click="abrirConversion(row)"
            >
              <q-tooltip>Convertir en venta</q-tooltip>
            </q-btn>
            <q-btn
              v-if="row.estado === 'EMITIDA' && puedeAnular"
              flat
              round
              dense
              icon="cancel"
              color="negative"
              size="sm"
              @click="confirmarAnular(row)"
            >
              <q-tooltip>Anular</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <q-dialog v-model="dialogDetalle">
      <q-card class="sgi-card" style="min-width: 680px; max-width: 850px">
        <q-card-section class="row items-center q-pb-none">
          <div>
            <div class="text-h6 text-weight-bold">{{ documentoDetalle?.numero }}</div>
            <div class="text-caption text-muted">
              {{ documentoDetalle?.cliente }} ·
              {{ documentoDetalle ? labelTipo(documentoDetalle.tipo) : '' }}
            </div>
          </div>
          <q-space />
          <q-btn
            flat
            dense
            icon="print"
            color="primary"
            label="Imprimir"
            @click="imprimir(documentoDetalle?.id ?? '')"
          />
          <q-btn icon="close" flat round dense v-close-popup class="q-ml-sm" />
        </q-card-section>

        <q-card-section v-if="documentoDetalle">
          <q-table
            :rows="documentoDetalle.detalles ?? []"
            :columns="columnasDetalle"
            row-key="id"
            flat
            dense
            hide-bottom
          >
            <template #body-cell-subtotal="{ value }">
              <q-td class="text-right text-weight-bold">{{ formatCurrency(value) }}</q-td>
            </template>
          </q-table>

          <q-separator class="q-my-md" />
          <div class="row justify-end q-gutter-xs">
            <div style="width: 320px">
              <div class="row q-mb-xs">
                <span class="text-muted">Subtotal:</span>
                <q-space />
                <span>{{ formatCurrency(documentoDetalle.subtotal) }}</span>
              </div>
              <div class="row q-mb-xs">
                <span class="text-muted">Descuento:</span>
                <q-space />
                <span>{{ formatCurrency(documentoDetalle.descuentoTotal) }}</span>
              </div>
              <div class="row q-mb-xs">
                <span class="text-muted">Impuesto:</span>
                <q-space />
                <span>{{ formatCurrency(documentoDetalle.impuesto) }}</span>
              </div>
              <div class="row text-h6 text-weight-bold">
                <span>TOTAL:</span>
                <q-space />
                <span class="text-positive">{{ formatCurrency(documentoDetalle.total) }}</span>
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="dialogConversion">
      <q-card class="sgi-card" style="min-width: 360px; max-width: 480px">
        <q-card-section class="row items-center">
          <div class="text-h6 text-weight-bold">Convertir documento</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section class="q-gutter-sm">
          <div class="text-caption text-muted">
            {{ documentoAConvertir?.numero }} ·
            {{ documentoAConvertir ? labelTipo(documentoAConvertir.tipo) : '' }}
          </div>
          <q-select
            v-model="tipoDestino"
            :options="opcionesTipoDestino"
            label="Documento destino"
            outlined
            dense
            emit-value
            map-options
          />
          <q-select
            v-model="pagoConversion.metodoPago"
            :options="opcionesPago"
            label="Método de pago"
            outlined
            dense
            emit-value
            map-options
          />
          <q-input
            v-model.number="pagoConversion.monto"
            label="Monto"
            outlined
            dense
            type="number"
            step="0.01"
          />
          <q-input v-model="pagoConversion.referencia" label="Referencia" outlined dense />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn
            color="primary"
            unelevated
            label="Convertir"
            :loading="store.saving"
            @click="convertirDocumento"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar, type QTableColumn } from 'quasar'
import type { DocumentoVenta, EstadoFactura, MetodoPago, TipoDocumentoVenta } from 'src/types'
import { ESTADO_DOCUMENTO_COLOR, TIPO_DOCUMENTO_LABELS } from 'src/types'
import { useAuthStore } from 'src/stores/authStore'
import { useSucursalStore } from 'src/stores/sucursalStore'
import { useFacturaStore } from 'src/stores/facturaStore'
import { facturaService } from 'src/services/facturaService'
import { formatCurrency, formatDate } from 'src/utils/formatters'
import { useNotify } from 'src/composables/useNotify'
import { useLoading } from 'src/composables/useLoading.ts'

const authStore = useAuthStore()
const sucursalStore = useSucursalStore()
const store = useFacturaStore()
const { notifySuccess, notifyError } = useNotify()
const $q = useQuasar()
const esMovil = computed(() => $q.screen.lt.md)

const documentos = ref<DocumentoVenta[]>([])
const filtroSucursal = ref<string | null>(authStore.isGlobal ? null : authStore.sucursalId)
const filtroTipo = ref<TipoDocumentoVenta | null>(null)
const filtroEstado = ref<string | null>(null)
const filtroDesde = ref('')
const filtroHasta = ref('')
const dialogDetalle = ref(false)
const documentoDetalle = ref<DocumentoVenta | null>(null)
const dialogConversion = ref(false)
const documentoAConvertir = ref<DocumentoVenta | null>(null)
const tipoDestino = ref<'FACTURA' | 'VENTA_SIN_FACTURA'>('FACTURA')
const pagoConversion = ref({
  metodoPago: 'EFECTIVO' as MetodoPago,
  monto: 0,
  referencia: '',
})

const puedeAnular = computed(
  () => authStore.can('documentos.anular') || authStore.can('facturas.anular'),
)

const opcionesSucursal = computed(() =>
  sucursalStore.activas.map((sucursal) => ({ label: sucursal.nombre, value: sucursal.id })),
)
const opcionesTipo = [
  { label: TIPO_DOCUMENTO_LABELS.FACTURA, value: 'FACTURA' },
  { label: TIPO_DOCUMENTO_LABELS.VENTA_SIN_FACTURA, value: 'VENTA_SIN_FACTURA' },
  { label: TIPO_DOCUMENTO_LABELS.PROFORMA, value: 'PROFORMA' },
  { label: TIPO_DOCUMENTO_LABELS.COTIZACION, value: 'COTIZACION' },
]
const opcionesEstado = [
  { label: 'Emitidos', value: 'EMITIDA' },
  { label: 'Anulados', value: 'ANULADA' },
  { label: 'Convertidos', value: 'CONVERTIDA' },
]
const opcionesTipoDestino = [
  { label: TIPO_DOCUMENTO_LABELS.FACTURA, value: 'FACTURA' },
  { label: TIPO_DOCUMENTO_LABELS.VENTA_SIN_FACTURA, value: 'VENTA_SIN_FACTURA' },
]
const opcionesPago = [
  { label: 'Efectivo', value: 'EFECTIVO' },
  { label: 'QR', value: 'QR' },
  { label: 'Transferencia', value: 'TRANSFERENCIA' },
  { label: 'Tarjeta', value: 'TARJETA' },
  { label: 'Crédito', value: 'CREDITO' },
]

const columnas: QTableColumn[] = [
  { name: 'numero', label: 'Número', field: 'numero', align: 'left', sortable: true },
  { name: 'fecha', label: 'Fecha', field: 'fecha', align: 'left', sortable: true },
  { name: 'cliente', label: 'Cliente', field: 'cliente', align: 'left' },
  { name: 'sucursalId', label: 'Sucursal', field: 'sucursalId', align: 'left' },
  { name: 'total', label: 'Total', field: 'total', align: 'right', sortable: true },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'center', sortable: true },
  { name: 'acciones', label: 'Acciones', field: 'id', align: 'right' },
]
const columnasDetalle: QTableColumn[] = [
  { name: 'productoSku', label: 'SKU', field: 'productoSku', align: 'left' },
  { name: 'productoNombre', label: 'Producto', field: 'productoNombre', align: 'left' },
  { name: 'cantidad', label: 'Cant.', field: 'cantidad', align: 'center' },
  {
    name: 'precioUnitario',
    label: 'P. Unit.',
    field: 'precioUnitario',
    align: 'right',
    format: (value: number) => formatCurrency(value),
  },
  { name: 'subtotal', label: 'Subtotal', field: 'subtotal', align: 'right' },
]

function labelTipo(tipo: TipoDocumentoVenta): string {
  return TIPO_DOCUMENTO_LABELS[tipo] ?? tipo
}

function colorEstado(estado: EstadoFactura): string {
  return ESTADO_DOCUMENTO_COLOR[estado] ?? 'grey'
}

function formatTime(iso: string): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat('es-BO', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso),
  )
}

function puedeConvertir(documento: DocumentoVenta): boolean {
  return (
    authStore.can('pos.convertir_documentos') &&
    documento.estado === 'EMITIDA' &&
    (documento.tipo === 'PROFORMA' || documento.tipo === 'COTIZACION')
  )
}

async function cargar(): Promise<void> {
  store.loading = true
  useLoading(true, 'Obteniendo Documentos de Venta...')
  try {
    documentos.value = await facturaService.getAll({
      sucursalId: filtroSucursal.value ?? undefined,
      tipo: filtroTipo.value ?? undefined,
      estado: filtroEstado.value ?? undefined,
      desde: filtroDesde.value || undefined,
      hasta: filtroHasta.value || undefined,
    })
  } catch (e) {
    notifyError((e as Error).message)
  } finally {
    store.loading = false
    useLoading(false)
  }
}

async function imprimir(id: string): Promise<void> {
  if (!id) return
  await store.imprimirFactura(id)
}

async function verDetalle(documento: DocumentoVenta): Promise<void> {
  store.loading = true
  useLoading(true, 'Generando detalle factura...')
  try {
    documentoDetalle.value = await facturaService.getById(documento.id)
    dialogDetalle.value = true
  } catch (e) {
    notifyError((e as Error).message)
  } finally {
    store.loading = false
    useLoading(false)
  }
}

function confirmarAnular(documento: DocumentoVenta): void {
  $q.dialog({
    title: 'Anular documento',
    message: `¿Anular <strong>${documento.numero}</strong>? Si afectó stock, se revertirá el inventario.`,
    html: true,
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Anular', color: 'negative', unelevated: true },
  }).onOk(async () => {
    try {
      await store.anular(documento.id)
      notifySuccess(`Documento ${documento.numero} anulado`)
      const idx = documentos.value.findIndex((row) => row.id === documento.id)
      if (idx !== -1) documentos.value[idx] = { ...documentos.value[idx], estado: 'ANULADA' }
    } catch (e) {
      notifyError((e as Error).message)
    }
  })
}

function abrirConversion(documento: DocumentoVenta): void {
  documentoAConvertir.value = documento
  tipoDestino.value = 'FACTURA'
  pagoConversion.value = {
    metodoPago: 'EFECTIVO',
    monto: documento.total,
    referencia: '',
  }
  dialogConversion.value = true
}

async function convertirDocumento(): Promise<void> {
  if (!documentoAConvertir.value) return
  try {
    const creado = await store.convertir({
      documentoOrigenId: documentoAConvertir.value.id,
      tipoDestino: tipoDestino.value,
      pagos: [
        {
          metodoPago: pagoConversion.value.metodoPago,
          monto: pagoConversion.value.monto,
          referencia: pagoConversion.value.referencia,
          moneda: 'BOB',
        },
      ],
    })
    dialogConversion.value = false
    notifySuccess(`${documentoAConvertir.value.numero} convertido a ${creado.numero}`)
    await cargar()
  } catch (e) {
    notifyError((e as Error).message)
  }
}

onMounted(async () => {
  if (sucursalStore.items.length === 0) await sucursalStore.fetchAll()
  await cargar()
})
</script>
