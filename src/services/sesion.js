// Sesión vencida y cambios de sesión en otra pestaña.
import { CLAVE_TOKEN, alSesionExpirada } from '@/services/api'
import { useAuthStore } from '@/stores/auth'

export const MOTIVO_SESION_EXPIRADA = 'SESION_EXPIRADA'

// El token vive en localStorage compartido: si otra pestaña lo cambia, esta se recarga para no actuar
// con la identidad o la sede anterior.
export function vigilarTokenCompartido(recargar = () => window.location.reload()) {
  const alCambiar = (e) => {
    if (e.key === CLAVE_TOKEN || e.key === null) recargar()
  }
  window.addEventListener('storage', alCambiar)
  return () => window.removeEventListener('storage', alCambiar)
}

export function manejarSesionExpirada({ auth, router }) {
  if (!auth.token) return
  auth.logout()
  if (router.currentRoute.value.path === '/login') return
  router.replace({ path: '/login', query: { motivo: MOTIVO_SESION_EXPIRADA } })
}

export function instalarSesion(router) {
  alSesionExpirada(() => manejarSesionExpirada({ auth: useAuthStore(), router }))
  return vigilarTokenCompartido()
}
