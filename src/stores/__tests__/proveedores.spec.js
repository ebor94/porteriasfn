import { test, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/services/api', () => ({ porteria: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }))

import { porteria } from '@/services/api'
import { useProveedoresStore } from '@/stores/proveedores'
import { useCatalogosStore } from '@/stores/catalogos'

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

test('busca con inactivos, crea al inicio de la lista y reemplaza al editar', async () => {
  const p = useProveedoresStore()
  porteria.get.mockResolvedValue({ data: [{ id: 1, placa: 'AAA111', activo: false }] })
  await p.buscar('aaa')
  expect(porteria.get).toHaveBeenCalledWith('/vehiculos-externos', { params: { q: 'aaa', incluir_inactivos: '1' } })
  await p.buscar('')
  expect(porteria.get).toHaveBeenLastCalledWith('/vehiculos-externos', { params: { incluir_inactivos: '1' } })

  porteria.post.mockResolvedValue({ data: { id: 2, placa: 'BBB222', activo: true } })
  useCatalogosStore().cache = { x: { datos: [], en: Date.now() } }
  await p.crear({ placa: 'bbb222', tipo: 'PROVEEDOR', empresa: 'X', descripcion: null })
  expect(porteria.post).toHaveBeenCalledWith('/vehiculos-externos', { placa: 'bbb222', tipo: 'PROVEEDOR', empresa: 'X', descripcion: null })
  expect(p.lista.map((v) => v.id)).toEqual([2, 1])
  expect(useCatalogosStore().cache).toEqual({})

  useCatalogosStore().cache = { x: { datos: [], en: Date.now() } }
  porteria.patch.mockResolvedValue({ data: { id: 1, placa: 'AAA111', activo: true } })
  await p.actualizar(1, { activo: true })
  expect(porteria.patch).toHaveBeenCalledWith('/vehiculos-externos/1', { activo: true })
  expect(p.lista.find((v) => v.id === 1).activo).toBe(true)
  expect(useCatalogosStore().cache).toEqual({})
})

test('una respuesta vieja de buscar no pisa la lista de la búsqueda más reciente', async () => {
  const p = useProveedoresStore()
  let resolverViejo
  let resolverNuevo
  porteria.get
    .mockReturnValueOnce(new Promise((r) => { resolverViejo = r }))
    .mockReturnValueOnce(new Promise((r) => { resolverNuevo = r }))
  const viejo = p.buscar('fl')
  const nuevo = p.buscar('flo')
  resolverNuevo({ data: [{ id: 2, placa: 'NEW222' }] })
  await nuevo
  resolverViejo({ data: [{ id: 1, placa: 'OLD111' }] })
  await viejo
  expect(p.lista.map((v) => v.id)).toEqual([2])
})

test('una búsqueda en vuelo no pisa una edición o un alta que terminó después de pedirla', async () => {
  const p = useProveedoresStore()
  porteria.get.mockResolvedValueOnce({ data: [{ id: 1, placa: 'AAA111', activo: false }] })
  await p.buscar('')
  let resolverBusqueda
  porteria.get.mockReturnValueOnce(new Promise((r) => { resolverBusqueda = r }))
  const buscando = p.buscar('aaa')
  porteria.patch.mockResolvedValue({ data: { id: 1, placa: 'AAA111', activo: true } })
  await p.actualizar(1, { activo: true })
  resolverBusqueda({ data: [{ id: 1, placa: 'AAA111', activo: false }] })
  await buscando
  expect(p.lista).toEqual([{ id: 1, placa: 'AAA111', activo: true }])

  porteria.get.mockReturnValueOnce(new Promise((r) => { resolverBusqueda = r }))
  const otra = p.buscar('')
  porteria.post.mockResolvedValue({ data: { id: 2, placa: 'BBB222', activo: true } })
  await p.crear({ placa: 'BBB222', tipo: 'PROVEEDOR', empresa: 'X', descripcion: null })
  resolverBusqueda({ data: [{ id: 1, placa: 'AAA111', activo: false }] })
  await otra
  expect(p.lista.map((v) => v.id)).toEqual([2, 1])
})
