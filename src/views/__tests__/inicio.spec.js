import { test, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

vi.mock('@/services/api', () => ({ porteria: { get: vi.fn() }, tokenStorage: { leer: () => 't', guardar: () => {} } }))

import { porteria } from '@/services/api'
import InicioView from '@/views/InicioView.vue'

// Se desmontan para que no queden oyentes de visibilitychange de pruebas anteriores.
const montados = []
const registrar = (w) => { montados.push(w); return w }
afterEach(() => { while (montados.length) montados.pop().unmount() })

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  porteria.get.mockImplementation(async (url) => ({ data: url === '/estado/dentro' ? [{ placa: 'A' }, { placa: 'B' }] : [{ placa: 'C' }] }))
})

test('contadores y accesos al registro', async () => {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/inicio', component: InicioView }, { path: '/registrar/:sentido?', component: { template: '<div />' } }, { path: '/vehiculos', component: { template: '<div />' } }] })
  router.push('/inicio')
  await router.isReady()
  const w = registrar(mount(InicioView, { global: { plugins: [router], stubs: { MarcoGuarda: { template: '<div><slot /></div>' } } } }))
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

function diferido() {
  const d = {}
  d.promesa = new Promise((resolve, reject) => { d.resolve = resolve; d.reject = reject })
  return d
}

async function montar() {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/inicio', component: InicioView }] })
  router.push('/inicio')
  await router.isReady()
  return registrar(mount(InicioView, { global: { plugins: [router], stubs: { MarcoGuarda: { template: '<div><slot /></div>' } } } }))
}

test('mientras carga los contadores muestran un guion, no cero', async () => {
  const espera = diferido()
  porteria.get.mockImplementation(() => espera.promesa)
  const w = await montar()
  expect(w.get('[data-test=inicio-dentro]').text()).toBe('—')
  expect(w.get('[data-test=inicio-fuera]').text()).toBe('—')
  espera.resolve({ data: [{ placa: 'A' }] })
  await flushPromises()
  expect(w.get('[data-test=inicio-dentro]').text()).toBe('1')
})

test('si la carga falla muestra el error con guion y "Actualizar" reintenta', async () => {
  porteria.get.mockRejectedValueOnce({ message: 'Sin conexión' })
  const w = await montar()
  await flushPromises()
  expect(w.get('[data-test=inicio-error]').text()).toBe('Sin conexión')
  expect(w.get('[data-test=inicio-error]').attributes('role')).toBe('alert')
  expect(w.get('[data-test=inicio-dentro]').text()).toBe('—')
  await w.get('[data-test=inicio-actualizar]').trigger('click')
  await flushPromises()
  expect(w.find('[data-test=inicio-error]').exists()).toBe(false)
  expect(w.get('[data-test=inicio-dentro]').text()).toBe('2')
})

test('recarga al volver a la pestaña y deja de escuchar al salir', async () => {
  const w = await montar()
  await flushPromises()
  const llamadas = () => porteria.get.mock.calls.length
  const antes = llamadas()
  const visibilidad = vi.spyOn(document, 'visibilityState', 'get')
  visibilidad.mockReturnValue('hidden')
  document.dispatchEvent(new Event('visibilitychange'))
  await flushPromises()
  expect(llamadas()).toBe(antes)
  visibilidad.mockReturnValue('visible')
  document.dispatchEvent(new Event('visibilitychange'))
  await flushPromises()
  expect(llamadas()).toBe(antes + 2)
  montados.splice(montados.indexOf(w), 1)
  w.unmount()
  document.dispatchEvent(new Event('visibilitychange'))
  await flushPromises()
  expect(llamadas()).toBe(antes + 2)
  visibilidad.mockRestore()
})
