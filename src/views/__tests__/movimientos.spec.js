import { test, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/services/api', () => ({ porteria: { get: vi.fn(), post: vi.fn(), patch: vi.fn() }, tokenStorage: { leer: () => 't', guardar: () => {} } }))
vi.mock('vue-toastification', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }))

import { porteria } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import MovimientosView from '@/views/MovimientosView.vue'

const reciente = () => new Date(Date.now() - 2 * 60000).toISOString()

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  useAuthStore().usuario = { usuario: 'g1', nombre: 'G', rol: 'guarda', sede: { id: 1, nombre: 'Norte' } }
  porteria.get.mockResolvedValue({ data: { items: [
    { id: 1, sentido: 'SALIDA', placa: 'CAR1', tipo_vehiculo: 'PROPIO', motivo: { nombre: 'Tanqueo' }, conductor_nombre: 'Juan', registrado_por: 'g1', registrado_at: reciente(), anulado: false, inconsistente: false },
    { id: 2, sentido: 'INGRESO', placa: 'XYZ1', tipo_vehiculo: 'PROVEEDOR', motivo: { nombre: 'Entrega' }, conductor_nombre: 'Ana', registrado_por: 'otro', registrado_at: reciente(), anulado: false, inconsistente: true },
    { id: 3, sentido: 'SALIDA', placa: 'CAR3', tipo_vehiculo: 'PROPIO', motivo: { nombre: 'Lavado' }, conductor_nombre: 'Luis', registrado_por: 'g1', registrado_at: reciente(), anulado: true, inconsistente: false }
  ], total: 3 } })
})

function montar() {
  return mount(MovimientosView, { global: { stubs: { MarcoGuarda: { template: '<div><slot /></div>' } } } })
}

test('muestra marcas y solo ofrece editar lo propio reciente', async () => {
  const w = montar()
  await flushPromises()
  const filas = w.findAll('[data-test=movimiento-fila]')
  expect(filas).toHaveLength(3)
  expect(filas[0].find('[data-test=movimiento-anular]').exists()).toBe(true)
  expect(filas[0].find('[data-test=movimiento-km]').exists()).toBe(true)
  expect(filas[1].find('[data-test=movimiento-anular]').exists()).toBe(false)
  expect(filas[1].find('[data-test=movimiento-inconsistente]').exists()).toBe(true)
  expect(filas[2].find('[data-test=movimiento-anulado]').exists()).toBe(true)
  expect(filas[2].find('[data-test=movimiento-anular]').exists()).toBe(false)
})

test('anular pide el motivo y actualiza la fila', async () => {
  porteria.post.mockResolvedValue({ data: { id: 1, sentido: 'SALIDA', placa: 'CAR1', motivo: { nombre: 'Tanqueo' }, registrado_por: 'g1', registrado_at: reciente(), anulado: true } })
  const w = montar()
  await flushPromises()
  await w.findAll('[data-test=movimiento-fila]')[0].get('[data-test=movimiento-anular]').trigger('click')
  await w.get('[data-test=dialogo-texto]').setValue('Placa equivocada')
  await w.get('[data-test=dialogo-aceptar]').trigger('click')
  await flushPromises()
  expect(porteria.post).toHaveBeenCalledWith('/eventos/1/anular', { motivo: 'Placa equivocada' })
  expect(w.findAll('[data-test=movimiento-fila]')[0].find('[data-test=movimiento-anulado]').exists()).toBe(true)
})

test('corregir kilometraje', async () => {
  porteria.patch.mockResolvedValue({ data: { id: 1, sentido: 'SALIDA', placa: 'CAR1', motivo: { nombre: 'Tanqueo' }, registrado_por: 'g1', registrado_at: reciente(), anulado: false, kilometraje: 1500 } })
  const w = montar()
  await flushPromises()
  await w.findAll('[data-test=movimiento-fila]')[0].get('[data-test=movimiento-km]').trigger('click')
  await w.get('[data-test=dialogo-texto]').setValue('1500')
  await w.get('[data-test=dialogo-aceptar]').trigger('click')
  await flushPromises()
  expect(porteria.patch).toHaveBeenCalledWith('/eventos/1', { kilometraje: 1500 })
})

test('sin conexión al anular: avisa y recarga la lista', async () => {
  porteria.post.mockRejectedValueOnce({ status: 0, motivo: 'SIN_CONEXION', message: 'Sin conexión' })
  const w = montar()
  await flushPromises()
  const llamadas = porteria.get.mock.calls.length
  await w.findAll('[data-test=movimiento-fila]')[0].get('[data-test=movimiento-anular]').trigger('click')
  await w.get('[data-test=dialogo-texto]').setValue('Error')
  await w.get('[data-test=dialogo-aceptar]').trigger('click')
  await flushPromises()
  expect(w.text()).toContain('Sin conexión: no se pudo confirmar. Revisa la lista antes de reintentar.')
  expect(porteria.get.mock.calls.length).toBe(llamadas + 1)
})
