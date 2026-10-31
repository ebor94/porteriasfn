import { test, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

vi.mock('@/services/api', () => ({ porteria: { get: vi.fn() }, tokenStorage: { leer: () => 't', guardar: () => {} } }))
const confirmar = vi.hoisted(() => vi.fn())
vi.mock('@/composables/confirmar', () => ({ confirmar, responder: vi.fn() }))

import { useAuthStore } from '@/stores/auth'
import MarcoAdmin from '@/components/MarcoAdmin.vue'

async function montar() {
  const vacia = { template: '<div />' }
  const rutas = ['/admin/movimientos', '/admin/motivos', '/admin/proveedores', '/inicio', '/login'].map((path) => ({ path, component: vacia }))
  const router = createRouter({ history: createMemoryHistory(), routes: rutas })
  router.push('/admin/movimientos')
  await router.isReady()
  const w = mount(MarcoAdmin, { props: { titulo: 'Consulta' }, global: { plugins: [router] }, slots: { default: '<p>contenido</p>' } })
  return { w, router }
}

beforeEach(() => {
  setActivePinia(createPinia())
  confirmar.mockReset()
  useAuthStore().fijarSesion('t', { usuario: 'a1', nombre: 'Ana Admin', rol: 'admin_porteria', sede: null })
})

test('muestra título, usuario, navegación y contenido', async () => {
  const { w } = await montar()
  expect(w.get('h1').text()).toBe('Consulta')
  expect(w.text()).toContain('Ana Admin')
  expect(w.findAll('[data-test=admin-nav] a').map((a) => a.attributes('href'))).toEqual([
    '/admin/movimientos', '/admin/motivos', '/admin/proveedores', '/inicio',
  ])
  expect(w.text()).toContain('contenido')
})

test('salir confirma y vuelve al login', async () => {
  confirmar.mockResolvedValueOnce(false).mockResolvedValueOnce(true)
  const { w, router } = await montar()
  await w.get('[data-test=admin-salir]').trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.path).toBe('/admin/movimientos')
  await w.get('[data-test=admin-salir]').trigger('click')
  await flushPromises()
  expect(confirmar).toHaveBeenCalledWith('¿Cerrar sesión?', { aceptar: 'Cerrar sesión' })
  expect(router.currentRoute.value.path).toBe('/login')
  expect(useAuthStore().token).toBeNull()
})

test('avisa si Portería está deshabilitada', async () => {
  const { w } = await montar()
  useAuthStore().fijarServicio(false)
  await w.vm.$nextTick()
  expect(w.get('[data-test=admin-servicio]').text()).toBe('Portería no está disponible en este momento. Avisa a TI.')
})
