// =============================================================
// qrUtils.ts — Utilidades para manejo de QR e imágenes
// =============================================================

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => { resolve((reader.result as string).split(',')[1]) }
    reader.onerror = () => reject(new Error('Error al leer el archivo'))
    reader.readAsDataURL(file)
  })
}

export async function resizeImage(file: File, maxSize = 800): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let { width, height } = img
      if (width > maxSize || height > maxSize) {
        if (width > height) { height = Math.round((height * maxSize) / width); width = maxSize }
        else { width = Math.round((width * maxSize) / height); height = maxSize }
      }
      canvas.width = width; canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Canvas context unavailable'))
      ctx.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)
      canvas.toBlob(
        (blob) => { if (!blob) return reject(new Error('Error al comprimir imagen')); resolve(blob) },
        file.type, 0.85,
      )
    }
    img.onerror = () => reject(new Error('Error al cargar la imagen'))
    img.src = url
  })
}

export function validateImageFile(file: File, maxMb = 5): string | null {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) return 'Solo se permiten imágenes JPG, PNG o WebP'
  if (file.size > maxMb * 1024 * 1024) return `El archivo no debe superar ${maxMb}MB`
  return null
}

export function drivePreviewUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=view&id=${fileId}`
}
