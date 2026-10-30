const QUINCE_MINUTOS = 15 * 60 * 1000

/**
 * Si se muestran "corregir" y "anular". Solo guía la interfaz: el servidor decide con su propia hora
 * (un guarda: sus registros de los últimos 15 minutos; el admin: cualquiera).
 */
export function puedeEditar(evento, usuario, ahora = new Date()) {
  if (!evento || evento.id === null || evento.anulado || !usuario) return false
  if (usuario.rol === 'admin_porteria') return true
  return evento.registrado_por === usuario.usuario && ahora - new Date(evento.registrado_at) <= QUINCE_MINUTOS
}
