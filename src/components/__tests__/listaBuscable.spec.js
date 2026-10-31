import { test, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ListaBuscable from '@/components/ListaBuscable.vue'

test('busca 300 ms después de escribir y emite el elegido', async () => {
  vi.useFakeTimers()
  const buscar = vi.fn(async (q) => [{ id: 1, nombre: `R ${q}` }])
  const w = mount(ListaBuscable, { props: { buscar, etiqueta: (i) => i.nombre, clave: (i) => i.id, seleccionado: null } })
  await w.get('[data-test=buscable-texto]').setValue('mar')
  expect(buscar).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(300)
  await flushPromises()
  expect(buscar).toHaveBeenCalledWith('mar')
  const item = w.get('[data-test=buscable-item]')
  expect(item.text()).toBe('R mar')
  await item.trigger('click')
  expect(w.emitted('elegir')).toEqual([[{ id: 1, nombre: 'R mar' }]])
  vi.useRealTimers()
})

test('inmediata busca al montar y marca el seleccionado', async () => {
  const buscar = vi.fn(async () => [{ id: 1, nombre: 'A' }, { id: 2, nombre: 'B' }])
  const w = mount(ListaBuscable, { props: { buscar, etiqueta: (i) => i.nombre, clave: (i) => i.id, seleccionado: 2, inmediata: true } })
  await flushPromises()
  expect(buscar).toHaveBeenCalledWith('')
  expect(w.findAll('[data-test=buscable-item]').map((i) => i.attributes('aria-selected'))).toEqual(['false', 'true'])
})

test('dice "Buscando…" mientras busca y "Sin resultados" si vuelve vacía', async () => {
  let resolver
  const buscar = vi.fn(() => new Promise((resolve) => { resolver = resolve }))
  const w = mount(ListaBuscable, { props: { buscar, etiqueta: (i) => i.nombre, clave: (i) => i.id, inmediata: true } })
  await flushPromises()
  expect(w.get('[data-test=buscable-buscando]').text()).toBe('Buscando…')
  expect(w.find('[data-test=buscable-vacio]').exists()).toBe(false)
  resolver([])
  await flushPromises()
  expect(w.find('[data-test=buscable-buscando]').exists()).toBe(false)
  expect(w.get('[data-test=buscable-vacio]').text()).toBe('Sin resultados')
})

test('con resultados no hay aviso de vacío, y un error no se confunde con vacío', async () => {
  const w = mount(ListaBuscable, { props: { buscar: async () => [{ id: 1, nombre: 'A' }], etiqueta: (i) => i.nombre, clave: (i) => i.id, inmediata: true } })
  await flushPromises()
  expect(w.find('[data-test=buscable-vacio]').exists()).toBe(false)
  const conError = mount(ListaBuscable, { props: { buscar: async () => { throw new Error('Falló') }, etiqueta: (i) => i.nombre, clave: (i) => i.id, inmediata: true } })
  await flushPromises()
  expect(conError.get('[role=alert]').text()).toBe('Falló')
  expect(conError.find('[data-test=buscable-vacio]').exists()).toBe(false)
})
