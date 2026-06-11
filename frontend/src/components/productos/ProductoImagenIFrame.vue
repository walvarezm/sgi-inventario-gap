<template>
  <div class="producto-imagen-uploads">
    <!-- Preview -->
    <div v-if="false">
      type: {{ props.type }}
      <br />
      props: {{ props.width }} - {{ props.height }}
      <br />
      width / height: {{ width }} - {{ height }}
      <br />
      max: {{ maxWidthImg }} - {{ maxHeightImg }}
      <br />
      Computed: {{ widthComputed }} - {{ heightComputed }}
      <br />
      imagenLocation: {{ props.imagenLocation }}
      <br />
      imagenUrl: {{ props.imagenUrl }} - {{ imagenUrl }}
      <br />
    </div>
    <div class="imagen-preview">
      <q-img
        v-if="
          (props.imagenLocation === 'drive' || props.imagenLocation === 'local') && props.imagenUrl
        "
        :src="imagenUrl"
        :width="width + ''"
        :height="height + ''"
        :style="
          'max-width: ' + maxWidthImg + ';max-height: ' + maxHeightImg + ';height: ' + maxHeightImg
        "
        fit="contain"
        class="q-pa-md bg-img-custom"
        loading="lazy"
      >
        <!--        "cover" | "fill" | "contain" | "none" | "scale-down"-->
        <!--        <q-tooltip>{{ imagenUrl }}</q-tooltip>-->
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
        v-if="!props.imagenUrl || !imagenUrl"
        class="flex flex-center bg-grey-12 text-grey-7 q-card--bordered justify-center q-my-none"
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
  type?: string // 'table' | 'card'
}
const props = withDefaults(defineProps<Props>(), {
  imagenUrl: '',
  imagenLocation: 'local',
  width: 40,
  height: 40,
  type: 'table',
})

const imagenUrl =
  props.imagenLocation === 'local'
    ? URL_BASE_LOCAL + props.imagenUrl + '.jpg'
    : props.imagenLocation === 'drive'
      ? drivePreviewUrl(props.imagenUrl)
      : null

//console.log('imagenUrl', props)
const width = computed(() =>
  props.type === 'table' ? widthError.value : widthComputed.value + '%',
)
const height = computed(
  () => (props.type === 'table' ? heightError.value : heightComputed.value + '%'),
  //props.type === 'table' ? heightError.value : 100 - heightComputed.value + '%',
)

const widthComputed = computed(() => (props.type === 'table' ? props.width : props.width))
const heightComputed = computed(() => (props.type === 'table' ? props.height : props.height))
//const heightComputed = computed(() => (props.type === 'table' ? props.height : 100 - props.height))

const widthError = computed(
  () => (props.type === 'table' ? props.width / 2 / 10 + 'rem' : widthComputed.value + '%'),
  //: widthComputed.value + (100 - widthComputed.value) + '%',
)
const heightError = computed(() =>
  props.type === 'table'
    ? heightComputed.value / 2 / 10 + 'rem'
    : heightComputed.value / 2 / 10 + 'rem !important',
)

const sizeStyleError = computed(() =>
  props.type === 'table'
    ? 'width: ' +
      widthError.value +
      '; height: ' +
      heightError.value +
      '; text-align: center; border-radius: 3px; margin: 0'
    : 'width: ' +
      widthError.value +
      '; max-height: ' +
      heightError.value +
      '; text-align: left !important; border-radius: 13px; margin: 16px 0',
)

const maxHeightImg = computed(
  //() => (props.type === 'view' ? '100rem' : '120px'),
  () =>
    props.type === 'view'
      ? heightComputed.value + '%'
      : props.type === 'card'
        ? (heightComputed.value * 2) / 10 + 'rem'
        : heightComputed.value + '%',
)

const maxWidthImg = computed(() =>
  props.type === 'view'
    ? widthComputed.value / 2 + '%'
    : props.type === 'card'
      ? '100%'
      : widthComputed.value + '%',
)
const styleImg = props.type === 'view' ? 'max-width: 50%; max-heigh: 40rem' : 'max-heigh: 120px;'
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
