// =============================================================
// useQR.ts — Generación y gestión de códigos QR
// =============================================================
import QRCode from 'qrcode'

/** Modos de generación del QR de producto */
export type QrMode = 'texto' | 'enlace'

/**
 * Retorna el modo QR configurado en las variables de entorno.
 * Si VITE_QR_MODE no está definido o tiene un valor inválido, usa 'texto' como fallback.
 */
export function getQrMode(): QrMode {
  const raw = import.meta.env.VITE_QR_MODE
  if (raw === 'enlace') return 'enlace'
  return 'texto'
}

export function useQR() {
  /**
   * Genera una imagen PNG del QR en formato data URL.
   * @param texto Contenido a codificar en el QR
   * @param size  Tamaño en píxeles (ancho y alto)
   */
  async function generarDataUrl(texto: string, size = 200): Promise<string> {
    return QRCode.toDataURL(texto, {
      width: size,
      margin: 2,
      color: { dark: '#1a1a2e', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    })
  }

  /** Genera el QR como SVG (para embed directo en HTML) */
  async function generarSvg(texto: string): Promise<string> {
    return QRCode.toString(texto, {
      type: 'svg',
      margin: 2,
      color: { dark: '#1a1a2e', light: '#ffffff' },
    })
  }

  // ─────────────────────────────────────────────────────────────
  // Modos de contenido
  // ─────────────────────────────────────────────────────────────

  /**
   * Construye el contenido del QR en modo ENLACE.
   * Genera la URL de detalle del producto: {VITE_QR_BASE_URL}/producto/{sku}
   */
  function buildQrEnlace(sku: string): string {
    const baseUrl = import.meta.env.VITE_QR_BASE_URL?.replace(/\/$/, '') ?? ''
    return `${baseUrl}/producto/${sku}`
  }

  /**
   * Construye el contenido del QR en modo TEXTO.
   * Genera una cadena con los datos del producto separados por '|'.
   * Si no se pasan datos, usa solo el SKU.
   */
  function buildQrTexto(sku: string, datos?: QrProductoDatos): string {
    if (!datos) return sku
    return (
      `Código: ${datos.sku}` +
      ` | Marca: ${datos.marca}` +
      ` | Producto: ${datos.nombre}` +
      ` | Precio Catálogo: Bs. ${datos.precioOfrecido}` +
      ` | Precio Venta: Bs. ${datos.precioFinal}`
    )
  }

  /**
   * Punto de entrada principal: construye el contenido del QR
   * según el modo configurado en VITE_QR_MODE.
   *
   * Modo 'enlace': devuelve la URL de detalle del producto.
   * Modo 'texto':  devuelve los datos del producto en texto plano.
   *
   * @param sku   SKU del producto (requerido siempre)
   * @param datos Datos del producto para modo texto (opcional)
   */
  function buildQrContent(sku: string, datos?: QrProductoDatos): string {
    const modo = getQrMode()
    if (modo === 'enlace') return buildQrEnlace(sku)
    return buildQrTexto(sku, datos)
  }

  // ─────────────────────────────────────────────────────────────
  // Utilidades de formato para almacenamiento y visualización
  // ─────────────────────────────────────────────────────────────

  /**
   * Añade saltos de línea después de cada '|' para visualización
   * del contenido en el formulario (modo texto).
   * En modo enlace no aplica saltos.
   */
  function addContentBreak(qrContent: string): string {
    if (!qrContent) return qrContent
    const content = qrContent.replace(/\|/g, '|\n')
    return content
  }

  /**
   * Elimina los saltos de línea añadidos por addContentBreak
   * antes de guardar el contenido en la base de datos.
   */
  function clearContentBreak(qrContent: string): string {
    if (!qrContent) return qrContent
    return qrContent.replace(/\n/g, '')
  }

  /** Descarga el QR como imagen PNG */
  async function descargarQR(texto: string, nombreArchivo: string): Promise<void> {
    const dataUrl = await generarDataUrl(texto, 400)
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = `${nombreArchivo}_qr.png`
    link.click()
  }

  function irEnlaceQR(url: string) {
    const ventana = window.open(url, '_blank')
    if (ventana) {
      //ventana.document.close()
      //setTimeout(() => ventana.print(), 400)
    }
  }

  return {
    generarDataUrl,
    generarSvg,
    buildQrContent,
    buildQrEnlace,
    buildQrTexto,
    descargarQR,
    addContentBreak,
    clearContentBreak,
    getQrMode,
    irEnlaceQR,
  }
}

// ─────────────────────────────────────────────────────────────
// Tipos auxiliares
// ─────────────────────────────────────────────────────────────

/** Datos del producto necesarios para construir el QR en modo texto */
export interface QrProductoDatos {
  sku: string
  marca: string
  nombre: string
  precioOfrecido: number
  precioFinal: number
}
