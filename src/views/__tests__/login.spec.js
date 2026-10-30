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
import LoginView from '@/views/LoginView.vue'

async function montar(query = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/login', component: LoginView }, { path: '/sede', component: { template: '<div>sede</div>' } }]
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
})

test('no envía sin usuario y clave', async () => {
  const { w } = await montar()
  await w.get('form').trigger('submit')
  expect(porteria.post).not.toHaveBeenCalled()
  expect(w.get('[data-test=login-error]').text()).toBe('Escribe tu usuario y contraseña')
})
