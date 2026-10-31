import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { responder } from '@/composables/confirmar'

// La raíz (start_url de la PWA) no tiene pantalla: la guardia la manda al inicio de cada usuario.
const Raiz = { render: () => null }

export const routes = [
  { path: '/', component: Raiz, meta: { raiz: true } },
  { path: '/login', component: () => import('@/views/LoginView.vue'), meta: { publica: true } },
  { path: '/sin-conexion', component: () => import('@/views/SinConexionView.vue'), meta: { publica: true } },
  { path: '/sede', component: () => import('@/views/SedeView.vue') },
  { path: '/inicio', component: () => import('@/views/InicioView.vue'), meta: { requiereSede: true } },
  { path: '/registrar/:sentido?', component: () => import('@/views/RegistroView.vue'), meta: { requiereSede: true } },
  { path: '/vehiculos', component: () => import('@/views/VehiculosView.vue'), meta: { requiereSede: true } },
  { path: '/movimientos', component: () => import('@/views/MovimientosView.vue'), meta: { requiereSede: true } },
  { path: '/admin', redirect: '/admin/movimientos' },
  { path: '/admin/movimientos', component: () => import('@/views/admin/AdminMovimientosView.vue'), meta: { requiereAdmin: true } },
  { path: '/admin/motivos', component: () => import('@/views/admin/AdminMotivosView.vue'), meta: { requiereAdmin: true } },
  { path: '/admin/proveedores', component: () => import('@/views/admin/AdminProveedoresView.vue'), meta: { requiereAdmin: true } }
]

export function decidirNavegacion(to, auth) {
  const meta = to.meta || {}
  if (meta.publica) return to.path === '/login' && auth.autenticado ? { path: auth.rutaInicio } : true
  if (!auth.token) return { path: '/login', query: { redirect: to.fullPath } }
  if (meta.raiz) return { path: auth.rutaInicio }
  if (meta.requiereAdmin && !auth.esAdmin) return { path: auth.rutaInicio }
  if (meta.requiereSede && !auth.sede) return { path: '/sede' }
  return true
}

export async function guardia(to, auth) {
  const publica = Boolean(to.meta && to.meta.publica)
  // Las rutas públicas (salvo /login, que redirige si ya hay sesión) no necesitan el perfil.
  if (auth.token && !auth.usuario && (!publica || to.path === '/login')) {
    try {
      await auth.cargarPerfil()
    } catch (e) {
      // 401: cargarPerfil ya cerró sesión; se avisa en /login que la sesión venció.
      if (e && e.status === 401) {
        if (!publica) return { path: '/login', query: { redirect: to.fullPath, motivo: 'SESION_EXPIRADA' } }
      } else if (!publica) {
        // Sin red o servidor caído: la sesión sigue vigente, se espera en una pantalla donde reintentar.
        return { path: '/sin-conexion', query: { redirect: to.fullPath } }
      }
    }
  }
  return decidirNavegacion(to, auth)
}

// Una confirmación abierta no sobrevive a un cambio de pantalla. Solo las navegaciones que llegaron:
// una abortada o reemplazada no debe cerrar la confirmación que abrió la navegación que la reemplazó.
export function cerrarConfirmacionAlNavegar(router) {
  router.afterEach((to, from, fallo) => {
    if (!fallo) responder(false)
  })
}

const router = createRouter({ history: createWebHistory(import.meta.env.BASE_URL), routes })
router.beforeEach((to) => guardia(to, useAuthStore()))
cerrarConfirmacionAlNavegar(router)

export default router
