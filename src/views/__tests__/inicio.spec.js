import { test, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

vi.mock('@/services/api', () => ({ porteria: { get: vi.fn() }, tokenStorage: { leer: () => 't', guardar: () => {} } }))

import { porteria } from '@/services/api'
import InicioView from '@/views/InicioView.vue'

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  porteria.get.mockImplementation(async (url) => ({ data: url === '/estado/dentro' ? [{ placa: 'A' }, { placa: 'B' }] : [{ placa: 'C' }] }))
})

test('contadores y accesos al registro', async () => {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/inicio', component: InicioView }, { path: '/registrar/:sentido?', component: { template: '<div />' } }, { path: '/vehiculos', component: { template: '<div />' } }] })
  router.push('/inicio')
  await router.isReady()
  const w = mount(InicioView, { global: { plugins: [router], stubs: { MarcoGuarda: { template: '<div><slot /></div>' } } } })
  await flushPromises()
  expect(w.get('[data-test=inicio-dentro]').text()).toBe('2')
  expect(w.get('[data-test=inicio-fuera]').text()).toBe('1')
  await w.get('[data-test=inicio-placa]').setValue('abc-123')
  await w.get('[data-test=inicio-buscar]').trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.fullPath).toBe('/registrar?placa=ABC123')
  await w.get('[data-test=inicio-salida]').trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.path).toBe('/registrar/SALIDA')
})
