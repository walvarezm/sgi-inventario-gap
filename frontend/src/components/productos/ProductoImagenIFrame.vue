<template>
  <div class="producto-imagen-upload">
    <!-- Preview -->
    <div class="imagen-preview">
      <q-img
        v-if="false"
        :src="imagenUrl"
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

      <div v-if="imagenUrl" class="q-mb-sm text-center" style="border-radius: 12px">
        <iframe :src="imagenUrl + '/preview'" :width="width" :height="height" ></iframe>
      </div>

      <div v-else class="placeholder-img flex flex-center column text-muted">
        <q-icon name="image" size="48px" style="opacity: 0.3" />
        <span class="text-caption q-mt-sm">Sin imagen</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  imagenUrl: string
  width: number
  height: number
}
const props = withDefaults(defineProps<Props>(), {
  imagenUrl: '',
  width: 48,
  height: 48,
})
</script>

<style scoped lang="scss">
.placeholder-img {
  height: 180px;
  border: 2px dashed var(--sgi-border);
  border-radius: 12px;
  background: var(--sgi-surface-alt);
}
</style>
