import { test, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

vi.mock('@/services/api', () => ({
  porteria: { post: vi.fn(), get: vi.fn() },
  tokenStorage: { leer: () => 't', guardar: () => {} }
}))

import { porteria } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import SedeView from '@/views/SedeView.vue'

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

test('lista las sedes y al elegir una va al inicio', async () => {
  porteria.get.mockResolvedValue({ data: [{ id: 1, nombre: 'Norte' }, { id: 2, nombre: 'Sur' }] })
  porteria.post.mockResolvedValue({ data: { token: 't2', user: { usuario: 'g', rol: 'guarda', sede: { id: 2, nombre: 'Sur' } } } })
  useAuthStore().usuario = { usuario: 'g', nombre: 'G', rol: 'guarda', sede: null }
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/sede', component: SedeView }, { path: '/inicio', component: { template: '<div />' } }] })
  router.push('/sede')
  await router.isReady()
  const w = mount(SedeView, { global: { plugins: [router] } })
  await flushPromises()
  expect(w.get('[data-test=sede-1]').text()).toBe('Norte')
  await w.get('[data-test=sede-2]').trigger('click')
  await flushPromises()
  expect(porteria.post).toHaveBeenCalledWith('/auth/sede', { sede_id: 2 })
  expect(router.currentRoute.value.path).toBe('/inicio')
})
