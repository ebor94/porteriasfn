import { test, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

vi.mock('@/services/api', () => ({ porteria: { get: vi.fn() }, tokenStorage: { leer: () => 't', guardar: () => {} } }))

import { porteria } from '@/services/api'
import SinConexionView from '@/views/SinConexionView.vue'

async function montar(query = {}) {
  const vacia = { template: '<div />' }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/sin-conexion', component: SinConexionView }, { path: '/inicio', component: vacia }, { path: '/vehiculos', component: vacia }, { path: '/login', component: vacia }]
  })
  router.push({ path: '/sin-conexion', query })
  await router.isReady()
  const w = mount(SinConexionView, { global: { plugins: [router] } })
  return { w, router }
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

test('avisa que no hay conexión y, al reintentar con éxito, vuelve al destino', async () => {
  porteria.get.mockResolvedValue({ data: { user: { usuario: 'g', rol: 'guarda', sede: { id: 1 } } } })
  const { w, router } = await montar({ redirect: '/vehiculos?vista=fuera' })
  expect(w.text()).toContain('Sin conexión con el servidor')
  await w.get('[data-test=sin-conexion-reintentar]').trigger('click')
  await flushPromises()
  expect(porteria.get).toHaveBeenCalledWith('/auth/me')
  expect(router.currentRoute.value.fullPath).toBe('/vehiculos?vista=fuera')
})

test('si sigue sin red, se queda y lo dice', async () => {
  porteria.get.mockRejectedValue({ status: 0, motivo: 'SIN_CONEXION', message: 'Sin conexión con el servidor' })
  const { w, router } = await montar({ redirect: '/vehiculos' })
  await w.get('[data-test=sin-conexion-reintentar]').trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.path).toBe('/sin-conexion')
  expect(w.get('[data-test=sin-conexion-error]').text()).toBe('Sigue sin conexión. Intenta de nuevo.')
})

test('un redirect externo o ausente cae en /inicio', async () => {
  porteria.get.mockResolvedValue({ data: { user: { usuario: 'g', rol: 'guarda', sede: { id: 1 } } } })
  for (const redirect of ['//malo.com', 'https://malo.com', undefined]) {
    const { w, router } = await montar(redirect ? { redirect } : {})
    await w.get('[data-test=sin-conexion-reintentar]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/inicio')
  }
})

test('si la sesión venció mientras tanto, va al login', async () => {
  porteria.get.mockRejectedValue({ status: 401, motivo: 'NO_AUTENTICADO', message: 'Sesión inválida' })
  const { w, router } = await montar({ redirect: '/vehiculos' })
  await w.get('[data-test=sin-conexion-reintentar]').trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.path).toBe('/login')
  expect(router.currentRoute.value.query.motivo).toBe('SESION_EXPIRADA')
})
