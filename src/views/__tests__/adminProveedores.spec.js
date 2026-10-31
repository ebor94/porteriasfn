import { test, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/services/api', () => ({ porteria: { get: vi.fn(), post: vi.fn(), patch: vi.fn() }, tokenStorage: { leer: () => 't', guardar: () => {} } }))
vi.mock('vue-toastification', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }))

import { porteria } from '@/services/api'
import AdminProveedoresView from '@/views/admin/AdminProveedoresView.vue'

const vehiculo = (cambios = {}) => ({ id: 1, placa: 'XYZ123', tipo: 'PROVEEDOR', empresa: 'Flores', descripcion: null, activo: true, ...cambios })

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  setActivePinia(createPinia())
  vi.clearAllMocks()
  porteria.get.mockResolvedValue({ data: [vehiculo(), vehiculo({ id: 2, placa: 'QWE987', empresa: 'Cofres SA', tipo: 'PROVEEDOR_ASISTENCIA', activo: false })] })
})
afterEach(() => vi.useRealTimers())

const montar = () => mount(AdminProveedoresView, { global: { stubs: { MarcoAdmin: { template: '<div><slot /></div>' } } } })

test('carga al entrar y busca al escribir', async () => {
  const w = montar()
  await flushPromises()
  expect(w.findAll('[data-test=proveedor-fila]')).toHaveLength(2)
  expect(w.findAll('[data-test=proveedor-estado]')[1].text()).toBe('Inactivo')
  await w.get('[data-test=proveedores-buscar]').setValue('flo')
  await vi.advanceTimersByTimeAsync(300)
  await flushPromises()
  expect(porteria.get).toHaveBeenLastCalledWith('/vehiculos-externos', { params: { q: 'flo', incluir_inactivos: '1' } })
})

test('editar empresa', async () => {
  porteria.patch.mockResolvedValue({ data: vehiculo({ empresa: 'Flores del Norte' }) })
  const w = montar()
  await flushPromises()
  await w.findAll('[data-test=proveedor-editar]')[0].trigger('click')
  expect(w.get('[data-test=proveedor-placa]').attributes('disabled')).toBeDefined()
  await w.get('[data-test=proveedor-empresa]').setValue('Flores del Norte')
  await w.get('[data-test=proveedor-guardar]').trigger('click')
  await flushPromises()
  expect(porteria.patch).toHaveBeenCalledWith('/vehiculos-externos/1', { empresa: 'Flores del Norte' })
  expect(w.findAll('[data-test=proveedor-fila]')[0].text()).toContain('Flores del Norte')
})

test('agregar valida y muestra el error del servidor', async () => {
  porteria.post.mockRejectedValueOnce({ status: 409, motivo: 'PLACA_PROPIA', message: 'La placa es de un vehículo de la empresa' })
  const w = montar()
  await flushPromises()
  await w.get('[data-test=proveedor-nuevo]').trigger('click')
  await w.get('[data-test=proveedor-guardar]').trigger('click')
  expect(w.get('[data-test=proveedor-form-error]').text()).toBe('Escribe la placa, el tipo y la empresa')
  await w.get('[data-test=proveedor-placa]').setValue('abc-123')
  await w.get('[data-test=proveedor-tipo]').setValue('PROVEEDOR')
  await w.get('[data-test=proveedor-empresa]').setValue('Otra')
  await w.get('[data-test=proveedor-guardar]').trigger('click')
  await flushPromises()
  expect(porteria.post).toHaveBeenCalledWith('/vehiculos-externos', { placa: 'ABC123', tipo: 'PROVEEDOR', empresa: 'Otra', descripcion: null })
  expect(w.get('[data-test=proveedor-form-error]').text()).toBe('La placa es de un vehículo de la empresa')
})

test('activar un inactivo', async () => {
  porteria.patch.mockResolvedValue({ data: vehiculo({ id: 2, placa: 'QWE987', activo: true }) })
  const w = montar()
  await flushPromises()
  await w.findAll('[data-test=proveedor-activo]')[1].trigger('click')
  await flushPromises()
  expect(porteria.patch).toHaveBeenCalledWith('/vehiculos-externos/2', { activo: true })
})
