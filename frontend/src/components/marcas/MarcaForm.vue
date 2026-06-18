<template>
  <q-card class="sgi-card" style="min-width: 400px; max-width: 480px">
    <q-card-section class="row items-center q-pb-none">
      <div class="text-h6 text-weight-bold">
        {{ isEdit ? 'Editar Marca' : 'Nueva Marca' }}
      </div>
      <q-space />
      <q-btn icon="close" flat round dense v-close-popup />
    </q-card-section>

    <q-card-section>
      <q-form ref="formRef" @submit.prevent="handleSubmit" class="q-gutter-sm">
        <q-input
          v-model="form.nombre"
          label="Nombre de la marca *"
          outlined dense
          :rules="[required, minLength(2)]"
          counter
          maxlength="100"
        />
        <q-input
          v-model="form.descripcion"
          label="Descripción"
          outlined dense
          type="textarea"
          maxlength="255"
        />
        <q-toggle
          v-model="form.activo"
          label="Marca activa"
          color="positive"
          checked-icon="check"
          unchecked-icon="close"
        />
      </q-form>
    </q-card-section>

    <q-card-actions align="right" class="q-px-md q-pb-md">
      <q-btn label="Cancelar" color="negative" v-close-popup class="text-warning" />
      <q-btn
        :label="isEdit ? 'Guardar cambios' : 'Crear marca'"
        color="primary" unelevated
        :loading="saving"
        @click="handleSubmit"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { QForm } from 'quasar'
import type { Marca, MarcaForm } from 'src/types'
import { useMarcaStore } from 'src/stores/marcaStore'
import { required, minLength } from 'src/utils/validators'
import { useNotify } from 'src/composables/useNotify'

interface Props {
  marca?: Marca | null
}
const props = withDefaults(defineProps<Props>(), { marca: null })
const emit = defineEmits<{ saved: [marca: Marca]; cancelled: [] }>()

const store = useMarcaStore()
const { notifySuccess, notifyError } = useNotify()
const formRef = ref<InstanceType<typeof QForm> | null>(null)
const saving = ref(false)
const isEdit = ref(false)

const defaultForm = (): MarcaForm => ({
  nombre: '',
  descripcion: '',
  activo: true,
})
const form = ref<MarcaForm>(defaultForm())

watch(
  () => props.marca,
  (m) => {
    isEdit.value = !!m
    form.value = m
      ? { nombre: m.nombre, descripcion: m.descripcion, activo: m.activo }
      : defaultForm()
  },
  { immediate: true },
)

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate()
  if (!valid) return
  saving.value = true
  try {
    let resultado: Marca
    if (isEdit.value && props.marca) {
      resultado = await store.update(props.marca.id, form.value)
      notifySuccess(`Marca "${resultado.nombre}" actualizada`)
    } else {
      resultado = await store.create(form.value)
      notifySuccess(`Marca "${resultado.nombre}" creada`)
    }
    emit('saved', resultado)
  } catch (e) {
    notifyError((e as Error).message)
  } finally {
    saving.value = false
  }
}
</script>
