// Clave única por registro: un reintento con la misma clave no duplica el evento en el servidor.
// randomUUID solo existe en páginas seguras (HTTPS o localhost); si no, se arma con getRandomValues.
const hex = (b) => b.toString(16).padStart(2, '0')

export function nuevaClave() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const t = Array.from(crypto.getRandomValues(new Uint8Array(16)), hex).join('')
  return `${t.slice(0, 8)}-${t.slice(8, 12)}-${t.slice(12, 16)}-${t.slice(16, 20)}-${t.slice(20)}`
}
