import { test, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

vi.mock('@/services/api', () => ({ porteria: { get: vi.fn() }, tokenStorage: { leer: () => 't', guardar: () => {} } }))

import { porteria } from '@/services/api'
import VehiculosView from '@/views/VehiculosView.vue'

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  porteria.get.mockImplementation(async (url) => {
    if (url === '/estado/dentro') return { data: [
      { id: 1, placa: 'XYZ1', tipo_vehiculo: 'PROVEEDOR', empresa: 'Flores', motivo: { nombre: 'Entrega' }, registrado_at: new Date().toISOString(), carga_inicial: false },
      { id: null, placa: 'CAR1', tipo_vehiculo: 'PROPIO', motivo: null, registrado_at: new Date().toISOString(), carga_inicial: true }
    ] }
    if (url === '/estado/fuera') return { data: [{ id: 2, placa: 'CAR2', tipo_vehiculo: 'PROPIO', sede_id: 1, motivo: { nombre: 'Exequias' }, registrado_at: new Date().toISOString() }] }
    return { data: [{ id: 1, nombre: 'Norte' }] }
  })
})

test('dentro y fuera con acción rápida', async () => {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/vehiculos', component: VehiculosView }, { path: '/registrar/:sentido?', component: { template: '<div />' } }] })
  router.push('/vehiculos')
  await router.isReady()
  const w = mount(VehiculosView, { global: { plugins: [router], stubs: { MarcoGuarda: { template: '<div><slot /></div>' } } } })
  await flushPromises()
  const filas = w.findAll('[data-test=vehiculo-fila]')
  expect(filas).toHaveLength(2)
  expect(filas[1].text()).toContain('Carga inicial')
  await filas[0].get('[data-test=vehiculo-accion]').trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.fullPath).toBe('/registrar/SALIDA?placa=XYZ1')

  await router.push('/vehiculos')
  await w.get('[data-test=vehiculos-tab-fuera]').trigger('click')
  const fuera = w.findAll('[data-test=vehiculo-fila]')
  expect(fuera).toHaveLength(1)
  expect(fuera[0].text()).toContain('Norte')
  await fuera[0].get('[data-test=vehiculo-accion]').trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.fullPath).toBe('/registrar/INGRESO?placa=CAR2')
})
