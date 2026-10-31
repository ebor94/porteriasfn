import { test, expect, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import ConfirmacionGlobal from '@/components/ConfirmacionGlobal.vue'
import { confirmar, responder } from '@/composables/confirmar'

afterEach(() => responder(false))

test('muestra el mensaje y resuelve true al aceptar', async () => {
  const w = mount(ConfirmacionGlobal)
  expect(w.find('[role=alertdialog]').exists()).toBe(false)
  const respuesta = confirmar('¿Cerrar sesión?', { aceptar: 'Cerrar sesión' })
  await flushPromises()
  expect(w.get('[data-test=confirmacion-mensaje]').text()).toBe('¿Cerrar sesión?')
  expect(w.get('[data-test=confirmacion-aceptar]').text()).toBe('Cerrar sesión')
  await w.get('[data-test=confirmacion-aceptar]').trigger('click')
  expect(await respuesta).toBe(true)
  expect(w.find('[role=alertdialog]').exists()).toBe(false)
})

test('cancelar resuelve false; el estilo de peligro se aplica', async () => {
  const w = mount(ConfirmacionGlobal)
  const respuesta = confirmar('¿Borrar?', { aceptar: 'Borrar', peligro: true })
  await flushPromises()
  expect(w.get('[data-test=confirmacion-aceptar]').classes()).toContain('btn-peligro')
  await w.get('[data-test=confirmacion-cancelar]').trigger('click')
  expect(await respuesta).toBe(false)
})

test('una confirmación nueva cancela la anterior', async () => {
  const primera = confirmar('Uno')
  const segunda = confirmar('Dos')
  expect(await primera).toBe(false)
  responder(true)
  expect(await segunda).toBe(true)
})

test('al abrir, el foco pasa a Cancelar; Escape resuelve false y devuelve el foco', async () => {
  const disparador = document.createElement('button')
  document.body.appendChild(disparador)
  disparador.focus()
  const w = mount(ConfirmacionGlobal, { attachTo: document.body })
  const respuesta = confirmar('¿Borrar?', { aceptar: 'Borrar', peligro: true })
  await flushPromises()
  await nextTick()
  const cancelar = w.get('[data-test=confirmacion-cancelar]').element
  expect(document.activeElement).toBe(cancelar)
  await w.get('[data-test=confirmacion-cancelar]').trigger('keydown', { key: 'Escape' })
  expect(await respuesta).toBe(false)
  await flushPromises()
  expect(document.activeElement).toBe(disparador)
  w.unmount()
  disparador.remove()
})

test('Tab se queda dentro del diálogo', async () => {
  const w = mount(ConfirmacionGlobal, { attachTo: document.body })
  confirmar('¿Seguro?')
  await flushPromises()
  await nextTick()
  const aceptar = w.get('[data-test=confirmacion-aceptar]')
  aceptar.element.focus()
  await aceptar.trigger('keydown', { key: 'Tab' })
  expect(document.activeElement).toBe(w.get('[data-test=confirmacion-cancelar]').element)
  await w.get('[data-test=confirmacion-cancelar]').trigger('keydown', { key: 'Tab', shiftKey: true })
  expect(document.activeElement).toBe(aceptar.element)
  w.unmount()
})
