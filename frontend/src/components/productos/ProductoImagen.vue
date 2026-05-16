<template>
  <div class="producto-imagen-upload">
    <!-- Preview -->
    <div class="imagen-preview">
      <q-img
        v-if="false"
        :src="modelValue"
        style="height: 180px; border-radius: 12px"
        fit="contain"
        class="q-mb-sm"
      >
        <template #error>
          <div class="absolute-full flex flex-center bg-grey-2 text-grey-6">
            <q-icon name="broken_image" size="40px" />
          </div>
        </template>
      </q-img>

      <div v-if="modelValue" class="q-mb-sm text-center" style="height: 180px; border-radius: 12px">
        <!--        <iframe :src="modelValue + '/preview'" width="180" height="180"></iframe>-->
        <ProductoImagenIFrame
          v-if="modelValue"
          :imagen-url="modelValue"
          :width="180"
          :height="180"
          :imagen-location="imagenLocation"
        />
      </div>

      <div v-else class="placeholder-img flex flex-center column text-muted">
        <q-icon name="image" size="48px" style="opacity: 0.3" />
        <span class="text-caption q-mt-sm">Sin imagen</span>
      </div>
    </div>

    <!-- Botones -->
    <div class="row q-gutter-sm q-mt-sm">
      <q-btn
        outline
        color="primary"
        icon="upload"
        label="Subir imagen"
        size="sm"
        :loading="uploading"
        @click="triggerFile"
      />
      <q-btn
        v-if="modelValue"
        outline
        color="negative"
        icon="delete"
        label="Quitar"
        size="sm"
        @click="quitarImagen"
      />
    </div>

    <input
      ref="fileInput"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      style="display: none"
      @change="onFileChange"
    />

    <div v-if="errorMsg" class="text-negative text-caption q-mt-xs">{{ errorMsg }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  fileToBase64,
  normalizeStrictImageName,
  resizeImage,
  validateImageFile,
} from 'src/utils/qrUtils'
import { productoService } from 'src/services/productoService'
import ProductoImagenIFrame from 'src/components/productos/ProductoImagenIFrame.vue'

interface Props {
  modelValue: string
  productoId?: string
  productoSku?: string
  imagenLocation?: string
}
const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  productoId: '',
  productoSku: '',
  imagenLocation: 'local',
})
const emit = defineEmits<{
  'update:modelValue': [url: string]
  'update:imagenLocation': [imagenLocation: string]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const errorMsg = ref('')
const imagenLocation = ref(props.imagenLocation)

watch(
  () => props.imagenLocation,
  (value) => {
    imagenLocation.value = value || 'local'
  },
)

function triggerFile(): void {
  fileInput.value?.click()
}

function quitarImagen(): void {
  imagenLocation.value = 'local'
  emit('update:modelValue', '')
  emit('update:imagenLocation', 'local')
}

async function onFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  errorMsg.value = ''
  const validError = validateImageFile(file, 5)
  if (validError) {
    errorMsg.value = validError
    return
  }

  uploading.value = true
  try {
    const resized = await resizeImage(file, 800)
    const resizedFile = new File([resized], file.name, { type: file.type })
    const base64 = await fileToBase64(resizedFile)
    const nameImage = normalizeStrictImageName(props.productoSku)
    const url = await productoService.subirImagen({
      base64,
      mimeType: file.type,
      nombre: nameImage || `producto_${props.productoId || Date.now()}.${file.type.split('/')[1]}`,
      productoId: props.productoId,
    })
    imagenLocation.value = 'drive'
    emit('update:modelValue', url)
    emit('update:imagenLocation', 'drive')
  } catch (e) {
    errorMsg.value = (e as Error).message
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}
</script>

<style scoped lang="scss">
.placeholder-img {
  height: 180px;
  border: 2px dashed var(--sgi-border);
  border-radius: 12px;
  background: var(--sgi-surface-alt);
}
</style>
