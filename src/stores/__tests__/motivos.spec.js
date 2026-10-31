import { test, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/services/api', () => ({ porteria: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }))

import { porteria } from '@/services/api'
import { useMotivosStore } from '@/stores/motivos'
import { useCatalogosStore } from '@/stores/catalogos'

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

test('carga, crea, edita y borra manteniendo el orden y limpiando la caché del asistente', async () => {
  const m = useMotivosStore()
  const catalogos = useCatalogosStore()
  porteria.get.mockResolvedValue({ data: [{ id: 1, nombre: 'B', orden: 20 }, { id: 2, nombre: 'A', orden: 10 }] })
  await m.cargar()
  expect(porteria.get).toHaveBeenCalledWith('/admin/motivos')

  catalogos.cache = { x: { datos: [], en: Date.now() } }
  porteria.post.mockResolvedValue({ data: { id: 3, nombre: 'C', orden: 15 } })
  await m.crear({ codigo: 'C' })
  expect(porteria.post).toHaveBeenCalledWith('/admin/motivos', { codigo: 'C' })
  expect(m.lista.map((x) => x.id)).toEqual([2, 3, 1])
  expect(catalogos.cache).toEqual({})

  porteria.patch.mockResolvedValue({ data: { id: 1, nombre: 'B', orden: 5 } })
  catalogos.cache = { x: { datos: [], en: Date.now() } }
  await m.actualizar(1, { orden: 5 })
  expect(porteria.patch).toHaveBeenCalledWith('/admin/motivos/1', { orden: 5 })
  expect(m.lista.map((x) => x.id)).toEqual([1, 2, 3])
  expect(catalogos.cache).toEqual({})

  porteria.delete.mockResolvedValue({ data: { id: 2 } })
  catalogos.cache = { x: { datos: [], en: Date.now() } }
  await m.eliminar(2)
  expect(porteria.delete).toHaveBeenCalledWith('/admin/motivos/2')
  expect(m.lista.map((x) => x.id)).toEqual([1, 3])
  expect(catalogos.cache).toEqual({})
})
