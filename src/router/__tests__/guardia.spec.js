import { test, expect, vi } from 'vitest'
import { decidirNavegacion, guardia, routes } from '@/router'

const ruta = (path, meta = {}) => ({ path, fullPath: path, meta })
const auth = (extra = {}) => ({ token: 't', usuario: { rol: 'guarda', sede: { id: 1 } }, sede: { id: 1 }, autenticado: true, rutaInicio: '/inicio', ...extra })

test('rutas definidas', () => {
  expect(routes.map((r) => r.path)).toEqual(['/', '/login', '/sin-conexion', '/sede', '/inicio', '/registrar/:sentido?', '/vehiculos', '/movimientos'])
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
