import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

export const routes = [
  { path: '/', redirect: '/inicio' },
  { path: '/login', component: () => import('@/views/LoginView.vue'), meta: { publica: true } },
  { path: '/sin-conexion', component: () => import('@/views/SinConexionView.vue'), meta: { publica: true } },
  { path: '/sede', component: () => import('@/views/SedeView.vue') },
  { path: '/inicio', component: () => import('@/views/InicioView.vue'), meta: { requiereSede: true } },
  { path: '/registrar/:sentido?', component: () => import('@/views/RegistroView.vue'), meta: { requiereSede: true } },
  { path: '/vehiculos', component: () => import('@/views/VehiculosView.vue'), meta: { requiereSede: true } },
  { path: '/movimientos', component: () => import('@/views/MovimientosView.vue'), meta: { requiereSede: true } }
]

export function decidirNavegacion(to, auth) {
  const meta = to.meta || {}
  if (meta.publica) return to.path === '/login' && auth.autenticado ? { path: auth.rutaInicio } : true
  if (!auth.token) return { path: '/login', query: { redirect: to.fullPath } }
  if (meta.requiereSede && !auth.sede) return { path: '/sede' }
  return true
}

export async function guardia(to, auth) {
  if (auth.token && !auth.usuario) {
    try {
      await auth.cargarPerfil()
    } catch (e) {
      // 401: cargarPerfil ya cerró sesión; se avisa en /login que la sesión venció.
      const publica = Boolean(to.meta && to.meta.publica)
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

const router = createRouter({ history: createWebHistory(import.meta.env.BASE_URL), routes })
router.beforeEach((to) => guardia(to, useAuthStore()))

export default router
