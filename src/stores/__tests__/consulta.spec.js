import { test, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/services/api', () => ({ porteria: { get: vi.fn() } }))
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
