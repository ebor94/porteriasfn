import { test, expect, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
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
