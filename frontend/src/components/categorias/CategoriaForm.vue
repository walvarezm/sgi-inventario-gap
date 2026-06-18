<template>
  <q-card class="sgi-card" style="min-width: 400px; max-width: 480px">
    <q-card-section class="row items-center q-pb-none">
      <div class="text-h6 text-weight-bold">
        {{ isEdit ? 'Editar Categoría' : 'Nueva Categoría' }}
      </div>
      <q-space />
      <q-btn icon="close" flat round dense v-close-popup />
    </q-card-section>

    <q-card-section>
      <q-form ref="formRef" @submit.prevent="handleSubmit" class="q-gutter-sm">
        <q-input
          v-model="form.nombre"
          label="Nombre de la categoría *"
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
          label="Categoría activa"
          color="positive"
          checked-icon="check"
          unchecked-icon="close"
        />
      </q-form>
    </q-card-section>

    <q-card-actions align="right" class="q-px-md q-pb-md">
      <q-btn label="Cancelar" color="negative" v-close-popup class="text-warning" />
      <q-btn
        :label="isEdit ? 'Guardar cambios' : 'Crear categoría'"
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
import type { Categoria } from 'src/types'
import type { CategoriaForm } from 'src/services/categoriaService'
import { useCategoriaStore } from 'src/stores/categoriaStore'
import { required, minLength } from 'src/utils/validators'
import { useNotify } from 'src/composables/useNotify'

interface Props {
  categoria?: Categoria | null
}
const props = withDefaults(defineProps<Props>(), { categoria: null })
const emit = defineEmits<{ saved: [categoria: Categoria]; cancelled: [] }>()

const store = useCategoriaStore()
const { notifySuccess, notifyError } = useNotify()
const formRef = ref<InstanceType<typeof QForm> | null>(null)
const saving = ref(false)
const isEdit = ref(false)

const defaultForm = (): CategoriaForm => ({
  nombre: '',
  descripcion: '',
  activo: true,
})
const form = ref<CategoriaForm>(defaultForm())

watch(
  () => props.categoria,
  (c) => {
    isEdit.value = !!c
    form.value = c
      ? { nombre: c.nombre, descripcion: c.descripcion, activo: c.activo }
      : defaultForm()
  },
  { immediate: true },
)

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate()
  if (!valid) return
  saving.value = true
  try {
    let resultado: Categoria
    if (isEdit.value && props.categoria) {
      resultado = await store.update(props.categoria.id, form.value)
      notifySuccess(`Categoría "${resultado.nombre}" actualizada`)
    } else {
      resultado = await store.create(form.value)
      notifySuccess(`Categoría "${resultado.nombre}" creada`)
    }
    emit('saved', resultado)
  } catch (e) {
    notifyError((e as Error).message)
  } finally {
    saving.value = false
  }
}
</script>
