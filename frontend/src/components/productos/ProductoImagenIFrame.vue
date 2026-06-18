<template>
  <div class="producto-imagen-uploads">
    <div v-if="false">
      type: {{ props.type }}
      <br />
      props: {{ props.width }} - {{ props.height }}
      <br />
      widthPx/heightPx: {{ widthPx }} - {{ heightPx }}
      <br />
      maxWidthImg/maxHeightImg: {{ maxWidthImg }} - {{ maxHeightImg }}
      <br />
      imagenLocation: {{ props.imagenLocation }}
      <br />
      imagenUrl: {{ props.imagenUrl }} - {{ imagenUrl }}
      <br />
      imgStyle: {{ imgStyle }}
      <br />
      sizeStyleError: {{ sizeStyleError }}
      <br />
    </div>
    <!--    <div v-if="imagenUrl">imagenUrl: {{ imagenUrl }}</div>-->

    <div class="imagen-previews">
      <q-img
        v-if="imagenUrl && (props.imagenLocation === 'drive' || props.imagenLocation === 'local')"
        :src="imagenUrl"
        :style="imgStyle"
        :fit="props.type === 'view' ? 'contain' : 'cover'"
        class="q-pa-md bg-img-custom"
        loading="lazy"
      >
        <template #error>
          <div
            class="flex flex-center bg-grey-4 text-grey-7 q-card--bordered"
            :style="sizeStyleError"
          >
            <q-icon
              name="broken_image"
              color="grey-6"
              size="md"
              class="absolute"
              style="opacity: 0.9; max-height: 50px"
            />
            <span class="text-caption q-mt-none text-caption-error" style="font-size: 0.8rem">
              Sin imagen
            </span>
            <q-tooltip>Error al cargar imagen</q-tooltip>
          </div>
        </template>
      </q-img>

      <div
        v-else
        class="flex flex-center bg-grey-12 text-grey-7 q-card--bordered justify-center q-my-none card-image-wrapper"
        :style="sizeStyleError"
      >
        <q-icon
          name="broken_image"
          color="grey-5"
          size="md"
          class="absolute q-mt-none"
          style="opacity: 0.5"
        />
        <span
          class="text-caption q-mt-none text-caption-error"
          style="font-size: 0.8rem; max-height: 100px"
        >
          Sin imagen
        </span>
        <q-tooltip>Producto Sin imagen</q-tooltip>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { drivePreviewUrl } from 'src/utils/qrUtils.ts'
import { computed } from 'vue'

const URL_BASE_LOCAL = 'images/products/'

interface Props {
  imagenUrl: string
  imagenLocation?: string
  width?: number
  height?: number
  type?: string // 'table' | 'card' | 'view'
}
const props = withDefaults(defineProps<Props>(), {
  imagenUrl: '',
  imagenLocation: 'local',
  width: 40,
  height: 40,
  type: 'table',
})

/**
 * URL efectiva de la imagen — DEBE ser computed para ser reactiva.
 * Si se asigna como const simple, no se actualiza cuando cambian las props.
 */
const imagenUrl = computed(() => {
  if (!props.imagenUrl) return null
  if (props.imagenLocation === 'local') {
    return URL_BASE_LOCAL + props.imagenUrl + '.jpg'
  }
  if (props.imagenLocation === 'drive') {
    return drivePreviewUrl(props.imagenUrl)
  }
  return null
})

// ── Dimensiones por tipo de uso ──────────────────────────────────────────────

const widthPx = computed(() => {
  if (props.type === 'table') return props.width / 2 / 10 + 'rem'
  if (props.type === 'card') return props.width / 5 + 'rem'
  return props.width / 2 + '%' // 'view'
})

const heightPx = computed(() => {
  if (props.type === 'table') return props.height / 2 / 10 + 'rem'
  if (props.type === 'card') return props.height / 2 / 5 + 'rem'
  return props.height / 2 / 10 + 'rem'
})

const maxWidthImg = computed(() => {
  if (props.type === 'card') return (props.width * 2) / 10 + 'rem'
  if (props.type === 'view') return props.width + '%'
  return props.width + '%'
})

const maxHeightImg = computed(() => {
  if (props.type === 'card') return (props.height * 2) / 10 + 'rem'
  if (props.type === 'view') return props.height + 'vh'
  return props.height + '%'
})

const imgStyle = computed(
  () =>
    `width: ${maxWidthImg.value}; max-width: 100%; max-height: ${maxHeightImg.value}; height: ${maxHeightImg.value}; `,
)

const sizeStyleError = computed(() => {
  if (props.type === 'table') {
    return `width: ${widthPx.value}; height: ${heightPx.value}; text-align: center; border-radius: 3px; margin: 0`
  }
  return `width: ${widthPx.value}; max-width: 100%; max-height: ${heightPx.value}; height: ${heightPx.value}; border-radius: 5px;`
})
</script>

<style scoped lang="scss">
.placeholder-img {
  height: 180px;
  border: 2px dashed var(--sgi-border);
  border-radius: 3px;
  background: var(--sgi-surface-alt);
}
.bg-img-custom {
  border: 1px solid var(--sgi-border);
  border-radius: 3px !important;
  background: color-mix(in srgb, var(--sgi-surface-alt) 25%, transparent);
  padding: 10px;
}
</style>
