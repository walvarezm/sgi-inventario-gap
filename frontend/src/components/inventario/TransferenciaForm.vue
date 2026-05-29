<template>
  <MovimientoFormBase
    tipo="TRANSFERENCIA"
    :title="
      !initialData
        ? 'Registrar Transferencia entre Sucursales'
        : 'Modificar Transferencia entre Sucursales'
    "
    color="primary"
    icon="swap_horiz"
    :initial-data="initialData ?? null"
    @saved="emit('saved')"
    @cancelled="emit('cancelled')"
  />
</template>

<script setup lang="ts">
import type { MovimientoCabecera } from 'src/types'
import MovimientoFormBase from './MovimientoFormBase.vue'

defineProps<{
  initialData?: MovimientoCabecera | null
}>()

const emit = defineEmits<{ saved: []; cancelled: [] }>()
</script>
