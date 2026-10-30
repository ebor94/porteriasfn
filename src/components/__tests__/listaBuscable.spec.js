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
