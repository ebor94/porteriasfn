import { test, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/services/api', () => ({ porteria: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }))

import { porteria } from '@/services/api'
import { useEventosStore } from '@/stores/eventos'
import { useEstadoStore } from '@/stores/estado'

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

test('movimientos del día, anular y corregir reemplazan la fila', async () => {
  porteria.get.mockResolvedValue({ data: { items: [{ id: 1, anulado: false }, { id: 2 }], total: 2 } })
  porteria.post.mockResolvedValue({ data: { id: 1, anulado: true } })
  porteria.patch.mockResolvedValue({ data: { id: 2, kilometraje: 9 } })
  const ev = useEventosStore()
  await ev.cargarDelDia('2026-10-05')
  expect(porteria.get).toHaveBeenCalledWith('/eventos', { params: { desde: '2026-10-05', hasta: '2026-10-05' } })
  await ev.anular(1, 'error')
  expect(porteria.post).toHaveBeenCalledWith('/eventos/1/anular', { motivo: 'error' })
  await ev.corregir(2, { kilometraje: 9 })
  expect(porteria.patch).toHaveBeenCalledWith('/eventos/2', { kilometraje: 9 })
  expect(ev.delDia).toEqual([{ id: 1, anulado: true }, { id: 2, kilometraje: 9 }])
})

test('registrar devuelve el evento', async () => {
  porteria.post.mockResolvedValue({ data: { id: 7 } })
  expect(await useEventosStore().registrar({ placa: 'X' })).toEqual({ id: 7 })
  expect(porteria.post).toHaveBeenCalledWith('/eventos', { placa: 'X' })
})

test('estado: sugerencia codifica la placa y cargarTodo trae dentro y fuera', async () => {
  porteria.get.mockImplementation(async (url) => ({ data: url === '/estado/dentro' ? [{ placa: 'A' }] : url === '/estado/fuera' ? [{ placa: 'B' }] : { placa: 'C' } }))
  const estado = useEstadoStore()
  await estado.sugerir('AB C')
  expect(porteria.get).toHaveBeenCalledWith('/estado/placa/AB%20C')
  await estado.cargarTodo()
  expect(estado.dentro).toEqual([{ placa: 'A' }])
  expect(estado.fuera).toEqual([{ placa: 'B' }])
  expect(estado.cargando).toBe(false)
})

test('cargar más pide la página siguiente del mismo día y no repite filas', async () => {
  porteria.get
    .mockResolvedValueOnce({ data: { items: [{ id: 9 }, { id: 8 }], total: 4, pagina: 1, por_pagina: 2 } })
    .mockResolvedValueOnce({ data: { items: [{ id: 8 }, { id: 7 }], total: 4, pagina: 2, por_pagina: 2 } })
  const ev = useEventosStore()
  await ev.cargarDelDia('2026-10-05')
  await ev.cargarMas()
  expect(porteria.get).toHaveBeenLastCalledWith('/eventos', { params: { desde: '2026-10-05', hasta: '2026-10-05', pagina: 2 } })
  expect(ev.delDia.map((e) => e.id)).toEqual([9, 8, 7])
  expect(ev.pagina).toBe(2)
})

test('sinMas: una página sin filas nuevas marca el final y cargarDelDia lo reinicia', async () => {
  porteria.get
    .mockResolvedValueOnce({ data: { items: [{ id: 9 }], total: 3, pagina: 1 } })
    .mockResolvedValueOnce({ data: { items: [{ id: 9 }], total: 3, pagina: 2 } })
    .mockResolvedValueOnce({ data: { items: [{ id: 9 }], total: 3, pagina: 1 } })
  const ev = useEventosStore()
  await ev.cargarDelDia('2026-10-05')
  expect(ev.sinMas).toBe(false)
  await ev.cargarMas()
  expect(ev.sinMas).toBe(true)
  await ev.cargarDelDia('2026-10-05')
  expect(ev.sinMas).toBe(false)
})

test('cargarMas avanza la página aunque la respuesta no la traiga', async () => {
  porteria.get
    .mockResolvedValueOnce({ data: { items: [{ id: 9 }], total: 3 } })
    .mockResolvedValueOnce({ data: { items: [{ id: 8 }], total: 3 } })
  const ev = useEventosStore()
  await ev.cargarDelDia('2026-10-05')
  await ev.cargarMas()
  expect(ev.pagina).toBe(2)
})
