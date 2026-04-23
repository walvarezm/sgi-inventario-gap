<template>
  <q-layout view="lHh lpr lFf" class="auth-layout">
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
// AuthLayout — Layout minimalista para login/registro
</script>

<style scoped lang="scss">
.auth-layout {
  background: linear-gradient(135deg, #0f0c29 0%, #1565c0 50%, #0288d1 100%);
  min-height: 100vh;
}
</style>
