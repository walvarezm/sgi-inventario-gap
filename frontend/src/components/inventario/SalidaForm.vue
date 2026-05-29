<template>
  <MovimientoFormBase
    tipo="SALIDA"
    :title="!initialData ? 'Registrar Salida' : 'Modificar Salida'"
    color="negative"
    icon="remove_circle"
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
