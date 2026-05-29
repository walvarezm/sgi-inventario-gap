<template>
  <div class="producto-qr text-center q-pt-sm">
    <!-- Indicador del modo QR activo -->
    <div v-if="false" class="row justify-center q-mb-xs">
      <q-chip
        :icon="modoActivo === 'enlace' ? 'link' : 'text_fields'"
        :color="modoActivo === 'enlace' ? 'teal' : 'blue-grey'"
        text-color="white"
        size="sm"
        dense
      >
        QR {{ modoActivo === 'enlace' ? 'Enlace' : 'Texto' }}
        <q-tooltip>
          {{
            modoActivo === 'enlace'
              ? 'El QR contiene el enlace de detalle del producto'
              : 'El QR contiene los datos del producto en texto'
          }}
        </q-tooltip>
      </q-chip>
    </div>

    <!-- Imagen del QR -->
    <div v-if="qrDataUrl" class="q-mb-sm">
      <img :src="qrDataUrl" :alt="`QR ${sku}`" style="max-width: 200px; border-radius: 8px" />
      <q-tooltip v-if="modoActivo === 'texto'">{{ qrContent }}</q-tooltip>
    </div>

    <div v-else-if="loading" class="flex flex-center" style="height: 200px">
      <q-spinner color="primary" size="40px" />
    </div>

    <div v-else class="text-muted text-caption">Sin contenido QR</div>

    <!-- Contenido del QR (visible en móvil o modo enlace) -->
    <div
      v-if="qrContent"
      class="text-caption text-muted q-mb-md q-px-xs q-pb-sm"
      style="word-break: break-all; max-width: 220px; margin: 0 auto"
    >
      <template v-if="modoActivo === 'enlace'">
        <q-btn
          color="info"
          outline
          icon="link"
          label="Ver enlace QR"
          size="sm"
          @click="abrirEnlaceQR"
        >
          <q-tooltip>{{ qrContent }}</q-tooltip>
        </q-btn>
      </template>
      <template v-else-if="esMovil">
        {{ qrContent }}
      </template>
    </div>

    <!-- Acciones -->
    <div class="row justify-center q-gutter-sm">
      <q-btn
        v-if="qrDataUrl"
        outline
        color="primary"
        icon="download"
        label="Descargar"
        size="sm"
        @click="descargar"
      />
      <q-btn v-if="qrDataUrl" outline color="grey" icon="refresh" size="sm" @click="generar">
        <q-tooltip>Regenerar</q-tooltip>
      </q-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useQR, getQrMode } from 'src/composables/useQR'
import type { QrProductoDatos } from 'src/composables/useQR'

const $q = useQuasar()

interface Props {
  sku: string
  /** Contenido guardado en el campo qrCode del producto (usado en modo texto) */
  qrCode?: string
  /** Datos del producto para construir el QR en modo texto (opcional, mejora la calidad) */
  datos?: QrProductoDatos
}
const props = withDefaults(defineProps<Props>(), {
  qrCode: '',
  datos: undefined,
})

const { generarDataUrl, buildQrContent, buildQrEnlace, descargarQR, addContentBreak, irEnlaceQR } =
  useQR()

const qrDataUrl = ref('')
const qrContent = ref('')
const loading = ref(false)

const esMovil = computed(() => $q.screen.lt.md)
const modoActivo = computed(() => getQrMode())

async function generar(): Promise<void> {
  if (!props.sku && !props.qrCode) return
  loading.value = true
  try {
    if (modoActivo.value === 'enlace') {
      // Modo enlace: siempre construye la URL a partir del SKU
      qrContent.value = buildQrEnlace(props.sku)
    } else {
      // Modo texto: usa qrCode guardado (con saltos) o construye desde datos
      if (props.qrCode) {
        qrContent.value = addContentBreak(props.qrCode)
      } else if (props.datos) {
        qrContent.value = buildQrContent(props.sku, props.datos)
      } else {
        qrContent.value = props.sku
      }
    }
    qrDataUrl.value = await generarDataUrl(qrContent.value, 200)
  } finally {
    loading.value = false
  }
}

async function descargar(): Promise<void> {
  if (qrContent.value) await descargarQR(qrContent.value, props.sku)
}

function abrirEnlaceQR() {
  if (qrContent.value !== '') irEnlaceQR(qrContent.value)
}

watch(() => [props.sku, props.qrCode, props.datos], generar, { deep: true })
onMounted(generar)
</script>
