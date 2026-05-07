<template>
  <q-card class="sgi-card" style="width: 880px; max-width: 96vw">
    <q-card-section class="row items-center q-pb-none">
      <div class="text-h6 text-weight-bold">
        {{ isEdit ? 'Editar rol' : 'Nuevo rol' }}
      </div>
      <q-space />
      <q-btn icon="close" flat round dense v-close-popup />
    </q-card-section>

    <q-card-section>
      <q-form ref="formRef" @submit.prevent="handleSubmit">
        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-4">
            <q-input
              v-model="form.codigo"
              label="Código *"
              outlined
              dense
              :disable="isEdit"
              :rules="[required, minLength(3)]"
              hint="Ej. CONSULTA_CATALOGO"
            />
          </div>
          <div class="col-12 col-md-4">
            <q-input
              v-model="form.nombre"
              label="Nombre *"
              outlined
              dense
              :rules="[required, minLength(3)]"
            />
          </div>
          <div class="col-12 col-md-4 flex items-center">
            <q-toggle v-model="form.activo" label="Rol activo" color="positive" />
          </div>

          <div class="col-12">
            <q-input
              v-model="form.descripcion"
              label="Descripción"
              outlined
              dense
              type="textarea"
              rows="2"
              autogrow
            />
          </div>

          <div class="col-12">
            <q-select
              v-model="form.permisos"
              :options="rolStore.permissionOptions"
              label="Permisos"
              outlined
              dense
              emit-value
              map-options
              multiple
              use-chips
              use-input
              input-debounce="0"
              :loading="rolStore.loading"
            />
          </div>
        </div>
      </q-form>
    </q-card-section>

    <q-card-actions align="right" class="q-px-md q-pb-md">
      <q-btn label="Cancelar" flat color="grey" v-close-popup />
      <q-btn
        :label="isEdit ? 'Guardar cambios' : 'Crear rol'"
        color="primary"
        unelevated
        :loading="rolStore.saving"
        @click="handleSubmit"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { QForm } from 'quasar'
import type { RoleEntity } from 'src/types'
import { useNotify } from 'src/composables/useNotify'
import { minLength, required } from 'src/utils/validators'
import { useRolStore } from 'src/stores/rolStore'

interface Props {
  role?: RoleEntity | null
}

interface RoleEditableForm {
  codigo: string
  nombre: string
  descripcion: string
  activo: boolean
  permisos: string[]
}

const props = withDefaults(defineProps<Props>(), { role: null })
const emit = defineEmits<{ saved: [role: RoleEntity]; cancelled: [] }>()

const rolStore = useRolStore()
const { notifyError, notifySuccess } = useNotify()
const formRef = ref<InstanceType<typeof QForm> | null>(null)

const isEdit = computed(() => !!props.role)
const form = ref<RoleEditableForm>({
  codigo: '',
  nombre: '',
  descripcion: '',
  activo: true,
  permisos: [],
})

watch(
  () => props.role,
  async (role) => {
    if (role) {
      const permisos = rolStore.rolePermissions[role.id] || await rolStore.loadRolePermissions(role.id)
      form.value = {
        codigo: role.codigo,
        nombre: role.nombre,
        descripcion: role.descripcion,
        activo: role.activo,
        permisos: [...permisos],
      }
    } else {
      form.value = {
        codigo: '',
        nombre: '',
        descripcion: '',
        activo: true,
        permisos: [],
      }
    }
  },
  { immediate: true },
)

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate()
  if (!valid) return

  try {
    let role: RoleEntity
    const payload = {
      codigo: form.value.codigo,
      nombre: form.value.nombre,
      descripcion: form.value.descripcion,
      activo: form.value.activo,
    }

    if (props.role) {
      role = await rolStore.update(props.role.id, payload)
      await rolStore.saveRolePermissions(role.id, form.value.permisos)
      notifySuccess(`Rol "${role.nombre}" actualizado`)
    } else {
      role = await rolStore.create(payload)
      await rolStore.saveRolePermissions(role.id, form.value.permisos)
      notifySuccess(`Rol "${role.nombre}" creado`)
    }

    emit('saved', role)
  } catch (e) {
    notifyError((e as Error).message)
  }
}

onMounted(async () => {
  if (!rolStore.roles.length || !rolStore.permissions.length) await rolStore.fetchAll()
})
</script>
