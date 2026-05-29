/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

interface ImportMetaEnv {
  readonly VITE_GAS_API_URL: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_NAME_SUBTITLE: string
  readonly VITE_APP_VERSION: string
  readonly VITE_APP_AUTHOR: string
  readonly VITE_QR_BASE_URL: string
  /**
   * Modo de generación del QR para productos.
   * - 'texto'  → El QR codifica los datos del producto en texto plano (SKU, marca, precios).
   * - 'enlace' → El QR codifica la URL de detalle del producto: {VITE_QR_BASE_URL}/producto/{sku}
   * Valor por defecto si no se define: 'texto'
   */
  readonly VITE_QR_MODE: 'texto' | 'enlace'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
