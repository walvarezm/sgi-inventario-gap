<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { QForm } from 'quasar'
import { inventarioService } from 'src/services/inventarioService'
import type { Producto, ProductoCatalogo } from 'src/types'
import { useNotify } from 'src/composables/useNotify'
import { minLength, nonNegativeNumber, required } from 'src/utils/validators'
import { useProductoStore } from 'src/stores/productoStore'
import { formatNotCurrency } from 'src/utils/formatters'

interface Props {
  producto: ProductoCatalogo | null
}

interface CatalogoEditableForm {
  id: string
  sku: string
  marca: string
  nombre: string
  descripcion: string
  precioCompra: number
  precioOfrecido: number
  precioFinal: number
  sucursalId: string
}

const props = defineProps<Props>()
const emit = defineEmits<{ saved: [producto: Producto | null]; cancelled: [] }>()
const productoStore = useProductoStore()
const { notifyError, notifySuccess } = useNotify()
const formRef = ref<InstanceType<typeof QForm> | null>(null)
const saving = ref(false)

const form = ref<CatalogoEditableForm>({
  id: '',
  sku: '',
  marca: '',
  nombre: '',
  descripcion: '',
  precioCompra: 0,
  precioOfrecido: 0,
  precioFinal: 0,
  sucursalId: '',
})

const hasDiscount = computed(
  () => Number(form.value.precioOfrecido) > Number(form.value.precioFinal),
)
const marginPct = computed(() => {
  const compra = Number(form.value.precioCompra) || 0
  const final = Number(form.value.precioFinal) || 0
  if (compra <= 0) return 0
  return ((final - compra) / compra) * 100
})

const marginPctDesc = computed(() => {
  const ofrecido = Number(form.value.precioOfrecido) || 0
  const final = Number(form.value.precioFinal) || 0
  if (final <= 0) return 0
  return ((ofrecido - final) / ofrecido) * 100
  //return Number(((ofrecido - final) / ofrecido).toFixed(2)) * 100
})

function applyPctToFinal(pct: number): void {
  const v =
    (Number(form.value.precioCompra) || 0) + (Number(form.value.precioCompra) || 0) * (pct / 100)
  form.value.precioOfrecido = Number(v.toFixed(2))
  const d = (Number(v) || 0) - (Number(v) || 0) * (pct / 1000)
  form.value.precioFinal = Number(d.toFixed(2))
}

watch(
  () => props.producto,
  (producto) => {
    form.value = producto
      ? {
          id: producto.id,
          sku: producto.sku,
          marca: producto.marca,
          nombre: producto.nombre,
          descripcion: producto.descripcion || '',
          precioCompra: Number(producto.precioCompra) || 0,
          precioOfrecido: Number(producto.precioOfrecido) || 0,
          precioFinal: Number(producto.precioFinal) || 0,
          sucursalId: producto.sucursalId || '',
        }
      : {
          id: '',
          sku: '',
          marca: '',
          nombre: '',
          descripcion: '',
          precioCompra: 0,
          precioOfrecido: 0,
          precioFinal: 0,
          sucursalId: '',
        }
  },
  { immediate: true },
)

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate()
  if (!valid || !props.producto) return
  saving.value = true
  try {
    if (props.producto.precioUsaBase) {
      const actualizado = await productoStore.update(props.producto.id, {
        nombre: form.value.nombre,
        descripcion: form.value.descripcion,
        precioCompra: form.value.precioCompra,
        precioOfrecido: form.value.precioOfrecido,
        precioFinal: form.value.precioFinal,
      })
      notifySuccess(`Producto "${actualizado.nombre}" actualizado`)
      emit('saved', actualizado)
    } else {
      const actualizado = await inventarioService.updatePreciosSucursal({
        productoId: props.producto.id,
        sucursalId: props.producto.sucursalId,
        precioOfrecido: form.value.precioOfrecido,
        precioFinal: form.value.precioFinal,
        precioUsaBase: props.producto.precioUsaBase,
      })
      notifySuccess(`Producto de Inventario "${actualizado.productoId}" actualizado`)
      emit('saved', null)
    }
  } catch (e) {
    notifyError((e as Error).message)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <q-card class="catalogo-edit-card sgi-card" flat>
    <q-card-section class="catalogo-edit-card__head">
      <div class="catalogo-edit-card__head-icon">
        <q-icon name="edit" size="22px" />
      </div>
      <div class="catalogo-edit-card__head-text">
        <h2 class="catalogo-edit-card__title">Editar producto</h2>
        <span class="catalogo-edit-card__subtitle">
          <span class="catalogo-edit-card__sku-chip">{{ form.sku }}</span>
          <span>·</span>
          <span>{{ form.marca }}</span>
        </span>
      </div>
      <q-space />
      <q-btn icon="close" flat round dense v-close-popup aria-label="Cerrar" />
    </q-card-section>

    <q-separator />

    <q-card-section class="catalogo-edit-card__body">
      <q-form ref="formRef" class="catalogo-edit-card__form" @submit.prevent="handleSubmit">
        <!-- Identity -->
        <div class="catalogo-edit-card__section">
          <div class="catalogo-edit-card__section-title">
            <q-icon name="badge" size="16px" />
            Identidad
          </div>
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-input
                v-model="form.nombre"
                label="Nombre del producto *"
                outlined
                dense
                type="textarea"
                :rules="[required, minLength(3)]"
                :autogrow="true"
                input-class="text-body2"
              />
            </div>
            <div class="col-12 col-md-6">
              <q-input
                v-model="form.descripcion"
                label="Descripción"
                outlined
                dense
                type="textarea"
                :autogrow="true"
              />
            </div>
          </div>
        </div>

        <!-- Prices -->
        <div class="catalogo-edit-card__section">
          <div class="catalogo-edit-card__section-title">
            <q-icon name="payments" size="16px" />
            Precios (Bs.)
          </div>
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-4">
              <q-input
                v-model.number="form.precioCompra"
                label="Precio compra *"
                outlined
                dense
                type="number"
                step="0.01"
                input-class="text-right text-body1 text-weight-bold"
                :rules="[required, nonNegativeNumber]"
              >
                <template #prepend><span class="text-muted text-caption">Bs.</span></template>
              </q-input>
            </div>
            <div class="col-12 col-md-4">
              <q-input
                v-model.number="form.precioOfrecido"
                label="Precio lista"
                outlined
                dense
                type="number"
                step="0.01"
                input-class="text-right text-body1 text-weight-bold"
                :rules="[nonNegativeNumber]"
              >
                <template #prepend><span class="text-muted text-caption">Bs.</span></template>
              </q-input>
            </div>
            <div class="col-12 col-md-4">
              <q-input
                v-model.number="form.precioFinal"
                label="Precio venta *"
                outlined
                dense
                type="number"
                step="0.01"
                input-class="text-right text-body1 text-weight-bold"
                :rules="[required, nonNegativeNumber]"
              >
                <template #prepend><span class="text-muted text-caption">Bs.</span></template>
              </q-input>
            </div>
          </div>

          <!-- Margin helper -->
          <div class="catalogo-edit-card__margin">
            <div class="catalogo-edit-card__margin-info">
              <q-icon name="trending_up" size="16px" />
              <span class="text-caption text-muted">Margen sobre compra</span>
              <span
                class="catalogo-edit-card__margin-value"
                :class="marginPct >= 0 ? 'text-positive' : 'text-negative'"
              >
                {{ marginPct.toFixed(1) }}%
              </span>
            </div>
            <div class="catalogo-edit-card__margin-presets">
              <span class="text-caption text-muted q-mr-sm">Aplicar al venta:</span>
              <q-btn
                unelevated
                dense
                size="sm"
                no-caps
                color="grey-3"
                text-color="grey-9"
                label="+20%"
                @click="applyPctToFinal(20)"
              />
              <q-btn
                unelevated
                dense
                size="sm"
                no-caps
                color="grey-3"
                text-color="grey-9"
                label="+30%"
                @click="applyPctToFinal(30)"
              />
              <q-btn
                unelevated
                dense
                size="sm"
                no-caps
                color="grey-3"
                text-color="grey-9"
                label="+50%"
                @click="applyPctToFinal(50)"
              />
            </div>
          </div>

          <div v-if="hasDiscount" class="catalogo-edit-card__discount-hint">
            <q-icon name="sell" size="16px" />
            Descuento activo:
            <strong>{{ formatNotCurrency(form.precioOfrecido - form.precioFinal) }} Bs</strong>
            <strong>({{ marginPctDesc.toFixed(2) }}%)</strong>
            menos que el precio de lista.
          </div>
        </div>
      </q-form>
    </q-card-section>

    <q-separator />

    <q-card-actions class="catalogo-edit-card__actions">
      <q-btn
        label="Cancelar"
        color="negative"
        unelevated
        no-caps
        v-close-popup
        @click="emit('cancelled')"
      />
      <q-btn
        label="Guardar cambios"
        color="primary"
        unelevated
        no-caps
        :loading="saving"
        icon="check"
        @click="handleSubmit"
      />
    </q-card-actions>
  </q-card>
</template>

<style scoped lang="scss">
.catalogo-edit-card {
  width: 100%;
  max-width: 720px;
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  border-radius: 18px !important;
  overflow: hidden;
}

.catalogo-edit-card__head {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 8px 22px;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--sgi-primary) 8%, transparent),
    transparent 60%
  );
}

.catalogo-edit-card__head-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--sgi-primary) 14%, transparent);
  color: var(--sgi-primary);
}

.catalogo-edit-card__head-text {
  display: flex;
  align-items: stretch;
  gap: 24px;
}

.catalogo-edit-card__title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--sgi-text);
  letter-spacing: -0.01em;
}

.catalogo-edit-card__subtitle {
  margin: 1px 0 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--sgi-text-muted);
  font-size: 0.88rem;
  font-weight: 700;
}

.catalogo-edit-card__sku-chip {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-weight: 800;
  color: var(--sgi-primary);
  background: color-mix(in srgb, var(--sgi-primary) 12%, transparent);
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.98rem;
}

.catalogo-edit-card__body {
  padding: 22px;
  overflow-y: auto;
  flex: 1;
}

.catalogo-edit-card__form {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.catalogo-edit-card__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.catalogo-edit-card__section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--sgi-text-muted);
}

.catalogo-edit-card__margin {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px 14px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--sgi-info) 8%, transparent);
  border: 1px dashed color-mix(in srgb, var(--sgi-info) 35%, var(--sgi-border));
}

.catalogo-edit-card__margin-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--sgi-info);
}

.catalogo-edit-card__margin-value {
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  font-size: 0.92rem;
}

.catalogo-edit-card__margin-presets {
  display: flex;
  align-items: center;
  gap: 6px;
}

.catalogo-edit-card__discount-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--sgi-positive) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--sgi-positive) 30%, var(--sgi-border));
  color: var(--sgi-positive);
  font-size: 0.85rem;
}

.catalogo-edit-card__actions {
  padding: 14px 22px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  background: color-mix(in srgb, var(--sgi-surface) 70%, transparent);
}

@media (max-width: 768px) {
  .catalogo-edit-card {
    max-width: 100% !important;
    max-height: 92vh;
    border-radius: 0 !important;
  }

  .catalogo-edit-card__subtitle {
    display: none;
  }

  .catalogo-edit-card__head {
    padding-top: 5px;
    padding-bottom: 5px;
  }

  .catalogo-edit-card__head,
  .catalogo-edit-card__body,
  .catalogo-edit-card__actions {
    padding-left: 16px;
    padding-right: 16px;
  }

  .catalogo-edit-card__actions {
    align-items: flex-end;
    align-content: flex-end;
    flex-direction: column-reverse;
  }
  .catalogo-edit-card__actions :deep(.q-btn) {
    width: 100%;
  }
  .catalogo-edit-card__margin {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
