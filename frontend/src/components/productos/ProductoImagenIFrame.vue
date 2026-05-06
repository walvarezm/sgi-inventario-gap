<template>
  <div class="producto-imagen-uploads">
    <!-- Preview -->
    <div class="imagen-preview">
      <q-img
        v-if="props.imagenLocation === 'local' && props.imagenUrl"
        :src="imagenUrl"
        :width="width + 'px'"
        :height="height + 'px'"
        style="border-radius: 12px"
        fit="contain"
        class="q-mb-sm"
      >
        <template #error>
          <div class="absolute-full flex flex-center bg-grey-2 text-grey-6">
            <q-icon name="broken_image" size="40px" />
          </div>
        </template>
      </q-img>

      <div
        v-if="props.imagenLocation === 'drive' && props.imagenUrl"
        class="q-mb-sm text-center"
        style="border-radius: 12px"
      >
        <iframe :src="imagenUrl + '/preview'" :width="width" :height="height"></iframe>
      </div>

      <div
        v-if="!props.imagenUrl || !imagenUrl"
        class="placeholder-img flex flex-center column text-muted"
      >
        <q-icon name="image" size="48px" style="opacity: 0.3" />
        <span class="text-caption q-mt-sm">Sin imagen</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
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
      ? URL_BASE_DRIVE + props.imagenUrl
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
