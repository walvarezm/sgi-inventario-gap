<template>
  <q-card class="sgi-card" flat>
    <q-card-section class="row items-center q-pb-sm">
      <div class="text-subtitle1 text-weight-bold">{{ titulo }}</div>
      <q-space />
      <q-btn-toggle
        v-model="tipoGrafico"
        :options="[{ value: 'bar', slot: 'bar' }, { value: 'line', slot: 'line' }]"
        toggle-color="primary" outline dense rounded size="sm"
      >
        <template #bar><q-icon name="bar_chart" /><q-tooltip>Barras</q-tooltip></template>
        <template #line><q-icon name="show_chart" /><q-tooltip>Líneas</q-tooltip></template>
      </q-btn-toggle>
    </q-card-section>

    <q-card-section class="q-pt-none">
      <div v-if="loading" class="flex flex-center" style="height:260px">
        <q-spinner color="primary" size="40px" />
      </div>
      <div v-else-if="!datos.length" class="flex flex-center text-muted" style="height:260px">
        <div class="text-center">
          <q-icon name="bar_chart" size="48px" style="opacity:0.2" />
          <div class="text-body2 q-mt-sm">Sin datos para el período seleccionado</div>
        </div>
      </div>
      <canvas v-else ref="canvasRef" style="height:260px; width:100%"></canvas>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import type { PuntoVentas } from 'src/types'
import { formatCurrency } from 'src/utils/formatters'

interface Props {
  datos: PuntoVentas[]
  titulo?: string
  loading?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  titulo: 'Ventas por período',
  loading: false,
})

const canvasRef = ref<HTMLCanvasElement | null>(null)
const tipoGrafico = ref<'bar' | 'line'>('bar')
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let chartInstance: any = null

async function renderChart(): Promise<void> {
  if (!canvasRef.value || !props.datos.length) return

  // Importar Chart.js dinámicamente
  const { Chart, registerables } = await import('chart.js')
  Chart.register(...registerables)

  if (chartInstance) { chartInstance.destroy(); chartInstance = null }

  const labels = props.datos.map((d) => d.fecha)
  const totales = props.datos.map((d) => d.total)

  chartInstance = new Chart(canvasRef.value, {
    type: tipoGrafico.value,
    data: {
      labels,
      datasets: [
        {
          label: 'Ventas (Bs.)',
          data: totales,
          backgroundColor: tipoGrafico.value === 'bar'
            ? 'rgba(21,101,192,0.7)'
            : 'rgba(21,101,192,0.15)',
          borderColor: '#1565c0',
          borderWidth: 2,
          borderRadius: tipoGrafico.value === 'bar' ? 4 : 0,
          tension: 0.4,
          fill: tipoGrafico.value === 'line',
          pointBackgroundColor: '#1565c0',
          pointRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${formatCurrency(ctx.parsed.y)}`,
            afterLabel: (ctx) => {
              const d = props.datos[ctx.dataIndex]
              return ` ${d.cantidad} factura(s)`
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(0,0,0,0.06)' },
          ticks: {
            callback: (val) => `Bs. ${Number(val).toLocaleString('es-BO')}`,
            font: { size: 11 },
          },
        },
        x: {
          grid: { display: false },
          ticks: { font: { size: 11 } },
        },
      },
    },
  })
}

watch([() => props.datos, tipoGrafico], async () => {
  await nextTick()
  await renderChart()
})

onMounted(async () => {
  await nextTick()
  await renderChart()
})

onUnmounted(() => {
  if (chartInstance) chartInstance.destroy()
})
</script>
