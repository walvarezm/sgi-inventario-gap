<template>
  <q-card class="sgi-card" style="min-width:500px; max-width:580px">
    <q-card-section class="row items-center q-pb-none">
      <div class="text-h6 text-weight-bold">
        {{ isEdit ? 'Editar Proveedor' : 'Nuevo Proveedor' }}
      </div>
      <q-space />
      <q-btn icon="close" flat round dense v-close-popup />
    </q-card-section>

    <q-card-section>
      <q-form ref="formRef" @submit.prevent="handleSubmit" class="q-gutter-sm">
        <!-- Nombre -->
        <q-input
          v-model="form.nombre" label="Nombre / Razón Social *"
          outlined dense :rules="[required, minLength(3)]"
        />

        <div class="row q-col-gutter-sm">
          <!-- RUC/NIT -->
          <div class="col-6">
            <q-input v-model="form.rucNit" label="RUC / NIT" outlined dense />
          </div>
          <!-- Ciudad -->
          <div class="col-6">
            <q-input v-model="form.ciudad" label="Ciudad" outlined dense />
          </div>
        </div>

        <!-- Dirección -->
        <q-input v-model="form.direccion" label="Dirección" outlined dense />

        <div class="row q-col-gutter-sm">
          <!-- Contacto -->
          <div class="col-6">
            <q-input v-model="form.contacto" label="Persona de contacto" outlined dense />
          </div>
          <!-- Teléfono -->
          <div class="col-6">
            <q-input
              v-model="form.telefono" label="Teléfono" outlined dense
              :rules="[(v) => !v || phoneBolivia(v)]"
            />
          </div>
        </div>

        <!-- Email -->
        <q-input
          v-model="form.email" label="Email" type="email" outlined dense
          :rules="[(v) => !v || emailValid(v)]"
        />

        <!-- Notas -->
        <q-input
          v-model="form.notas" label="Notas / Condiciones comerciales"
          outlined dense type="textarea" rows="2" autogrow
        />

        <!-- Estado -->
        <q-toggle v-model="form.activo" label="Proveedor activo" color="positive" />
      </q-form>
    </q-card-section>

    <q-card-actions align="right" class="q-px-md q-pb-md">
      <q-btn label="Cancelar" flat color="grey" v-close-popup />
      <q-btn
        :label="isEdit ? 'Guardar cambios' : 'Crear proveedor'"
        color="primary" unelevated :loading="store.saving"
        @click="handleSubmit"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { QForm } from 'quasar'
import type { Proveedor, ProveedorForm } from 'src/types'
import { useProveedorStore } from 'src/stores/proveedorStore'
import { required, minLength, emailValid, phoneBolivia } from 'src/utils/validators'
import { useNotify } from 'src/composables/useNotify'

interface Props { proveedor?: Proveedor | null }
const props = withDefaults(defineProps<Props>(), { proveedor: null })
const emit = defineEmits<{ saved: [proveedor: Proveedor]; cancelled: [] }>()

const store = useProveedorStore()
const { notifySuccess, notifyError } = useNotify()
const formRef = ref<InstanceType<typeof QForm> | null>(null)
const isEdit = ref(false)

const defaultForm = (): ProveedorForm => ({
  nombre: '', rucNit: '', contacto: '', telefono: '',
  email: '', direccion: '', ciudad: '', notas: '', activo: true,
})
const form = ref<ProveedorForm>(defaultForm())

watch(
  () => props.proveedor,
  (p) => {
    isEdit.value = !!p
    form.value = p
      ? { nombre: p.nombre, rucNit: p.rucNit, contacto: p.contacto, telefono: p.telefono,
          email: p.email, direccion: p.direccion, ciudad: p.ciudad, notas: p.notas, activo: p.activo }
      : defaultForm()
  },
  { immediate: true },
)

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate()
  if (!valid) return
  try {
    let resultado: Proveedor
    if (isEdit.value && props.proveedor) {
      resultado = await store.update(props.proveedor.id, form.value)
      notifySuccess(`Proveedor "${resultado.nombre}" actualizado`)
    } else {
      resultado = await store.create(form.value)
      notifySuccess(`Proveedor "${resultado.nombre}" creado`)
    }
    emit('saved', resultado)
  } catch (e) { notifyError((e as Error).message) }
}
</script>
