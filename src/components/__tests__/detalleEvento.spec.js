import { test, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/services/api', () => ({ porteria: { get: vi.fn(), post: vi.fn(), patch: vi.fn() }, tokenStorage: { leer: () => 't', guardar: () => {} } }))
const toastExito = vi.hoisted(() => vi.fn())
vi.mock('vue-toastification', () => ({ useToast: () => ({ success: toastExito, error: vi.fn() }) }))

import { porteria } from '@/services/api'
import { useConsultaStore } from '@/stores/consulta'
import DetalleEvento from '@/components/DetalleEvento.vue'

const MOTIVOS = [{ id: 6, nombre: 'Tanqueo', tipo_referencia: 'NINGUNA', referencia_obligatoria: false }, { id: 7, nombre: 'Lavado', tipo_referencia: 'NINGUNA', referencia_obligatoria: false }]
const evento = (cambios = {}) => ({
  id: 10, sede_id: 1, tipo_vehiculo: 'PROPIO', sentido: 'SALIDA', placa: 'ABC123', motivo_id: 6, motivo: { id: 6, nombre: 'Tanqueo' },
  asistencia_id: null, exequia_id: null, referencia_texto: null, referencia: null, conductor_usuario: 'jperez', conductor_nombre: 'Juan Pérez',
  conductor_documento: null, conductor_otro: false, empresa: null, kilometraje: 1200, observaciones: null, inconsistente: false,
  inconsistencia_tipo: null, registrado_at: new Date(2026, 9, 5, 8, 0).toISOString(), registrado_por: 'g1', corregido_por: null, anulado: false, ...cambios
})

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  setActivePinia(createPinia())
  vi.clearAllMocks()
  porteria.get.mockImplementation(async (url) => {
    if (url === '/catalogos/motivos') return { data: MOTIVOS }
    if (url === '/catalogos/conductores') return { data: [{ usuario: 'jperez', nombre: 'Juan Pérez' }, { usuario: 'mgomez', nombre: 'María Gómez' }] }
    if (url === '/eventos/10') return { data: evento({ kilometraje: 1300, corregido_por: 'otro' }) }
    return { data: [] }
  })
})
afterEach(() => vi.useRealTimers())

// El padre pasa la fila viva de la store, como AdminMovimientosView: recargar o anular cambian el prop.
const montar = (e = evento()) => {
  useConsultaStore().items = [e]
  return mount({
    components: { DetalleEvento },
    setup: () => ({ consulta: useConsultaStore() }),
    template: '<DetalleEvento :evento="consulta.items[0]" />'
  })
}

test('muestra los datos del evento', async () => {
  const w = montar(evento({ inconsistente: true, inconsistencia_tipo: 'SALIDA_OTRA_SEDE', observaciones: 'Salió por Sur' }))
  await flushPromises()
  const texto = w.text()
  expect(texto).toContain('ABC123')
  expect(texto).toContain('Tanqueo')
  expect(texto).toContain('Juan Pérez')
  expect(texto).toContain('Salida por otra sede')
  expect(texto).toContain('Salió por Sur')
})

test('corrige motivo y kilometraje', async () => {
  porteria.patch.mockResolvedValue({ data: evento({ motivo_id: 7, motivo: { id: 7, nombre: 'Lavado' }, kilometraje: 1250 }) })
  const w = montar()
  await flushPromises()
  await w.get('[data-test=detalle-corregir]').trigger('click')
  await flushPromises()
  await w.get('[data-test=correccion-motivo]').setValue('7')
  await w.get('[data-test=correccion-km]').setValue('1250')
  await w.get('[data-test=correccion-guardar]').trigger('click')
  await flushPromises()
  expect(porteria.patch).toHaveBeenCalledWith('/eventos/10', { motivo_id: 7, asistencia_id: null, exequia_id: null, referencia_texto: null, kilometraje: 1250 })
  expect(toastExito).toHaveBeenCalledWith('Registro de ABC123 corregido')
  expect(w.find('[data-test=correccion-guardar]').exists()).toBe(false)
  expect(useConsultaStore().items[0].kilometraje).toBe(1250)
})

test('cambia el conductor a otro de la lista', async () => {
  porteria.patch.mockResolvedValue({ data: evento({ conductor_usuario: 'mgomez', conductor_nombre: 'María Gómez' }) })
  const w = montar()
  await flushPromises()
  await w.get('[data-test=detalle-corregir]').trigger('click')
  await vi.advanceTimersByTimeAsync(300)
  await flushPromises()
  const opcion = w.findAll('[data-test=buscable-item]').find((b) => b.text() === 'María Gómez')
  await opcion.trigger('click')
  await w.get('[data-test=correccion-guardar]').trigger('click')
  await flushPromises()
  expect(porteria.patch).toHaveBeenCalledWith('/eventos/10', {
    conductor_otro: false, conductor_usuario: 'mgomez', conductor_nombre: 'María Gómez', conductor_documento: null, empresa: null
  })
})

test('un 409 MODIFICADO recarga el evento y avisa', async () => {
  porteria.patch.mockRejectedValue({ status: 409, motivo: 'MODIFICADO', message: 'El registro cambió mientras lo editabas. Vuelve a abrirlo.' })
  const w = montar()
  await flushPromises()
  await w.get('[data-test=detalle-corregir]').trigger('click')
  await flushPromises()
  await w.get('[data-test=correccion-km]').setValue('1250')
  await w.get('[data-test=correccion-guardar]').trigger('click')
  await flushPromises()
  expect(w.get('[data-test=detalle-error]').text()).toBe('El registro cambió mientras lo editabas. Vuelve a abrirlo.')
  expect(porteria.get).toHaveBeenCalledWith('/eventos/10')
  expect(useConsultaStore().items[0].kilometraje).toBe(1300)
  expect(w.get('[data-test=correccion-km]').element.value).toBe('1300')
})

test('anular pide el motivo; un anulado no ofrece acciones', async () => {
  porteria.post.mockResolvedValue({ data: evento({ anulado: true, anulado_motivo: 'Duplicado' }) })
  const w = montar()
  await flushPromises()
  await w.get('[data-test=detalle-anular]').trigger('click')
  await w.get('[data-test=dialogo-texto]').setValue('Duplicado')
  await w.get('[data-test=dialogo-aceptar]').trigger('click')
  await flushPromises()
  expect(porteria.post).toHaveBeenCalledWith('/eventos/10/anular', { motivo: 'Duplicado' })
  expect(w.find('[data-test=detalle-anular]').exists()).toBe(false)
  expect(w.find('[data-test=detalle-corregir]').exists()).toBe(false)
  expect(w.text()).toContain('Duplicado')
})
