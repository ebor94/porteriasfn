import { test, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/services/api', () => ({ porteria: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }, tokenStorage: { leer: () => 't', guardar: () => {} } }))
const confirmar = vi.hoisted(() => vi.fn())
vi.mock('@/composables/confirmar', () => ({ confirmar, responder: vi.fn() }))
const toastExito = vi.hoisted(() => vi.fn())
vi.mock('vue-toastification', () => ({ useToast: () => ({ success: toastExito, error: vi.fn() }) }))

import { porteria } from '@/services/api'
import AdminMotivosView from '@/views/admin/AdminMotivosView.vue'

const motivo = (cambios = {}) => ({
  id: 1, codigo: 'LAVADO', nombre: 'Lavado', descripcion: null, aplica_propio: true, aplica_proveedor_asistencia: false,
  aplica_proveedor: false, aplica_ingreso: true, aplica_salida: true, tipo_referencia: 'NINGUNA', referencia_obligatoria: false,
  orden: 70, activo: true, en_uso: false, ...cambios
})

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  confirmar.mockReset()
  porteria.get.mockResolvedValue({ data: [motivo(), motivo({ id: 2, codigo: 'OTRO', nombre: 'Otro', aplica_propio: false, aplica_proveedor: true, tipo_referencia: 'TEXTO', orden: 120, activo: false, en_uso: true })] })
})

const montar = () => mount(AdminMotivosView, { global: { stubs: { MarcoAdmin: { template: '<div><slot /></div>' } } } })

test('lista los motivos con su estado', async () => {
  const w = montar()
  await flushPromises()
  const filas = w.findAll('[data-test=motivo-fila]')
  expect(filas).toHaveLength(2)
  expect(filas[0].text()).toContain('Lavado')
  expect(filas[0].text()).toContain('Propio')
  expect(filas[1].get('[data-test=motivo-estado]').text()).toBe('Inactivo')
  expect(filas[1].find('[data-test=motivo-borrar]').exists()).toBe(false)
})

test('si la carga falla, muestra el error y deja reintentar', async () => {
  porteria.get.mockRejectedValueOnce({ status: 0, motivo: 'SIN_CONEXION', message: 'Sin conexión con el servidor' })
  const w = montar()
  await flushPromises()
  expect(w.get('[data-test=motivos-error]').text()).toBe('Sin conexión con el servidor')
  await w.get('[data-test=motivos-reintentar]').trigger('click')
  await flushPromises()
  expect(w.findAll('[data-test=motivo-fila]')).toHaveLength(2)
})

test('crear un motivo desde el formulario', async () => {
  porteria.post.mockResolvedValue({ data: motivo({ id: 3, codigo: 'NUEVO', nombre: 'Nuevo', orden: 0 }) })
  const w = montar()
  await flushPromises()
  await w.get('[data-test=motivo-nuevo]').trigger('click')
  await w.get('[data-test=motivo-codigo]').setValue('nuevo')
  await w.get('[data-test=motivo-nombre]').setValue('Nuevo')
  await w.get('[data-test=motivo-guardar]').trigger('click')
  await flushPromises()
  expect(w.get('[data-test=motivo-form-error]').text()).toBe('Marca al menos un tipo de vehículo')
  await w.get('[data-test=motivo-aplica_propio]').setValue(true)
  await w.get('[data-test=motivo-guardar]').trigger('click')
  await flushPromises()
  expect(porteria.post).toHaveBeenCalledWith('/admin/motivos', expect.objectContaining({ codigo: 'NUEVO', nombre: 'Nuevo', aplica_propio: true }))
  expect(w.find('[data-test=motivo-formulario]').exists()).toBe(false)
  expect(w.findAll('[data-test=motivo-fila]')).toHaveLength(3)
})

test('editar envía solo lo cambiado; un error del servidor queda en el formulario', async () => {
  porteria.patch.mockRejectedValueOnce({ status: 400, motivo: 'VALIDACION', message: 'Un motivo sin referencia no puede exigirla' })
  const w = montar()
  await flushPromises()
  await w.findAll('[data-test=motivo-editar]')[0].trigger('click')
  expect(w.find('[data-test=motivo-codigo]').exists()).toBe(false)
  await w.get('[data-test=motivo-nombre]').setValue('Lavado general')
  await w.get('[data-test=motivo-guardar]').trigger('click')
  await flushPromises()
  expect(porteria.patch).toHaveBeenCalledWith('/admin/motivos/1', { nombre: 'Lavado general' })
  expect(w.get('[data-test=motivo-form-error]').text()).toBe('Un motivo sin referencia no puede exigirla')
})

test('al volver a Ninguna la referencia obligatoria se limpia y se puede guardar', async () => {
  porteria.post.mockResolvedValue({ data: motivo({ id: 3, codigo: 'NUEVO', nombre: 'Nuevo' }) })
  const w = montar()
  await flushPromises()
  await w.get('[data-test=motivo-nuevo]').trigger('click')
  await w.get('[data-test=motivo-codigo]').setValue('nuevo')
  await w.get('[data-test=motivo-nombre]').setValue('Nuevo')
  await w.get('[data-test=motivo-aplica_propio]').setValue(true)
  await w.get('[data-test=motivo-tipo_referencia]').setValue('ASISTENCIA')
  await w.get('[data-test=motivo-referencia_obligatoria]').setValue(true)
  await w.get('[data-test=motivo-tipo_referencia]').setValue('NINGUNA')
  await w.get('[data-test=motivo-guardar]').trigger('click')
  await flushPromises()
  expect(w.find('[data-test=motivo-form-error]').exists()).toBe(false)
  expect(porteria.post).toHaveBeenCalledWith('/admin/motivos', expect.objectContaining({ tipo_referencia: 'NINGUNA', referencia_obligatoria: false }))
})

test('activar o inactivar en un toque', async () => {
  porteria.patch.mockResolvedValue({ data: motivo({ id: 2, codigo: 'OTRO', nombre: 'Otro', activo: true, en_uso: true, orden: 120 }) })
  const w = montar()
  await flushPromises()
  await w.findAll('[data-test=motivo-activo]')[1].trigger('click')
  await flushPromises()
  expect(porteria.patch).toHaveBeenCalledWith('/admin/motivos/2', { activo: true })
  expect(w.findAll('[data-test=motivo-estado]')[1].text()).toBe('Activo')
})

test('borrar pide confirmación; un 409 muestra el mensaje del servidor', async () => {
  confirmar.mockResolvedValueOnce(false).mockResolvedValueOnce(true)
  porteria.delete.mockRejectedValueOnce({ status: 409, motivo: 'MOTIVO_EN_USO', message: 'El motivo tiene registros: inactívalo en lugar de borrarlo' })
  const w = montar()
  await flushPromises()
  await w.get('[data-test=motivo-borrar]').trigger('click')
  await flushPromises()
  expect(porteria.delete).not.toHaveBeenCalled()
  expect(confirmar).toHaveBeenCalledWith('¿Borrar el motivo "Lavado"?', { aceptar: 'Borrar', peligro: true })
  await w.get('[data-test=motivo-borrar]').trigger('click')
  await flushPromises()
  expect(w.get('[data-test=motivos-error]').text()).toBe('El motivo tiene registros: inactívalo en lugar de borrarlo')
})
