import { test, expect, vi, afterEach } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'
import { decidirNavegacion, guardia, routes, cerrarConfirmacionAlNavegar } from '@/router'
import { confirmar, confirmacion, responder } from '@/composables/confirmar'

afterEach(() => responder(false))

const ruta = (path, meta = {}) => ({ path, fullPath: path, meta })
const auth = (extra = {}) => ({ token: 't', usuario: { rol: 'guarda', sede: { id: 1 } }, sede: { id: 1 }, autenticado: true, rutaInicio: '/inicio', ...extra })

test('rutas definidas', () => {
  expect(routes.map((r) => r.path)).toEqual(['/', '/login', '/sin-conexion', '/sede', '/inicio', '/registrar/:sentido?', '/vehiculos', '/movimientos', '/admin', '/admin/movimientos', '/admin/motivos', '/admin/proveedores'])
})

test('sin token → login con redirect', () => {
  expect(decidirNavegacion(ruta('/inicio', { requiereSede: true }), { token: null })).toEqual({ path: '/login', query: { redirect: '/inicio' } })
})

test('sin sede → elegir sede', () => {
  expect(decidirNavegacion(ruta('/inicio', { requiereSede: true }), auth({ sede: null }))).toEqual({ path: '/sede' })
})

test('ya autenticado no vuelve al login', () => {
  expect(decidirNavegacion(ruta('/login', { publica: true }), auth())).toEqual({ path: '/inicio' })
  expect(decidirNavegacion(ruta('/login', { publica: true }), { token: null })).toBe(true)
})

test('guardia carga el perfil y, si venció, avisa en el login', async () => {
  const conPerfil = { token: 't', usuario: null, sede: null, cargarPerfil: vi.fn(async function () { this.usuario = { sede: null } }) }
  expect(await guardia(ruta('/sede'), conPerfil)).toBe(true)
  expect(conPerfil.cargarPerfil).toHaveBeenCalled()

  const vencido = { token: 't', usuario: null, cargarPerfil: vi.fn(async () => { throw { status: 401 } }) }
  expect(await guardia(ruta('/inicio', { requiereSede: true }), vencido))
    .toEqual({ path: '/login', query: { redirect: '/inicio', motivo: 'SESION_EXPIRADA' } })
})

test('si no hay red al cargar el perfil, va a /sin-conexion y recuerda el destino', async () => {
  const sinRed = { token: 't', usuario: null, cargarPerfil: vi.fn(async () => { throw { status: 0, motivo: 'SIN_CONEXION' } }) }
  const destino = { path: '/registrar/SALIDA', fullPath: '/registrar/SALIDA?placa=ABC123', meta: { requiereSede: true } }
  expect(await guardia(destino, sinRed)).toEqual({ path: '/sin-conexion', query: { redirect: '/registrar/SALIDA?placa=ABC123' } })
  const caido = { token: 't', usuario: null, cargarPerfil: vi.fn(async () => { throw { status: 503, motivo: 'SIN_CONEXION' } }) }
  expect(await guardia(ruta('/inicio', { requiereSede: true }), caido)).toEqual({ path: '/sin-conexion', query: { redirect: '/inicio' } })
})

test('en las rutas públicas un fallo de red no redirige (evita bucles)', async () => {
  const sinRed = { token: 't', usuario: null, cargarPerfil: vi.fn(async () => { throw { status: 0, motivo: 'SIN_CONEXION' } }) }
  expect(await guardia(ruta('/sin-conexion', { publica: true }), sinRed)).toBe(true)
})

test('en rutas públicas distintas de /login no se llama a cargarPerfil', async () => {
  const sesion = { token: 't', usuario: null, cargarPerfil: vi.fn() }
  expect(await guardia(ruta('/sin-conexion', { publica: true }), sesion)).toBe(true)
  expect(sesion.cargarPerfil).not.toHaveBeenCalled()
  await guardia(ruta('/login', { publica: true }), { ...sesion, cargarPerfil: sesion.cargarPerfil })
  expect(sesion.cargarPerfil).toHaveBeenCalledTimes(1)
})

test('las rutas del admin exigen el rol', () => {
  const admin = ruta('/admin/motivos', { requiereAdmin: true })
  expect(decidirNavegacion(admin, auth({ esAdmin: false }))).toEqual({ path: '/inicio' })
  expect(decidirNavegacion(admin, auth({ esAdmin: true, sede: null }))).toBe(true)
  expect(decidirNavegacion(admin, { token: null })).toEqual({ path: '/login', query: { redirect: '/admin/motivos' } })
})

// Perfil sin cargar (recién abierta la app): cargarPerfil trae el usuario y rutaInicio sale de él.
const sinPerfil = (usuario) => ({
  token: 't', usuario: null,
  get sede() { return (this.usuario && this.usuario.sede) || null },
  get esAdmin() { return Boolean(this.usuario && this.usuario.rol === 'admin_porteria') },
  get rutaInicio() {
    if (this.usuario && this.usuario.sede) return '/inicio'
    return this.usuario && this.usuario.rol === 'admin_porteria' ? '/admin' : '/sede'
  },
  cargarPerfil: vi.fn(async function () { this.usuario = usuario })
})

// Router de memoria con las rutas reales (componentes vacíos) y la guardia real.
async function navegar(destino, auth) {
  const vacio = { render: () => null }
  const router = createRouter({ history: createMemoryHistory(), routes: routes.map((r) => (r.component ? { ...r, component: vacio } : r)) })
  router.beforeEach((to) => guardia(to, auth))
  await router.push(destino)
  return router.currentRoute.value.fullPath
}

test('la raíz (start_url de la PWA) lleva a la ruta de inicio de cada usuario', async () => {
  expect(await guardia(ruta('/', { raiz: true }), sinPerfil({ rol: 'admin_porteria', sede: null }))).toEqual({ path: '/admin' })
  expect(await navegar('/', sinPerfil({ rol: 'admin_porteria', sede: null }))).toBe('/admin/movimientos')
  expect(await navegar('/', sinPerfil({ rol: 'guarda', sede: { id: 1 } }))).toBe('/inicio')
  expect(await navegar('/', sinPerfil({ rol: 'guarda', sede: null }))).toBe('/sede')
  expect(await navegar('/', { token: null })).toBe('/login?redirect=/')
})

test('una confirmación abierta se cancela al cambiar de ruta', async () => {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/a', component: { render: () => null } }, { path: '/b', component: { render: () => null } }] })
  cerrarConfirmacionAlNavegar(router)
  await router.push('/a')
  const respuesta = confirmar('¿Borrar?')
  await router.push('/b')
  expect(await respuesta).toBe(false)
  expect(confirmacion.abierta).toBe(false)
})

test('una salida que pide confirmación sigue funcionando con el cierre al navegar', async () => {
  const vacio = { render: () => null }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/a', component: vacio, beforeEnter: () => true }, { path: '/b', component: vacio }, { path: '/c', component: vacio }]
  })
  cerrarConfirmacionAlNavegar(router)
  // Como el onBeforeRouteLeave de RegistroView: salir de /a pide confirmación.
  router.beforeEach((to, from) => (from.path === '/a' ? confirmar('¿Salir sin registrar?') : true))
  await router.push('/a')
  const aceptada = router.push('/b')
  await vi.waitFor(() => expect(confirmacion.abierta).toBe(true))
  responder(true)
  await aceptada
  expect(router.currentRoute.value.path).toBe('/b')

  await router.push('/a')
  const cancelada = router.push('/c')
  await vi.waitFor(() => expect(confirmacion.abierta).toBe(true))
  responder(false)
  await cancelada
  expect(router.currentRoute.value.path).toBe('/a')

  // Una navegación que reemplaza a otra en espera vuelve a preguntar; el aborto de la primera no cierra la nueva.
  const primera = router.push('/b')
  await vi.waitFor(() => expect(confirmacion.abierta).toBe(true))
  const segunda = router.push('/c')
  await primera
  await vi.waitFor(() => expect(confirmacion.abierta).toBe(true))
  expect(confirmacion.abierta).toBe(true)
  responder(true)
  await segunda
  expect(router.currentRoute.value.path).toBe('/c')
})
