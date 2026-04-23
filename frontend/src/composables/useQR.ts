// =============================================================
// useQR.ts — Generación y gestión de códigos QR
// =============================================================
import QRCode from 'qrcode'

export function useQR() {
  async function generarDataUrl(texto: string, size = 200): Promise<string> {
    return QRCode.toDataURL(texto, {
      width: size,
      margin: 2,
      color: { dark: '#1a1a2e', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    })
  }

  async function generarSvg(texto: string): Promise<string> {
    return QRCode.toString(texto, {
      type: 'svg',
      margin: 2,
      color: { dark: '#1a1a2e', light: '#ffffff' },
    })
  }

  function buildQrContent(sku: string): string {
    const baseUrl = import.meta.env.VITE_QR_BASE_URL
    return `${baseUrl}/producto/${sku}`
  }

  async function descargarQR(texto: string, nombreArchivo: string): Promise<void> {
    const dataUrl = await generarDataUrl(texto, 400)
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = `${nombreArchivo}_qr.png`
    link.click()
  }

  return { generarDataUrl, generarSvg, buildQrContent, descargarQR }
}
