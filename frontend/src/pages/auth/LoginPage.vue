<template>
  <q-page class="login-page flex flex-center">
    <div class="login-card">
      <div class="login-brand q-mb-lg text-center">
        <div class="login-brand__icon">
          <q-icon name="inventory_2" size="42px" />
        </div>
        <div class="text-h4 text-weight-bold q-mt-md">SGI - MAXEL</div>
        <div class="text-subtitle2 text-muted">Sistema de Gestión de Inventarios</div>
      </div>

      <q-card class="login-form-card" flat>
        <q-card-section class="q-pa-xl">
          <div class="text-h6 text-weight-bold q-mb-lg">Iniciar sesión</div>
          <q-form @submit.prevent="handleLogin" class="q-gutter-md">
            <q-input
              v-model="form.email"
              label="Correo electrónico"
              type="email"
              outlined dense
              :rules="[required, emailValid]"
              autocomplete="username"
            >
              <template #prepend><q-icon name="email" /></template>
            </q-input>

            <q-input
              v-model="form.password"
              label="Contraseña"
              :type="showPass ? 'text' : 'password'"
              outlined dense
              :rules="[required]"
              autocomplete="current-password"
            >
              <template #prepend><q-icon name="lock" /></template>
              <template #append>
                <q-icon
                  :name="showPass ? 'visibility_off' : 'visibility'"
                  class="cursor-pointer"
                  @click="showPass = !showPass"
                />
              </template>
            </q-input>

            <q-banner v-if="authStore.error" class="text-negative bg-negative-1 rounded-borders" dense>
              <template #avatar><q-icon name="error" /></template>
              {{ authStore.error }}
            </q-banner>

            <q-btn
              type="submit" label="Ingresar" color="primary"
              unelevated size="md" class="full-width q-mt-sm"
              :loading="authStore.loading"
            />
          </q-form>
        </q-card-section>
      </q-card>

      <div class="text-caption text-center q-mt-md login-footer">
        SGI v{{ appVersion }} — {{ new Date().getFullYear() }}
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from 'src/stores/authStore'
import { required, emailValid } from 'src/utils/validators'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const form = ref({ email: '', password: '' })
const showPass = ref(false)
const appVersion = computed(() => import.meta.env.VITE_APP_VERSION)

async function handleLogin(): Promise<void> {
  await authStore.login(form.value)
  const redirect = (route.query.redirect as string) || '/dashboard'
  await router.push(redirect)
}
</script>

<style scoped lang="scss">
.login-page {
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.18), transparent 24%),
    linear-gradient(180deg, color-mix(in srgb, var(--sgi-surface-alt) 82%, transparent), var(--sgi-surface-alt));
  min-height: 100vh;
}

.login-card {
  width: 100%;
  max-width: 440px;
  padding: 24px 16px;
}

.login-brand {
  color: var(--sgi-text);
}

.login-brand__icon {
  display: inline-grid;
  place-items: center;
  width: 78px;
  height: 78px;
  border-radius: 24px;
  margin: 0 auto;
  background: color-mix(in srgb, var(--sgi-surface) 88%, transparent);
  border: 1px solid var(--sgi-border);
  color: var(--sgi-primary);
  box-shadow: var(--sgi-shadow);
}

.login-form-card {
  border-radius: 24px;
  box-shadow: var(--sgi-shadow-lg);
}

.login-footer {
  color: var(--sgi-text-muted);
}

.bg-negative-1 {
  background: rgba(198, 40, 40, 0.08);
  border: 1px solid rgba(198, 40, 40, 0.3);
}

@media (max-width: 600px) {
  .login-card {
    max-width: 100%;
    padding: 12px;
  }

  .login-form-card :deep(.q-card__section) {
    padding: 20px 18px;
  }
}
</style>
