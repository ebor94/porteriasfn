import { test, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

vi.mock('@/services/api', () => {
  const almacen = { token: null }
  return {
    porteria: { post: vi.fn(), get: vi.fn() },
    tokenStorage: { leer: () => almacen.token, guardar: (t) => { almacen.token = t } }
  }
})

import { porteria } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import LoginView from '@/views/LoginView.vue'

async function montar(query = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', component: LoginView }, { path: '/sede', component: { template: '<div>sede</div>' } },
      { path: '/inicio', component: { template: '<div />' } }, { path: '/vehiculos', component: { template: '<div />' } }
    ]
  })
  router.push({ path: '/login', query })
  await router.isReady()
  const w = mount(LoginView, { global: { plugins: [router] } })
  return { w, router }
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

test('entra y va a elegir sede', async () => {
  porteria.post.mockResolvedValue({ data: { token: 't', user: { usuario: 'g1', nombre: 'G', rol: 'guarda', sede: null }, sedes: [] } })
  const { w, router } = await montar()
  await w.get('[data-test=login-usuario]').setValue('g1')
  await w.get('[data-test=login-clave]').setValue('clave')
  await w.get('form').trigger('submit')
  await flushPromises()
  expect(porteria.post).toHaveBeenCalledWith('/auth/login', { usuario: 'g1', password: 'clave' })
  expect(router.currentRoute.value.path).toBe('/sede')
})

test('muestra el error del servidor y el aviso de sesión vencida', async () => {
  porteria.post.mockRejectedValue({ status: 401, message: 'Usuario o contraseña incorrectos' })
  const { w } = await montar({ motivo: 'SESION_EXPIRADA' })
  expect(w.get('[data-test=login-aviso]').text()).toContain('Tu sesión venció')
  await w.get('[data-test=login-usuario]').setValue('g1')
  await w.get('[data-test=login-clave]').setValue('mala')
  await w.get('form').trigger('submit')
  await flushPromises()
  expect(w.get('[data-test=login-error]').text()).toBe('Usuario o contraseña incorrectos')
  expect(w.get('[data-test=login-error]').attributes('role')).toBe('alert')
  expect(w.get('[data-test=login-aviso]').attributes('role')).toBe('alert')
})

test('no envía sin usuario y clave', async () => {
  const { w } = await montar()
  await w.get('form').trigger('submit')
  expect(porteria.post).not.toHaveBeenCalled()
  expect(w.get('[data-test=login-error]').text()).toBe('Escribe tu usuario y contraseña')
})

async function entrarCon(query, sede) {
  porteria.post.mockResolvedValue({ data: { token: 't', user: { usuario: 'g1', nombre: 'G', rol: 'guarda', sede }, sedes: [] } })
  const { w, router } = await montar(query)
  await w.get('[data-test=login-usuario]').setValue('g1')
  await w.get('[data-test=login-clave]').setValue('clave')
  await w.get('form').trigger('submit')
  await flushPromises()
  return router.currentRoute.value
}

test('con un redirect interno sin sede pasa por elegir sede y lo conserva', async () => {
  const ruta = await entrarCon({ redirect: '/vehiculos?vista=fuera' }, null)
  expect(ruta.path).toBe('/sede')
  expect(ruta.query.redirect).toBe('/vehiculos?vista=fuera')
})

test('con un redirect interno y sede vuelve a ese destino', async () => {
  const ruta = await entrarCon({ redirect: '/vehiculos?vista=fuera' }, { id: 1, nombre: 'Norte' })
  expect(ruta.fullPath).toBe('/vehiculos?vista=fuera')
})

test('un redirect externo se ignora', async () => {
  expect((await entrarCon({ redirect: '//malo.com' }, { id: 1, nombre: 'Norte' })).path).toBe('/inicio')
  expect((await entrarCon({ redirect: 'https://malo.com' }, null)).path).toBe('/sede')
})

test('avisa de forma persistente si Portería está deshabilitada', async () => {
  const { w } = await montar()
  expect(w.find('[data-test=login-servicio]').exists()).toBe(false)
  useAuthStore().servicioNoDisponible = true
  await flushPromises()
  expect(w.get('[data-test=login-servicio]').text()).toBe('Portería no está disponible en este momento. Avisa a TI.')
  expect(w.get('[data-test=login-servicio]').attributes('role')).toBe('alert')
})
