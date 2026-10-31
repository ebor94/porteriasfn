import { test, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/services/api', () => ({ porteria: { get: vi.fn(), post: vi.fn(), patch: vi.fn() }, tokenStorage: { leer: () => 't', guardar: () => {} } }))
const guardarArchivo = vi.hoisted(() => vi.fn())
vi.mock('@/services/archivos', async (original) => ({ ...(await original()), guardarArchivo }))
vi.mock('vue-toastification', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }))

import { porteria } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import AdminMovimientosView from '@/views/admin/AdminMovimientosView.vue'

const evento = (id, cambios = {}) => ({
  id, sede_id: 1, sentido: 'SALIDA', tipo_vehiculo: 'PROPIO', placa: `CAR${id}`, motivo: { id: 6, nombre: 'Tanqueo' },
  conductor_nombre: 'Juan', registrado_at: new Date(2026, 9, 5, 8, 0).toISOString(), registrado_por: 'g1',
  anulado: false, inconsistente: false, ...cambios
})

function api({ eventos = { items: [evento(1), evento(2, { inconsistente: true, sede_id: 2 })], total: 3, pagina: 1 } } = {}) {
  porteria.get.mockImplementation(async (url, opciones = {}) => {
    if (url === '/catalogos/sedes') return { data: [{ id: 1, nombre: 'Norte' }, { id: 2, nombre: 'Sur' }] }
    if (url === '/admin/motivos') return { data: [{ id: 6, nombre: 'Tanqueo', orden: 60 }] }
    if (url === '/eventos') return { data: opciones.params.pagina === 2 ? { items: [evento(3)], total: 3, pagina: 2 } : eventos }
    if (url === '/admin/reportes/movimientos.xlsx') return new Blob(['x'])
    return { data: [] }
  })
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  useAuthStore().fijarSesion('t', { usuario: 'a1', nombre: 'A', rol: 'admin_porteria', sede: null })
  api()
})

const montar = () => mount(AdminMovimientosView, { global: { stubs: { MarcoAdmin: { template: '<div><slot /></div>' }, DetalleEvento: true } } })

test('al entrar consulta hoy en todas las sedes y muestra sede, marca y "cargar más"', async () => {
  const w = montar()
  await flushPromises()
  const llamada = porteria.get.mock.calls.find(([url]) => url === '/eventos')
  expect(llamada[1].params.sede_id).toBe('todas')
  expect(llamada[1].params.desde).toBe(llamada[1].params.hasta)
  const filas = w.findAll('[data-test=consulta-fila]')
  expect(filas).toHaveLength(2)
  expect(filas[1].text()).toContain('Sur')
  expect(filas[1].find('[data-test=consulta-inconsistente]').exists()).toBe(true)
  expect(w.get('[data-test=consulta-total]').text()).toBe('2 de 3')
  await w.get('[data-test=consulta-mas]').trigger('click')
  await flushPromises()
  expect(w.findAll('[data-test=consulta-fila]')).toHaveLength(3)
  expect(w.find('[data-test=consulta-mas]').exists()).toBe(false)
})

test('buscar con filtros y descargar el Excel', async () => {
  const w = montar()
  await flushPromises()
  await w.get('[data-test=filtro-sede]').setValue('2')
  await w.get('[data-test=filtro-desde]').setValue('2026-10-01')
  await w.get('[data-test=filtro-hasta]').setValue('2026-10-31')
  await w.get('[data-test=filtro-inconsistente]').setValue('1')
  await w.get('[data-test=consulta-buscar]').trigger('click')
  await flushPromises()
  expect(porteria.get).toHaveBeenLastCalledWith('/eventos', { params: { sede_id: '2', desde: '2026-10-01', hasta: '2026-10-31', inconsistente: '1' } })
  await w.get('[data-test=consulta-excel]').trigger('click')
  await flushPromises()
  expect(guardarArchivo).toHaveBeenCalledWith(expect.any(Blob), 'movimientos_2026-10-01_2026-10-31.xlsx')
})

test('un error de la consulta o del Excel se muestra', async () => {
  const w = montar()
  await flushPromises()
  porteria.get.mockRejectedValueOnce({ status: 413, motivo: 'DEMASIADOS_REGISTROS', message: 'El reporte supera 50000 movimientos. Acota las fechas o los filtros.' })
  await w.get('[data-test=consulta-excel]').trigger('click')
  await flushPromises()
  expect(w.get('[data-test=consulta-error]').text()).toBe('El reporte supera 50000 movimientos. Acota las fechas o los filtros.')
  await w.get('[data-test=filtro-desde]').setValue('2026-10-09')
  await w.get('[data-test=filtro-hasta]').setValue('2026-10-01')
  await w.get('[data-test=consulta-buscar]').trigger('click')
  await flushPromises()
  expect(w.get('[data-test=consulta-error]').text()).toBe('La fecha inicial es posterior a la final')
})

test('oculta "Cargar más" cuando la última página no trajo filas nuevas', async () => {
  porteria.get.mockImplementation(async (url, opciones = {}) => {
    if (url === '/eventos') return { data: opciones.params.pagina === 2 ? { items: [evento(1)], total: 5, pagina: 2 } : { items: [evento(1)], total: 5, pagina: 1 } }
    return { data: [] }
  })
  const w = montar()
  await flushPromises()
  await w.get('[data-test=consulta-mas]').trigger('click')
  await flushPromises()
  expect(w.find('[data-test=consulta-mas]').exists()).toBe(false)
})

test('"Cargar más" queda deshabilitado mientras se busca', async () => {
  const w = montar()
  await flushPromises()
  let resolver
  porteria.get.mockImplementation((url) => (url === '/eventos' ? new Promise((r) => { resolver = r }) : Promise.resolve({ data: [] })))
  await w.get('[data-test=filtro-desde]').setValue('2026-10-01')
  await w.get('[data-test=consulta-buscar]').trigger('click')
  await flushPromises()
  expect(w.get('[data-test=consulta-mas]').attributes('disabled')).toBeDefined()
  resolver({ data: { items: [evento(7)], total: 3, pagina: 1 } })
  await flushPromises()
  expect(w.get('[data-test=consulta-mas]').attributes('disabled')).toBeUndefined()
})

test('tocar una fila abre el detalle', async () => {
  const w = montar()
  await flushPromises()
  expect(w.find('detalle-evento-stub').exists()).toBe(false)
  await w.findAll('[data-test=consulta-fila]')[0].trigger('click')
  expect(w.find('detalle-evento-stub').exists()).toBe(true)
})
