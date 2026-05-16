<template>
  <q-card class="sgi-card" style="width: 1080px; max-width: 96vw">
    <q-card-section class="row items-center q-pb-none">
      <div class="text-h6 text-weight-bold">Importación masiva desde Excel</div>
      <q-space />
      <q-btn icon="close" flat round dense v-close-popup />
    </q-card-section>

    <q-card-section class="q-gutter-md">
      <q-banner rounded class="bg-blue-1 text-blue-10">
        El archivo puede incluir las hojas
        <strong>PRODUCTOS</strong>
        y
        <strong>STOCK_INICIAL</strong>
        . Si no existe la marca o la categoría, se crearán automáticamente. El `qr_code` se genera
        como:
        <code>sku | marca | nombre | precio_ofrecido | precio_final</code>
        .
      </q-banner>
      <q-separator />
      <div class="row q-col-gutter-md items-start q-ma-xs">
        <div class="col-12 col-md-3">
          <q-select
            v-model="filtroMarca"
            :options="[
              { label: 'Todas las marcas', value: null },
              { label: 'ZAFIRO', value: 'ZAFIRO' },
              ...marcaStore.optionsName,
            ]"
            label="Marca"
            outlined
            dense
            emit-value
            map-options
          />
        </div>
        <div class="col-12 col-md-6">
          <q-file
            v-model="archivo"
            label="Archivo Excel"
            outlined
            accept=".xlsx,.xls"
            clearable
            :loading="parsing"
            @update:model-value="onArchivoSeleccionado"
          >
            <template #prepend><q-icon name="upload_file" /></template>
          </q-file>
        </div>
        <div class="col-12 col-md-3">
          <q-btn
            label="Descargar plantilla"
            icon="download"
            color="secondary"
            outline
            class="full-width"
            @click="descargarPlantilla"
          />
        </div>
      </div>

      <div v-if="error" class="text-negative text-body2">{{ error }}</div>

      <div v-if="archivoResumen" class="row q-col-gutter-md">
        <div class="col-12 col-md-6">
          <q-card flat bordered>
            <q-card-section>
              <div class="text-subtitle2 text-weight-bold">Resumen detectado</div>
              <div class="text-body2 q-mt-sm">Productos: {{ productosRows.length }}</div>
              <div class="text-body2">Stock inicial: {{ stockRows.length }}</div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-md-6">
          <q-card flat bordered>
            <q-card-section>
              <div class="text-subtitle2 text-weight-bold">Hoja requerida</div>
              <div class="text-body2 q-mt-sm">`PRODUCTOS`: catálogo a crear/actualizar</div>
              <div class="text-body2">`STOCK_INICIAL`: carga de stock por sucursal</div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <div v-if="productosPreview.length" class="q-mt-sm">
        <div class="text-subtitle2 text-weight-bold q-mb-sm">Vista previa de productos</div>
        <q-table
          :rows="productosPreview"
          :columns="productoColumns"
          row-key="__rowNumber"
          flat
          dense
          :hide-pagination="false"
        />
      </div>

      <div v-if="stockPreview.length" class="q-mt-md">
        <div class="text-subtitle2 text-weight-bold q-mb-sm">Vista previa de stock inicial</div>
        <q-table
          :rows="stockPreview"
          :columns="stockColumns"
          row-key="__rowNumber"
          flat
          dense
          :hide-pagination="false"
          :rows-per-page-options="[5, 10, 25]"
        />
      </div>

      <div v-if="resultadoProductos || resultadoStock" class="q-gutter-md q-mt-md">
        <q-banner v-if="resultadoProductos" rounded class="bg-green-1 text-green-10">
          Productos: {{ resultadoProductos.summary.created }} creados,
          {{ resultadoProductos.summary.updated }} actualizados,
          {{ resultadoProductos.summary.skipped }} omitidos,
          {{ resultadoProductos.summary.errors }} con error.
        </q-banner>

        <q-banner v-if="resultadoStock" rounded class="bg-orange-1 text-orange-10">
          Stock inicial: {{ resultadoStock.summary.imported }} importados,
          {{ resultadoStock.summary.skipped }} omitidos, {{ resultadoStock.summary.errors }} con
          error.
        </q-banner>

        <q-table
          v-if="resultados.length"
          :rows="resultados"
          :columns="resultColumns"
          row-key="key"
          flat
          dense
          :pagination="{ rowsPerPage: 10 }"
        />
      </div>
    </q-card-section>

    <q-card-actions align="right" class="q-px-md q-pb-md">
      <q-btn label="Cancelar" flat color="grey" v-close-popup />
      <q-btn
        label="Ejecutar importación"
        color="primary"
        icon="playlist_add_check"
        unelevated
        :disable="!archivoResumen || (!productosRows.length && !stockRows.length)"
        :loading="importando"
        @click="ejecutarImportacion"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { QTableColumn } from 'quasar'
import { read, utils, writeFileXLSX } from 'xlsx'
import { productoService } from 'src/services/productoService'
import { useProductoStore } from 'src/stores/productoStore'
import { useCategoriaStore } from 'src/stores/categoriaStore'
import { useMarcaStore } from 'src/stores/marcaStore'
import type {
  ImportProductoRow,
  ImportProductosResponse,
  ImportStockResponse,
  ImportStockRow,
} from 'src/types'
import { useNotify } from 'src/composables/useNotify'

const emit = defineEmits<{ imported: []; cancelled: [] }>()

const productoStore = useProductoStore()
const categoriaStore = useCategoriaStore()
const marcaStore = useMarcaStore()
const { notifyError, notifySuccess } = useNotify()

const archivo = ref<File | null>(null)
const parsing = ref(false)
const importando = ref(false)
const error = ref('')
const archivoResumen = ref(false)
const productosRows = ref<ImportProductoRow[]>([])
const stockRows = ref<ImportStockRow[]>([])
const resultadoProductos = ref<ImportProductosResponse | null>(null)
const resultadoStock = ref<ImportStockResponse | null>(null)
const filtroMarca = ref<string | null>(null)

const productoColumns: QTableColumn[] = [
  { name: '__rowNumber', label: '#', field: '__rowNumber', align: 'left' },
  { name: 'sku', label: 'SKU', field: 'sku', align: 'left' },
  { name: 'marca', label: 'Marca', field: 'marca', align: 'left' },
  { name: 'nombre', label: 'Nombre', field: 'nombre', align: 'left' },
  { name: 'categoria', label: 'Categoría', field: 'categoria', align: 'left' },
  { name: 'precioCompra', label: 'P. Compra', field: 'precioCompra', align: 'right' },
  { name: 'precioOfrecido', label: 'P. Venta', field: 'precioOfrecido', align: 'right' },
  { name: 'precioFinal', label: 'P. Final', field: 'precioFinal', align: 'right' },
]

const stockColumns: QTableColumn[] = [
  { name: '__rowNumber', label: '#', field: '__rowNumber', align: 'left' },
  { name: 'sku', label: 'SKU', field: 'sku', align: 'left' },
  { name: 'sucursal', label: 'Sucursal', field: 'sucursal', align: 'left' },
  { name: 'stockInicial', label: 'Stock inicial', field: 'stockInicial', align: 'right' },
]

const resultColumns: QTableColumn[] = [
  { name: 'scope', label: 'Bloque', field: 'scope', align: 'left' },
  { name: 'rowNumber', label: 'Fila', field: 'rowNumber', align: 'left' },
  { name: 'sku', label: 'SKU', field: 'sku', align: 'left' },
  { name: 'action', label: 'Acción', field: 'action', align: 'left' },
  { name: 'message', label: 'Detalle', field: 'message', align: 'left' },
]

//const productosPreview = computed(() => productosRows.value.slice(0, 8))
const productosPreview = computed(() => productosRows.value)
const stockPreview = computed(() => stockRows.value)
const resultados = computed(() => {
  const productos = (resultadoProductos.value?.results || []).map((item, index) => ({
    ...item,
    scope: 'PRODUCTOS',
    key: `p-${index}-${item.rowNumber}-${item.sku}`,
  }))
  const stock = (resultadoStock.value?.results || []).map((item, index) => ({
    ...item,
    scope: 'STOCK_INICIAL',
    key: `s-${index}-${item.rowNumber}-${item.sku}`,
  }))
  return [...productos, ...stock]
})

function normalizeHeader(header: string): string {
  return String(header || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function toBoolean(value: unknown): boolean | undefined {
  if (value === '' || value === null || value === undefined) return undefined
  const normalized = String(value).trim().toLowerCase()
  return normalized === 'true' || normalized === '1' || normalized === 'si' || normalized === 'sí'
}

function mapProductoRow(row: Record<string, unknown>, index: number): ImportProductoRow {
  return {
    __rowNumber: index + 2,
    sku: String(row.sku || '')
      .trim()
      .toUpperCase(),
    marca: String(row.marca || '')
      .trim()
      .toUpperCase(),
    nombre: String(row.nombre || '').trim(),
    descripcion: String(row.descripcion || '').trim(),
    categoria: String(row.categoria || '').trim(),
    unidad: String(row.unidad || 'Unidad').trim(),
    precioCompra: row.precio_compra === '' ? 0 : Number(row.precio_compra || 0),
    precioOfrecido: Number(row.precio_ofrecido || 0),
    precioFinal: Number(row.precio_final || 0),
    stockMinimo: Number(row.stock_minimo || 0),
    imagenUrl: String(row.imagen_url || '').trim(),
    activo: toBoolean(row.activo),
  }
}

function mapStockRow(row: Record<string, unknown>, index: number): ImportStockRow {
  return {
    __rowNumber: index + 2,
    sku: String(row.sku || '')
      .trim()
      .toUpperCase(),
    sucursal: String(row.sucursal || row.sucursal_id || '').trim(),
    stockInicial: Number(row.stock_inicial || row.stock || 0),
    referencia: String(row.referencia || '').trim(),
    notas: String(row.notas || '').trim(),
  }
}

function sheetToNormalizedObjects(
  sheetName: string,
  workbook: ReturnType<typeof read>,
): Record<string, unknown>[] {
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) return []
  const rows = utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  return rows.map((row) => {
    const normalized: Record<string, unknown> = {}
    Object.entries(row).forEach(([key, value]) => {
      normalized[normalizeHeader(key)] = value
    })
    return normalized
  })
}

async function onArchivoSeleccionado(file: File | readonly File[] | null): Promise<void> {
  resultadoProductos.value = null
  resultadoStock.value = null
  error.value = ''
  archivoResumen.value = false
  productosRows.value = []
  stockRows.value = []
  archivo.value = Array.isArray(file) ? file[0] : file

  const selected = Array.isArray(file) ? file[0] : file
  if (!selected) return

  parsing.value = true
  try {
    const buffer = await selected.arrayBuffer()
    const workbook = read(buffer, { type: 'array' })
    const productosRaw = sheetToNormalizedObjects('PRODUCTOS', workbook)
    const stockRaw = sheetToNormalizedObjects('STOCK_INICIAL', workbook)

    //if (filtroMarca.value) productosRaw = productosRaw.filter((p) => p.marca === filtroMarca.value)
    productosRows.value = productosRaw
      .map(mapProductoRow)
      .filter(
        (row) =>
          (row.sku || row.nombre || row.marca) &&
          row.marca === filtroMarca.value &&
          row.activo === true,
      )

    //stockRows.value = stockRaw.map(mapStockRow).filter((row) => row.sku || row.sucursal)
    stockRows.value = stockRaw.map(mapStockRow).filter((row) => {
      const exist = productosRows.value.find((p) => p.sku === row.sku)
      return (row.sku || row.sucursal) && exist
    })

    if (!productosRows.value.length && !stockRows.value.length) {
      throw new Error('No se encontraron filas útiles en PRODUCTOS o STOCK_INICIAL')
    }

    archivoResumen.value = true
  } catch (e) {
    error.value = (e as Error).message
    notifyError(error.value)
  } finally {
    parsing.value = false
  }
}

function descargarPlantilla(): void {
  const workbook = utils.book_new()
  const productosTemplate = utils.json_to_sheet([
    {
      sku: 'SKU-001',
      marca: 'TRUPER',
      nombre: 'Taladro percutor',
      descripcion: 'Taladro 650W',
      categoria: 'Taladro',
      unidad: 'Unidad',
      precio_compra: 0,
      precio_ofrecido: 320,
      precio_final: 299,
      stock_minimo: 5,
      imagen_url: '',
      activo: true,
    },
  ])
  const stockTemplate = utils.json_to_sheet([
    {
      sku: 'SKU-001',
      sucursal: 'Casa Matriz',
      stock_inicial: 25,
      referencia: 'CARGA-INICIAL',
      notas: 'Carga inicial desde Excel',
    },
  ])

  utils.book_append_sheet(workbook, productosTemplate, 'PRODUCTOS')
  utils.book_append_sheet(workbook, stockTemplate, 'STOCK_INICIAL')
  writeFileXLSX(workbook, 'plantilla-importacion-sgi.xlsx')
}

async function ejecutarImportacion(): Promise<void> {
  importando.value = true
  error.value = ''
  resultadoProductos.value = null
  resultadoStock.value = null

  try {
    if (productosRows.value.length) {
      resultadoProductos.value = await productoService.importarProductos(
        productosRows.value,
        false,
        'upsert',
      )
    }
    if (stockRows.value.length) {
      resultadoStock.value = await productoService.importarStockInicial(stockRows.value, false)
    }

    categoriaStore.forceReload()
    marcaStore.forceReload()
    await Promise.all([productoStore.fetchAll(), categoriaStore.fetchAll(), marcaStore.fetchAll()])

    notifySuccess('Importación completada')
    emit('imported')
  } catch (e) {
    error.value = (e as Error).message
    notifyError(error.value)
  } finally {
    importando.value = false
  }
}

watch(
  () => filtroMarca.value,
  () => {
    if (filtroMarca.value) {
      onArchivoSeleccionado(archivo.value)
    }
  },
)
</script>
