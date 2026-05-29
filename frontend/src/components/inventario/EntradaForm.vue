<template>
  <MovimientoFormBase
    tipo="ENTRADA"
    :title="!initialData? 'Registrar Entrada' : 'Modificar Entrada'"
    color="positive"
    icon="add_circle"
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
