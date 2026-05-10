<template>
  <div class="producto-imagen-uploads">
    <!-- Preview -->
    <div class="imagen-preview">
      <q-img
        v-if="
          props.imagenLocation === 'drive' || (props.imagenLocation === 'local' && props.imagenUrl)
        "
        :src="imagenUrl"
        :width="width + 'px'"
        :height="height + 'px'"
        style="border-radius: 10px"
        fit="contain"
        class="q-ma-xs-none"
        loading="lazy"
      >
        <template #error>
          <div class="absolute-full flex flex-center bg-grey-2 text-grey-6">
            <q-icon
              name="broken_image"
              color="grey-5"
              :size="width + 'px'"
              class="absolute-center"
              style="opacity: 0.5"
            />
            <span class="text-caption q-mt-none text-caption-error" style="font-size: 1rem">
              Sin imagen
            </span>
            <q-tooltip>Sin imagen</q-tooltip>
          </div>
        </template>
      </q-img>

      <div
        v-if="props.imagenLocation === 'driveOld' && props.imagenUrl"
        class="flex flex-inline text-left"
      >
        <iframe
          :src="imagenUrl"
          :width="width"
          :height="height"
          class="q-ma-none"
          style="border-radius: 10px"
        ></iframe>
      </div>

      <div
        v-if="!props.imagenUrl || !imagenUrl"
        class="placeholder-img flex flex-center column text-muted"
      >
        <q-icon name="image" size="50px" style="opacity: 0.3" />
        <span class="text-caption q-mt-sm">Sin imagen</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { drivePreviewUrl } from 'src/utils/qrUtils.ts'

const URL_BASE_DRIVE = 'https://drive.google.com/file/d/'
const URL_BASE_LOCAL = 'images/products/'

interface Props {
  imagenUrl: string
  width: number
  height: number
  imagenLocation?: string
}
const props = withDefaults(defineProps<Props>(), {
  imagenUrl: '',
  width: 48,
  height: 48,
  imagenLocation: 'local',
})

const imagenUrl =
  props.imagenLocation === 'local'
    ? URL_BASE_LOCAL + props.imagenUrl + '.jpg'
    : props.imagenLocation === 'drive'
      ? drivePreviewUrl(props.imagenUrl)
      : null
</script>

<style scoped lang="scss">
.placeholder-img {
  height: 180px;
  border: 2px dashed var(--sgi-border);
  border-radius: 12px;
  background: var(--sgi-surface-alt);
}
</style>
