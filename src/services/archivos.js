// Descargas generadas en el navegador (el Excel del reporte llega como Blob).
export function guardarArchivo(blob, nombre) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const nombreReporte = (p) => `movimientos_${p.desde || 'inicio'}_${p.hasta || 'hoy'}.xlsx`
