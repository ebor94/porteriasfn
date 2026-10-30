import { test, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DialogoInconsistencia from '@/components/DialogoInconsistencia.vue'

test('exige observación para registrar igual', async () => {
  const w = mount(DialogoInconsistencia, { props: { mensaje: 'Este vehículo figura dentro.', detalle: 'Figura dentro de Norte desde las 14:20.' } })
  expect(w.get('[data-test=inconsistencia-mensaje]').text()).toBe('Este vehículo figura dentro.')
  expect(w.get('[data-test=inconsistencia-detalle]').text()).toBe('Figura dentro de Norte desde las 14:20.')
  const boton = w.get('[data-test=inconsistencia-registrar]')
  expect(boton.attributes('disabled')).toBeDefined()
  await w.get('[data-test=inconsistencia-observacion]').setValue('  Salió sin registrar  ')
  expect(boton.attributes('disabled')).toBeUndefined()
  await boton.trigger('click')
  expect(w.emitted('registrar-igual')).toEqual([['Salió sin registrar']])
  await w.get('[data-test=inconsistencia-cancelar]').trigger('click')
  expect(w.emitted('cancelar')).toHaveLength(1)
})

test('pre-llena la observación del guarda y permite registrar de una vez', async () => {
  const w = mount(DialogoInconsistencia, { props: { mensaje: 'm', observacionInicial: 'Ya lo escribí' } })
  expect(w.get('[data-test=inconsistencia-observacion]').element.value).toBe('Ya lo escribí')
  expect(w.get('[data-test=inconsistencia-registrar]').attributes('disabled')).toBeUndefined()
  await w.get('[data-test=inconsistencia-registrar]').trigger('click')
  expect(w.emitted('registrar-igual')).toEqual([['Ya lo escribí']])
})
