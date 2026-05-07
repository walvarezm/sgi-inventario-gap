<template>
  <q-card class="sgi-card" style="width: 920px; max-width: 96vw">
    <q-card-section class="row items-center q-pb-none">
      <div class="text-h6 text-weight-bold">
        {{ isEdit ? 'Editar usuario' : 'Nuevo usuario' }}
      </div>
      <q-space />
      <q-btn icon="close" flat round dense v-close-popup />
    </q-card-section>

    <q-card-section>
      <q-form ref="formRef" @submit.prevent="handleSubmit">
        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-6">
            <q-input
              v-model="form.nombre"
              label="Nombre completo *"
              outlined
              dense
              :rules="[required, minLength(3)]"
            />
          </div>
          <div class="col-12 col-md-6">
            <q-input
              v-model="form.email"
              label="Email *"
              outlined
              dense
              :rules="[required, emailValid]"
            />
          </div>

          <div class="col-12 col-md-6">
            <q-input
              v-model="form.password"
              :label="isEdit ? 'Nueva contraseña (opcional)' : 'Contraseña *'"
              outlined
              dense
              :type="showPassword ? 'text' : 'password'"
              :rules="isEdit ? [] : [required, minLength(8)]"
            >
              <template #append>
                <q-icon
                  :name="showPassword ? 'visibility_off' : 'visibility'"
                  class="cursor-pointer"
                  @click="showPassword = !showPassword"
                />
              </template>
            </q-input>
          </div>

          <div class="col-12 col-md-6 flex items-center">
            <q-toggle v-model="form.activo" label="Usuario activo" color="positive" />
          </div>

          <div class="col-12 col-md-6">
            <q-select
              v-model="form.roles"
              :options="rolStore.roleOptions"
              label="Roles *"
              outlined
              dense
              emit-value
              map-options
              multiple
              use-chips
              :rules="[rolesRequired]"
              :loading="rolStore.loading"
            />
          </div>

          <div class="col-12 col-md-6">
            <q-select
              v-model="form.scopeType"
              :options="scopeOptions"
              label="Ámbito *"
              outlined
              dense
              emit-value
              map-options
              :rules="[required]"
            />
          </div>

          <div class="col-12 col-md-6">
            <q-select
              v-model="form.sucursalDefault"
              :options="sucursalStore.options"
              label="Sucursal por defecto"
              outlined
              dense
              emit-value
              map-options
              clearable
              :disable="isGlobalScope"
              :rules="isGlobalScope ? [] : [required]"
            />
          </div>

          <div class="col-12 col-md-6">
            <q-select
              v-model="form.scopeValues"
              :options="scopeSucursalOptions"
              label="Sucursales autorizadas"
              outlined
              dense
              emit-value
              map-options
              multiple
              use-chips
              :disable="isGlobalScope"
              :rules="isGlobalScope ? [] : [scopeValuesRequired]"
            />
          </div>
        </div>
      </q-form>
    </q-card-section>

    <q-card-actions align="right" class="q-px-md q-pb-md">
      <q-btn label="Cancelar" flat color="grey" v-close-popup />
      <q-btn
        :label="isEdit ? 'Guardar cambios' : 'Crear usuario'"
        color="primary"
        unelevated
        :loading="usuarioStore.saving"
        @click="handleSubmit"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { QForm } from 'quasar'
import type { Usuario } from 'src/types'
import { useNotify } from 'src/composables/useNotify'
import { emailValid, minLength, required } from 'src/utils/validators'
import { useRolStore } from 'src/stores/rolStore'
import { useSucursalStore } from 'src/stores/sucursalStore'
import { useUsuarioStore } from 'src/stores/usuarioStore'

interface Props {
  usuario?: Usuario | null
}

interface UsuarioEditableForm {
  nombre: string
  email: string
  password: string
  activo: boolean
  roles: string[]
  scopeType: string
  sucursalDefault: string
  scopeValues: string[]
}

const props = withDefaults(defineProps<Props>(), { usuario: null })
const emit = defineEmits<{ saved: [usuario: Usuario]; cancelled: [] }>()

const usuarioStore = useUsuarioStore()
const rolStore = useRolStore()
const sucursalStore = useSucursalStore()
const { notifyError, notifySuccess } = useNotify()

const formRef = ref<InstanceType<typeof QForm> | null>(null)
const isEdit = computed(() => !!props.usuario)
const showPassword = ref(false)

const scopeOptions = [
  { label: 'Global', value: 'GLOBAL' },
  { label: 'Sucursal propia', value: 'SUCURSAL_PROPIA' },
  { label: 'Multi sucursal', value: 'MULTI_SUCURSAL' },
  { label: 'Sucursal específica', value: 'SUCURSAL_ESPECIFICA' },
]

const defaultForm = (): UsuarioEditableForm => ({
  nombre: '',
  email: '',
  password: '',
  activo: true,
  roles: [],
  scopeType: 'SUCURSAL_PROPIA',
  sucursalDefault: '',
  scopeValues: [],
})

const form = ref<UsuarioEditableForm>(defaultForm())

const isGlobalScope = computed(() => form.value.scopeType === 'GLOBAL')
const scopeSucursalOptions = computed(() => sucursalStore.options)

const rolesRequired = (val: unknown): boolean | string =>
  Array.isArray(val) && val.length > 0 || 'Selecciona al menos un rol'

const scopeValuesRequired = (val: unknown): boolean | string =>
  Array.isArray(val) && val.length > 0 || 'Selecciona al menos una sucursal'

watch(
  () => props.usuario,
  (usuario) => {
    form.value = usuario
      ? {
          nombre: usuario.nombre,
          email: usuario.email,
          password: '',
          activo: usuario.activo,
          roles: (usuario.roles || [usuario.rol]).map((role) => String(role)),
          scopeType: usuario.scopeType || (usuario.sucursalId === 'ALL' ? 'GLOBAL' : 'SUCURSAL_PROPIA'),
          sucursalDefault: usuario.sucursalDefault || usuario.sucursalId || '',
          scopeValues: usuario.accessibleSucursales?.filter((id) => id !== 'ALL') || (usuario.sucursalId && usuario.sucursalId !== 'ALL' ? [usuario.sucursalId] : []),
        }
      : defaultForm()
  },
  { immediate: true },
)

watch(
  () => form.value.scopeType,
  (scopeType) => {
    if (scopeType === 'GLOBAL') {
      form.value.sucursalDefault = 'ALL'
      form.value.scopeValues = ['ALL']
    } else if (form.value.scopeValues.includes('ALL')) {
      form.value.scopeValues = []
      form.value.sucursalDefault = ''
    }
  },
)

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate()
  if (!valid) return

  try {
    let result: Usuario
    const payload = {
      nombre: form.value.nombre,
      email: form.value.email,
      password: form.value.password || undefined,
      activo: form.value.activo,
      roles: form.value.roles,
      rol: form.value.roles[0],
      scopeType: form.value.scopeType,
      sucursalDefault: isGlobalScope.value ? 'ALL' : form.value.sucursalDefault,
      sucursalId: isGlobalScope.value ? 'ALL' : form.value.sucursalDefault,
      scopeValues: isGlobalScope.value ? ['ALL'] : form.value.scopeValues,
    }

    if (props.usuario) {
      result = await usuarioStore.update(props.usuario.id, payload)
      notifySuccess(`Usuario "${result.nombre}" actualizado`)
    } else {
      result = await usuarioStore.create(payload)
      notifySuccess(`Usuario "${result.nombre}" creado`)
    }
    emit('saved', result)
  } catch (e) {
    notifyError((e as Error).message)
  }
}

onMounted(async () => {
  if (!rolStore.roles.length || !rolStore.permissions.length) await rolStore.fetchAll()
  if (!sucursalStore.items.length) await sucursalStore.fetchAll()
})
</script>
