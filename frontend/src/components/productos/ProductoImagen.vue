<template>
  <div class="producto-imagen-upload">
    <!-- Preview -->
    <div class="imagen-preview">
      <q-img
        v-if="modelValue"
        :src="modelValue"
        style="height:180px; border-radius:12px"
        fit="contain"
        class="q-mb-sm"
      >
        <template #error>
          <div class="absolute-full flex flex-center bg-grey-2 text-grey-6">
            <q-icon name="broken_image" size="40px" />
          </div>
        </template>
      </q-img>

      <div v-else class="placeholder-img flex flex-center column text-muted">
        <q-icon name="image" size="48px" style="opacity:0.3" />
        <span class="text-caption q-mt-sm">Sin imagen</span>
      </div>
    </div>

    <!-- Botones -->
    <div class="row q-gutter-sm q-mt-sm">
      <q-btn
        outline color="primary" icon="upload" label="Subir imagen"
        size="sm" :loading="uploading" @click="triggerFile"
      />
      <q-btn
        v-if="modelValue"
        outline color="negative" icon="delete" label="Quitar"
        size="sm" @click="emit('update:modelValue', '')"
      />
    </div>

    <input
      ref="fileInput" type="file"
      accept="image/jpeg,image/png,image/webp"
      style="display:none"
      @change="onFileChange"
    />

    <div v-if="errorMsg" class="text-negative text-caption q-mt-xs">{{ errorMsg }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { fileToBase64, resizeImage, validateImageFile } from 'src/utils/qrUtils'
import { productoService } from 'src/services/productoService'

interface Props {
  modelValue: string
  productoId?: string
}
const props = withDefaults(defineProps<Props>(), { modelValue: '', productoId: '' })
const emit = defineEmits<{ 'update:modelValue': [url: string] }>()

const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const errorMsg = ref('')

function triggerFile(): void { fileInput.value?.click() }

async function onFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  errorMsg.value = ''
  const validError = validateImageFile(file, 5)
  if (validError) { errorMsg.value = validError; return }

  uploading.value = true
  try {
    const resized = await resizeImage(file, 800)
    const resizedFile = new File([resized], file.name, { type: file.type })
    const base64 = await fileToBase64(resizedFile)
    const url = await productoService.subirImagen({
      base64,
      mimeType: file.type,
      nombre: `producto_${props.productoId || Date.now()}.${file.type.split('/')[1]}`,
      productoId: props.productoId,
    })
    emit('update:modelValue', url)
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
