import { test, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DialogoTexto from '@/components/DialogoTexto.vue'

async function aceptable(valor, numerico) {
  const w = mount(DialogoTexto, { props: { titulo: 'T', etiqueta: 'E', numerico } })
  await w.get('[data-test=dialogo-texto]').setValue(valor)
  return w.get('[data-test=dialogo-aceptar]').attributes('disabled') === undefined
}

test('numérico: hasta 5.000.000 y solo dígitos', async () => {
  expect(await aceptable('5000000', true)).toBe(true)
  expect(await aceptable('5000001', true)).toBe(false)
  expect(await aceptable('9999999', true)).toBe(false)
  expect(await aceptable('12a', true)).toBe(false)
  expect(await aceptable('', true)).toBe(false)
})

test('texto: obligatorio', async () => {
  expect(await aceptable('motivo', false)).toBe(true)
  expect(await aceptable('  ', false)).toBe(false)
})
