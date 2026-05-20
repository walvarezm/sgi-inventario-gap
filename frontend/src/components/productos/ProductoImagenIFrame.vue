<template>
  <div class="producto-imagen-uploads">
    <!-- Preview -->
    <div class="imagen-preview">
      <q-img
        v-if="
          (props.imagenLocation === 'drive' || props.imagenLocation === 'local') && props.imagenUrl
        "
        :src="imagenUrl"
        :width="width + ''"
        :height="height + ''"
        style="border-radius: 3px"
        fit="contain"
        class="q-ma-xs-none"
        loading="lazy"
      >
        <q-tooltip>{{ imagenUrl }}</q-tooltip>
        <template #error>
          <div class="flex flex-center bg-grey-4 text-grey-7 q-card--bordered" :style="sizeStyle">
            <q-icon
              name="broken_image"
              color="grey-6"
              size="md"
              class="absolute"
              style="opacity: 0.9"
            />
            <span class="text-caption q-mt-none text-caption-error" style="font-size: 0.8rem">
              Sin imagen
            </span>
            <q-tooltip>Sin imagen 1</q-tooltip>
          </div>
        </template>
      </q-img>

      <div
        v-if="!props.imagenUrl || !imagenUrl"
        class="flex flex-center bg-grey-12 text-grey-7 q-card--bordered"
        :style="sizeStyle"
      >
        <q-icon
          name="broken_image"
          color="grey-5"
          size="md"
          class="absolute"
          style="opacity: 0.5"
        />
        <span class="text-caption q-mt-none text-caption-error" style="font-size: 0.8rem">
          Sin imagen
        </span>
        <q-tooltip>Sin imagen 2</q-tooltip>
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

const width = computed(() => (props.type === 'table' ? widthError.value : widthComputed.value + '%'))
const height = computed(() =>
  props.type === 'table' ? heightError.value : 100 - heightComputed.value + '%',
)

const widthComputed = computed(() => (props.type === 'table' ? props.width : props.width))
const heightComputed = computed(() => (props.type === 'table' ? props.height : 100 - props.height))
//const height = computed(() => (props.height ? props.height - 20 + '%' : '50%'))
//const widthError = computed(() => width.value ?? '50')
const widthError = computed(() =>
  props.type === 'table'
    ? props.width / 2 / 10 + 'rem'
    : widthComputed.value + (100 - widthComputed.value) + '%',
)
const heightError = computed(() =>
  props.type === 'table'
    ? heightComputed.value / 2 / 10 + 'rem'
    : heightComputed.value / 2 / 10 + 'rem',
)

const sizeStyle = computed(() =>
  props.type === 'table'
    ? 'width: ' +
      widthError.value +
      '; height: ' +
      heightError.value +
      '; text-align: center; border-radius: 3px'
    : 'width: ' +
      widthError.value +
      '; height: ' +
      heightError.value +
      '; text-align: center; border-radius: 3px',
)
</script>

<style scoped lang="scss">
.placeholder-img {
  height: 180px;
  border: 2px dashed var(--sgi-border);
  border-radius: 3px;
  background: var(--sgi-surface-alt);
}
</style>
