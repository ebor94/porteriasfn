import { test, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/services/api', () => ({ porteria: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }))
const guardarArchivo = vi.hoisted(() => vi.fn())
vi.mock('@/services/archivos', async (original) => ({ ...(await original()), guardarArchivo }))

import { porteria } from '@/services/api'
import { useConsultaStore, paramsDe } from '@/stores/consulta'

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

test('params: todas las sedes, placa normalizada y solo filtros con valor', () => {
  expect(paramsDe({ sede: 'todas', desde: '2026-10-01', hasta: '2026-10-31', placa: ' abc-1 ', tipo: '', motivoId: '', inconsistente: '' }))
    .toEqual({ sede_id: 'todas', desde: '2026-10-01', hasta: '2026-10-31', placa: 'ABC1' })
  expect(paramsDe({ sede: 3, desde: '', hasta: '', placa: '', tipo: 'PROPIO', motivoId: 6, inconsistente: '1' }))
    .toEqual({ sede_id: '3', tipo_vehiculo: 'PROPIO', motivo_id: '6', inconsistente: '1' })
})

test('buscar y cargar más con los filtros aplicados, sin repetir filas', async () => {
  const c = useConsultaStore()
  c.filtros = { ...c.filtros, desde: '2026-10-01', hasta: '2026-10-02' }
  porteria.get
    .mockResolvedValueOnce({ data: { items: [{ id: 5 }, { id: 4 }], total: 3, pagina: 1 } })
    .mockResolvedValueOnce({ data: { items: [{ id: 4 }, { id: 3 }], total: 3, pagina: 2 } })
  await c.buscar()
  expect(porteria.get).toHaveBeenCalledWith('/eventos', { params: { sede_id: 'todas', desde: '2026-10-01', hasta: '2026-10-02' } })
  c.filtros.placa = 'zzz'
  await c.cargarMas()
  expect(porteria.get).toHaveBeenLastCalledWith('/eventos', { params: { sede_id: 'todas', desde: '2026-10-01', hasta: '2026-10-02', pagina: 2 } })
  expect(c.items.map((e) => e.id)).toEqual([5, 4, 3])
})

test('una fecha inicial posterior a la final no consulta', async () => {
  const c = useConsultaStore()
  c.filtros = { ...c.filtros, desde: '2026-10-05', hasta: '2026-10-01' }
  await expect(c.buscar()).rejects.toMatchObject({ message: 'La fecha inicial es posterior a la final' })
  expect(porteria.get).not.toHaveBeenCalled()
})

test('descarga el Excel con los filtros visibles', async () => {
  const c = useConsultaStore()
  c.filtros = { ...c.filtros, sede: 2, desde: '2026-10-01', hasta: '2026-10-31' }
  const blob = new Blob(['x'])
  porteria.get.mockResolvedValue(blob)
  await c.descargarExcel()
  expect(porteria.get).toHaveBeenCalledWith('/admin/reportes/movimientos.xlsx', {
    params: { sede_id: '2', desde: '2026-10-01', hasta: '2026-10-31' }, responseType: 'blob', timeout: 120000
  })
  expect(guardarArchivo).toHaveBeenCalledWith(blob, 'movimientos_2026-10-01_2026-10-31.xlsx')
})

test('una respuesta vieja de buscar no pisa la de la búsqueda más reciente', async () => {
  const c = useConsultaStore()
  let resolverViejo
  let resolverNuevo
  porteria.get
    .mockReturnValueOnce(new Promise((r) => { resolverViejo = r }))
    .mockReturnValueOnce(new Promise((r) => { resolverNuevo = r }))
  c.filtros.placa = 'old'
  const viejo = c.buscar()
  c.filtros.placa = 'new'
  const nuevo = c.buscar()
  resolverNuevo({ data: { items: [{ id: 2 }], total: 1, pagina: 1 } })
  await nuevo
  resolverViejo({ data: { items: [{ id: 1 }, { id: 0 }], total: 2, pagina: 1 } })
  await viejo
  expect(c.items.map((e) => e.id)).toEqual([2])
  expect(c.total).toBe(1)
  expect(c.aplicados.placa).toBe('NEW')
})

test('cargarMas en curso no agrega filas si después se hizo otra búsqueda', async () => {
  const c = useConsultaStore()
  let resolverMas
  porteria.get.mockResolvedValueOnce({ data: { items: [{ id: 5 }], total: 3, pagina: 1 } })
  await c.buscar()
  porteria.get.mockReturnValueOnce(new Promise((r) => { resolverMas = r }))
  const mas = c.cargarMas()
  c.filtros.placa = 'zzz'
  porteria.get.mockResolvedValueOnce({ data: { items: [{ id: 9 }], total: 1, pagina: 1 } })
  await c.buscar()
  resolverMas({ data: { items: [{ id: 4 }], total: 3, pagina: 2 } })
  await mas
  expect(c.items.map((e) => e.id)).toEqual([9])
  expect(c.total).toBe(1)
  expect(c.pagina).toBe(1)
})

test('sinMas: una página sin filas nuevas marca el final y buscar lo reinicia', async () => {
  const c = useConsultaStore()
  porteria.get
    .mockResolvedValueOnce({ data: { items: [{ id: 5 }], total: 3, pagina: 1 } })
    .mockResolvedValueOnce({ data: { items: [{ id: 5 }], total: 3, pagina: 2 } })
    .mockResolvedValueOnce({ data: { items: [{ id: 6 }], total: 3, pagina: 1 } })
  await c.buscar()
  expect(c.sinMas).toBe(false)
  await c.cargarMas()
  expect(c.sinMas).toBe(true)
  await c.buscar()
  expect(c.sinMas).toBe(false)
})

test('corregir, anular y recargar reemplazan la fila', async () => {
  const c = useConsultaStore()
  c.items = [{ id: 1, kilometraje: 1 }, { id: 2 }]
  porteria.patch.mockResolvedValue({ data: { id: 1, kilometraje: 5 } })
  porteria.post.mockResolvedValue({ data: { id: 2, anulado: true } })
  porteria.get.mockResolvedValue({ data: { id: 1, kilometraje: 6 } })
  await c.corregir(1, { kilometraje: 5 })
  expect(porteria.patch).toHaveBeenCalledWith('/eventos/1', { kilometraje: 5 })
  await c.anular(2, 'Duplicado')
  expect(porteria.post).toHaveBeenCalledWith('/eventos/2/anular', { motivo: 'Duplicado' })
  expect(await c.recargar(1)).toEqual({ id: 1, kilometraje: 6 })
  expect(porteria.get).toHaveBeenCalledWith('/eventos/1')
  expect(c.items).toEqual([{ id: 1, kilometraje: 6 }, { id: 2, anulado: true }])
})

test('el error tardío de un cargarMas de una búsqueda anterior no se propaga', async () => {
  const c = useConsultaStore()
  let rechazarMas
  porteria.get.mockResolvedValueOnce({ data: { items: [{ id: 5 }], total: 3, pagina: 1 } })
  await c.buscar()
  porteria.get.mockReturnValueOnce(new Promise((resolve, reject) => { rechazarMas = reject }))
  const mas = c.cargarMas()
  porteria.get.mockResolvedValueOnce({ data: { items: [{ id: 9 }], total: 1, pagina: 1 } })
  await c.buscar()
  rechazarMas({ status: 0, message: 'Sin conexión con el servidor' })
  await expect(mas).resolves.toBeUndefined()
  expect(c.items.map((e) => e.id)).toEqual([9])
})

test('el error de un cargarMas vigente sí se propaga', async () => {
  const c = useConsultaStore()
  porteria.get
    .mockResolvedValueOnce({ data: { items: [{ id: 5 }], total: 3, pagina: 1 } })
    .mockRejectedValueOnce({ status: 0, message: 'Sin conexión con el servidor' })
  await c.buscar()
  await expect(c.cargarMas()).rejects.toMatchObject({ message: 'Sin conexión con el servidor' })
})
