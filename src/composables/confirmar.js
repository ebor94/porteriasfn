// Confirmaciones con un diálogo propio: Chrome puede suprimir window.confirm en una app instalada.
// Hay una sola a la vez; pedir otra cancela la anterior (responde false).
import { reactive } from 'vue'

export const confirmacion = reactive({ abierta: false, mensaje: '', aceptar: 'Aceptar', peligro: false })
let resolver = null

export function confirmar(mensaje, { aceptar = 'Aceptar', peligro = false } = {}) {
  if (resolver) resolver(false)
  Object.assign(confirmacion, { abierta: true, mensaje, aceptar, peligro })
  return new Promise((r) => { resolver = r })
}

export function responder(valor) {
  const r = resolver
  resolver = null
  confirmacion.abierta = false
  if (r) r(valor)
}
