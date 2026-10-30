import { test, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/services/api', () => ({ porteria: { get: vi.fn() } }))

import { porteria } from '@/services/api'
import { useCatalogosStore } from '@/stores/catalogos'

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

test('motivos y conductores se guardan 10 minutos por clave', async () => {
  let ahora = 1000000
  vi.spyOn(Date, 'now').mockImplementation(() => ahora)
  porteria.get.mockResolvedValue({ data: [{ id: 1 }] })
  const c = useCatalogosStore()
  await c.motivos('PROPIO', 'SALIDA')
  await c.motivos('PROPIO', 'SALIDA')
  expect(porteria.get).toHaveBeenCalledTimes(1)
  expect(porteria.get).toHaveBeenCalledWith('/catalogos/motivos', { params: { tipo_vehiculo: 'PROPIO', sentido: 'SALIDA' } })
  await c.motivos('PROVEEDOR', 'SALIDA')
  expect(porteria.get).toHaveBeenCalledTimes(2)
  ahora += 10 * 60 * 1000
  await c.motivos('PROPIO', 'SALIDA')
  expect(porteria.get).toHaveBeenCalledTimes(3)
})

test('las búsquedas no se guardan', async () => {
  porteria.get.mockResolvedValue({ data: [] })
  const c = useCatalogosStore()
  await c.asistencias('mar')
  await c.exequias({ q: undefined, placa: 'ABC123' })
  await c.vehiculosExternos('flo')
  expect(porteria.get.mock.calls).toEqual([
    ['/catalogos/asistencias', { params: { q: 'mar' } }],
    ['/catalogos/exequias', { params: { q: undefined, placa: 'ABC123' } }],
    ['/vehiculos-externos', { params: { q: 'flo' } }]
  ])
})
