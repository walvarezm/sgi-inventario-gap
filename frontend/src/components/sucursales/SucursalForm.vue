<template>
  <q-card class="sgi-card" style="min-width: 480px; max-width: 560px">
    <q-card-section class="row items-center q-pb-none">
      <div class="text-h6 text-weight-bold">
        {{ isEdit ? 'Editar Sucursal' : 'Nueva Sucursal' }}
      </div>
      <q-space />
      <q-btn icon="close" flat round dense v-close-popup />
    </q-card-section>

    <q-card-section>
      <q-form ref="formRef" @submit.prevent="handleSubmit" class="q-gutter-sm">
        <q-input v-model="form.nombre" label="Nombre de la sucursal *" outlined dense :rules="[required, minLength(3)]" />
        <q-input v-model="form.direccion" label="Dirección *" outlined dense :rules="[required]" />
        <q-input v-model="form.ciudad" label="Ciudad *" outlined dense :rules="[required]" />

        <div class="row q-col-gutter-sm">
          <div class="col-6">
            <q-input v-model="form.telefono" label="Teléfono" outlined dense :rules="[phoneBolivia]" />
          </div>
          <div class="col-6">
            <q-input v-model="form.email" label="Email" type="email" outlined dense :rules="[(v) => !v || emailValid(v)]" />
          </div>
        </div>

        <q-toggle v-model="form.activo" label="Sucursal activa" color="positive" checked-icon="check" unchecked-icon="close" />
      </q-form>
    </q-card-section>

    <q-card-actions align="right" class="q-px-md q-pb-md">
      <q-btn label="Cancelar" flat color="grey" v-close-popup />
      <q-btn
        :label="isEdit ? 'Guardar cambios' : 'Crear sucursal'"
        color="primary" unelevated :loading="store.saving"
        @click="handleSubmit"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { QForm } from 'quasar'
import type { Sucursal, SucursalForm } from 'src/types'
import { useSucursalStore } from 'src/stores/sucursalStore'
import { required, minLength, emailValid, phoneBolivia } from 'src/utils/validators'
import { useNotify } from 'src/composables/useNotify'

interface Props { sucursal?: Sucursal | null }
const props = withDefaults(defineProps<Props>(), { sucursal: null })
const emit = defineEmits<{ saved: [sucursal: Sucursal]; cancelled: [] }>()

const store = useSucursalStore()
const { notifySuccess, notifyError } = useNotify()
const formRef = ref<InstanceType<typeof QForm> | null>(null)
const isEdit = ref(false)

const defaultForm = (): SucursalForm => ({
  nombre: '', direccion: '', ciudad: '', telefono: '', email: '', responsableId: '', activo: true,
})
const form = ref<SucursalForm>(defaultForm())

watch(
  () => props.sucursal,
  (s) => {
    isEdit.value = !!s
    form.value = s
      ? { nombre: s.nombre, direccion: s.direccion, ciudad: s.ciudad, telefono: s.telefono, email: s.email, responsableId: s.responsableId, activo: s.activo }
      : defaultForm()
  },
  { immediate: true },
)

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate()
  if (!valid) return
  try {
    let resultado: Sucursal
    if (isEdit.value && props.sucursal) {
      resultado = await store.update(props.sucursal.id, form.value)
      notifySuccess(`Sucursal "${resultado.nombre}" actualizada`)
    } else {
      resultado = await store.create(form.value)
      notifySuccess(`Sucursal "${resultado.nombre}" creada`)
    }
    emit('saved', resultado)
  } catch (e) {
    notifyError((e as Error).message)
  }
}
</script>
