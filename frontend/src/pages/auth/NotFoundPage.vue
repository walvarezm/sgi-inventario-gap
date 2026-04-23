<template>
  <q-page class="flex flex-center sgi-page">
    <div class="text-center">
      <div class="text-h1 text-weight-black text-primary" style="font-size: 6rem; opacity: 0.15">
        404
      </div>
      <div class="text-h5 text-weight-bold q-mt-md">Página no encontrada</div>
      <div class="text-body1 text-muted q-mt-sm q-mb-xl">
        La ruta <code>{{ $route.fullPath }}</code> no existe.
      </div>
      <q-btn label="Ir al Dashboard" color="primary" unelevated :to="{ name: 'dashboard' }" />
    </div>
  </q-page>
</template>
