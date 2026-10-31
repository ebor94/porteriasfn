import { test, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

vi.mock('@/services/api', () => ({ porteria: { get: vi.fn(), post: vi.fn() }, tokenStorage: { leer: () => 't', guardar: () => {} } }))

import { useAuthStore } from '@/stores/auth'
import MarcoGuarda from '@/components/MarcoGuarda.vue'

async function montar() {
  const vacia = { template: '<div />' }
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/inicio', component: vacia }, { path: '/login', component: vacia }, { path: '/sede', component: vacia }, { path: '/vehiculos', component: vacia }, { path: '/movimientos', component: vacia }] })
  router.push('/inicio')
  await router.isReady()
  const w = mount(MarcoGuarda, { global: { plugins: [router] }, slots: { default: '<p>contenido</p>' } })
  return { w, router }
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  useAuthStore().usuario = { usuario: 'g1', nombre: 'G', rol: 'guarda', sede: { id: 1, nombre: 'Norte' } }
})

test('avisa de forma persistente si Portería está deshabilitada', async () => {
  const { w } = await montar()
  expect(w.find('[data-test=marco-servicio]').exists()).toBe(false)
  useAuthStore().servicioNoDisponible = true
  await flushPromises()
  const barra = w.get('[data-test=marco-servicio]')
  expect(barra.text()).toBe('Portería no está disponible en este momento. Avisa a TI.')
  expect(barra.attributes('role')).toBe('alert')
})
