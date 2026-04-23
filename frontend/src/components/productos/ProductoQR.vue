<template>
  <div class="producto-qr text-center">
    <div v-if="qrDataUrl" class="q-mb-sm">
      <img :src="qrDataUrl" :alt="`QR ${sku}`" style="max-width:200px; border-radius:8px" />
    </div>
    <div v-else-if="loading" class="flex flex-center" style="height:200px">
      <q-spinner color="primary" size="40px" />
    </div>
    <div v-else class="text-muted text-caption">Sin contenido QR</div>

    <div v-if="qrContent" class="text-caption text-muted q-mb-sm" style="word-break:break-all">
      {{ qrContent }}
    </div>

    <div class="row justify-center q-gutter-sm">
      <q-btn
        v-if="qrDataUrl"
        outline color="primary" icon="download" label="Descargar" size="sm"
        @click="descargar"
      />
      <q-btn v-if="qrDataUrl" outline color="grey" icon="refresh" size="sm" @click="generar">
        <q-tooltip>Regenerar</q-tooltip>
      </q-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useQR } from 'src/composables/useQR'

interface Props {
  sku: string
  qrCode?: string
}
const props = withDefaults(defineProps<Props>(), { qrCode: '' })

const { generarDataUrl, buildQrContent, descargarQR } = useQR()
const qrDataUrl = ref('')
const qrContent = ref('')
const loading = ref(false)

async function generar(): Promise<void> {
  if (!props.sku && !props.qrCode) return
  loading.value = true
  try {
    qrContent.value = props.qrCode || buildQrContent(props.sku)
    qrDataUrl.value = await generarDataUrl(qrContent.value, 200)
  } finally {
    loading.value = false
  }
}

async function descargar(): Promise<void> {
  if (qrContent.value) await descargarQR(qrContent.value, props.sku)
}

watch(() => [props.sku, props.qrCode], generar)
onMounted(generar)
</script>
