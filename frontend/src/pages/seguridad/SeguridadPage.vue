<template>
  <q-page class="sgi-page">
    <div class="row items-center q-mb-lg">
      <div>
        <div class="sgi-page-title">Seguridad</div>
        <div class="text-muted text-body2 q-mt-xs">
          Gestión de usuarios, roles, accesos y permisos
        </div>
      </div>
      <q-space />
      <div class="row q-gutter-sm">
        <q-btn
          v-if="authStore.can('usuarios.crear')"
          label="Nuevo usuario"
          icon="person_add"
          color="primary"
          unelevated
          @click="abrirUsuario()"
        />
        <q-btn
          v-if="authStore.can('roles.crear')"
          label="Nuevo rol"
          icon="admin_panel_settings"
          color="secondary"
          unelevated
          @click="abrirRol()"
        />
      </div>
    </div>

    <q-card class="sgi-card" flat>
      <q-tabs v-model="tab" dense align="left" class="q-px-md q-pt-sm">
        <q-tab v-if="authStore.can('usuarios.ver')" name="usuarios" icon="people" label="Usuarios" />
        <q-tab v-if="authStore.can('roles.ver')" name="roles" icon="security" label="Roles" />
      </q-tabs>
      <q-separator />

      <q-tab-panels v-model="tab" animated>
        <q-tab-panel name="usuarios" class="q-pa-md">
          <q-card class="sgi-card q-mb-md" flat>
            <q-expansion-item
              icon="tune"
              label="Filtros de usuarios"
              caption="Busca y filtra usuarios por estado"
              expand-separator
              :default-opened="!esMovil"
              header-class="sgi-filter-toggle"
            >
            <q-card-section class="row items-center q-col-gutter-sm sgi-filter-body">
              <div class="col-12 col-sm-4">
                <q-input v-model="busquedaUsuarios" placeholder="Buscar usuario…" outlined dense clearable>
                  <template #prepend><q-icon name="search" /></template>
                </q-input>
              </div>
              <div class="col-12 col-sm-3">
                <q-select
                  v-model="filtroUsuarioActivo"
                  :options="opcionesEstado"
                  label="Estado"
                  outlined
                  dense
                  emit-value
                  map-options
                  clearable
                />
              </div>
              <div class="col-auto">
                <q-btn flat round icon="refresh" color="primary" :loading="usuarioStore.loading" @click="usuarioStore.fetchAll()">
                  <q-tooltip>Recargar usuarios</q-tooltip>
                </q-btn>
              </div>
            </q-card-section>
            </q-expansion-item>
          </q-card>

          <q-table
            :rows="usuariosFiltrados"
            :columns="usuarioColumns"
            :loading="usuarioStore.loading"
            row-key="id"
            flat
            class="sgi-table"
            :pagination="{ rowsPerPage: 12 }"
            no-data-label="No hay usuarios registrados"
          >
            <template #body-cell-roles="{ row }">
              <q-td>
                <div class="row q-gutter-xs">
                  <q-chip
                    v-for="role in row.roles"
                    :key="role"
                    dense
                    size="sm"
                    color="blue-1"
                    text-color="blue-9"
                  >
                    {{ role }}
                  </q-chip>
                </div>
              </q-td>
            </template>

            <template #body-cell-scopeType="{ row }">
              <q-td>
                <q-chip dense size="sm" color="grey-2" text-color="grey-8">
                  {{ row.scopeType || '—' }}
                </q-chip>
              </q-td>
            </template>

            <template #body-cell-sucursalDefault="{ row }">
              <q-td>{{ formatSucursal(row.sucursalDefault || row.sucursalId) }}</q-td>
            </template>

            <template #body-cell-activo="{ value }">
              <q-td>
                <q-chip
                  :color="value ? 'positive' : 'grey-4'"
                  :text-color="value ? 'white' : 'grey-7'"
                  :label="value ? 'Activo' : 'Inactivo'"
                  dense
                  size="sm"
                />
              </q-td>
            </template>

            <template #body-cell-acciones="{ row }">
              <q-td class="text-right">
                <q-btn
                  v-if="authStore.can('usuarios.editar')"
                  flat round dense icon="edit" color="primary" size="sm"
                  @click="abrirUsuario(row)"
                >
                  <q-tooltip>Editar</q-tooltip>
                </q-btn>
                <q-btn
                  v-if="authStore.can('usuarios.desactivar')"
                  flat round dense icon="person_off" color="negative" size="sm"
                  @click="confirmarDesactivarUsuario(row)"
                >
                  <q-tooltip>Desactivar</q-tooltip>
                </q-btn>
              </q-td>
            </template>
          </q-table>
        </q-tab-panel>

        <q-tab-panel name="roles" class="q-pa-md">
          <q-card class="sgi-card q-mb-md" flat>
            <q-expansion-item
              icon="tune"
              label="Filtros de roles"
              caption="Busca roles rápidamente"
              expand-separator
              :default-opened="!esMovil"
              header-class="sgi-filter-toggle"
            >
            <q-card-section class="row items-center q-col-gutter-sm sgi-filter-body">
              <div class="col-12 col-sm-4">
                <q-input v-model="busquedaRoles" placeholder="Buscar rol…" outlined dense clearable>
                  <template #prepend><q-icon name="search" /></template>
                </q-input>
              </div>
              <div class="col-auto">
                <q-btn flat round icon="refresh" color="primary" :loading="rolStore.loading" @click="rolStore.fetchAll()">
                  <q-tooltip>Recargar roles</q-tooltip>
                </q-btn>
              </div>
            </q-card-section>
            </q-expansion-item>
          </q-card>

          <q-table
            :rows="rolesFiltrados"
            :columns="roleColumns"
            :loading="rolStore.loading"
            row-key="id"
            flat
            class="sgi-table"
            :pagination="{ rowsPerPage: 12 }"
            no-data-label="No hay roles registrados"
          >
            <template #body-cell-activo="{ value }">
              <q-td>
                <q-chip
                  :color="value ? 'positive' : 'grey-4'"
                  :text-color="value ? 'white' : 'grey-7'"
                  :label="value ? 'Activo' : 'Inactivo'"
                  dense
                  size="sm"
                />
              </q-td>
            </template>

            <template #body-cell-acciones="{ row }">
              <q-td class="text-right">
                <q-btn
                  v-if="authStore.can('roles.editar')"
                  flat round dense icon="edit" color="primary" size="sm"
                  @click="abrirRol(row)"
                >
                  <q-tooltip>Editar</q-tooltip>
                </q-btn>
                <q-btn
                  v-if="authStore.can('roles.desactivar')"
                  flat round dense icon="block" color="negative" size="sm"
                  @click="confirmarDesactivarRol(row)"
                >
                  <q-tooltip>Desactivar</q-tooltip>
                </q-btn>
              </q-td>
            </template>
          </q-table>
        </q-tab-panel>
      </q-tab-panels>
    </q-card>

    <q-dialog v-model="dialogUsuario" persistent>
      <UsuarioForm :usuario="usuarioEditar" @saved="onUsuarioSaved" @cancelled="dialogUsuario = false" />
    </q-dialog>

    <q-dialog v-model="dialogRol" persistent>
      <RolForm :role="rolEditar" @saved="onRolSaved" @cancelled="dialogRol = false" />
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import type { QTableColumn } from 'quasar'
import type { RoleEntity, Usuario } from 'src/types'
import { useNotify } from 'src/composables/useNotify'
import { useAuthStore } from 'src/stores/authStore'
import { useRolStore } from 'src/stores/rolStore'
import { useSucursalStore } from 'src/stores/sucursalStore'
import { useUsuarioStore } from 'src/stores/usuarioStore'
import RolForm from 'src/components/seguridad/RolForm.vue'
import UsuarioForm from 'src/components/seguridad/UsuarioForm.vue'

const authStore = useAuthStore()
const usuarioStore = useUsuarioStore()
const rolStore = useRolStore()
const sucursalStore = useSucursalStore()
const { notifyError, notifySuccess } = useNotify()
const $q = useQuasar()
const esMovil = computed(() => $q.screen.lt.md)

const tab = ref(authStore.can('usuarios.ver') ? 'usuarios' : 'roles')
const busquedaUsuarios = ref('')
const busquedaRoles = ref('')
const filtroUsuarioActivo = ref<boolean | null>(null)
const dialogUsuario = ref(false)
const dialogRol = ref(false)
const usuarioEditar = ref<Usuario | null>(null)
const rolEditar = ref<RoleEntity | null>(null)

const opcionesEstado = [
  { label: 'Activos', value: true },
  { label: 'Inactivos', value: false },
]

const usuariosFiltrados = computed(() => {
  let lista = usuarioStore.items
  if (filtroUsuarioActivo.value !== null) lista = lista.filter((u) => u.activo === filtroUsuarioActivo.value)
  if (busquedaUsuarios.value.trim()) {
    const q = busquedaUsuarios.value.toLowerCase()
    lista = lista.filter((u) =>
      u.nombre.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.roles || [u.rol]).some((role) => String(role).toLowerCase().includes(q)),
    )
  }
  return lista
})

const rolesFiltrados = computed(() => {
  let lista = rolStore.roles
  if (busquedaRoles.value.trim()) {
    const q = busquedaRoles.value.toLowerCase()
    lista = lista.filter((r) =>
      r.codigo.toLowerCase().includes(q) ||
      r.nombre.toLowerCase().includes(q) ||
      r.descripcion.toLowerCase().includes(q),
    )
  }
  return lista
})

const usuarioColumns: QTableColumn[] = [
  { name: 'nombre', label: 'Nombre', field: 'nombre', align: 'left', sortable: true },
  { name: 'email', label: 'Email', field: 'email', align: 'left', sortable: true },
  { name: 'roles', label: 'Roles', field: 'roles', align: 'left' },
  { name: 'scopeType', label: 'Ámbito', field: 'scopeType', align: 'left' },
  { name: 'sucursalDefault', label: 'Sucursal por defecto', field: 'sucursalDefault', align: 'left' },
  { name: 'activo', label: 'Estado', field: 'activo', align: 'center', sortable: true },
  { name: 'acciones', label: 'Acciones', field: 'id', align: 'right' },
]

const roleColumns: QTableColumn[] = [
  { name: 'codigo', label: 'Código', field: 'codigo', align: 'left', sortable: true },
  { name: 'nombre', label: 'Nombre', field: 'nombre', align: 'left', sortable: true },
  { name: 'descripcion', label: 'Descripción', field: 'descripcion', align: 'left' },
  { name: 'activo', label: 'Estado', field: 'activo', align: 'center', sortable: true },
  { name: 'acciones', label: 'Acciones', field: 'id', align: 'right' },
]

function abrirUsuario(usuario?: Usuario): void {
  usuarioEditar.value = usuario ?? null
  dialogUsuario.value = true
}

function abrirRol(role?: RoleEntity): void {
  rolEditar.value = role ?? null
  dialogRol.value = true
}

function onUsuarioSaved(): void {
  dialogUsuario.value = false
}

function onRolSaved(): void {
  dialogRol.value = false
}

function formatSucursal(id: string): string {
  if (!id || id === 'ALL') return 'Global'
  const sucursal = sucursalStore.getById(id)
  return sucursal ? sucursal.nombre : id
}

function confirmarDesactivarUsuario(usuario: Usuario): void {
  $q.dialog({
    title: 'Desactivar usuario',
    message: `¿Desactivar al usuario <strong>${usuario.nombre}</strong>?`,
    html: true,
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Desactivar', color: 'negative', unelevated: true },
  }).onOk(async () => {
    try {
      await usuarioStore.remove(usuario.id)
      notifySuccess(`Usuario "${usuario.nombre}" desactivado`)
    } catch (e) {
      notifyError((e as Error).message)
    }
  })
}

function confirmarDesactivarRol(role: RoleEntity): void {
  $q.dialog({
    title: 'Desactivar rol',
    message: `¿Desactivar el rol <strong>${role.nombre}</strong>?`,
    html: true,
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Desactivar', color: 'negative', unelevated: true },
  }).onOk(async () => {
    try {
      await rolStore.remove(role.id)
      notifySuccess(`Rol "${role.nombre}" desactivado`)
    } catch (e) {
      notifyError((e as Error).message)
    }
  })
}

onMounted(async () => {
  await Promise.all([
    sucursalStore.items.length ? Promise.resolve() : sucursalStore.fetchAll(),
    rolStore.fetchAll(),
    usuarioStore.fetchAll(),
  ])
})
</script>
