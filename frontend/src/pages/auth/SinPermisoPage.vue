<template>
  <q-page class="flex flex-center sgi-page">
    <div class="text-center">
      <q-icon name="lock" size="80px" color="warning" />
      <div class="text-h5 text-weight-bold q-mt-md">Sin permiso</div>
      <div class="text-body1 text-muted q-mt-sm q-mb-xl">
        No tienes acceso a esta sección.
      </div>
      <q-btn label="Volver al inicio" color="primary" unelevated :to="{ name: 'dashboard' }" />
    </div>
  </q-page>
</template>
