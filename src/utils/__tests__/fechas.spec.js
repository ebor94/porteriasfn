import { test, expect } from 'vitest'
import { hoyLocal, horaCorta, haceCuanto, fechaHora } from '@/utils/fechas'

test('hoyLocal usa la fecha del dispositivo', () => {
  expect(hoyLocal(new Date(2026, 9, 5, 23, 59))).toBe('2026-10-05')
})

test('horaCorta', () => {
  expect(horaCorta(new Date(2026, 9, 5, 8, 7))).toBe('08:07')
  expect(horaCorta(null)).toBe('')
})

test.each([
  [new Date(2026, 9, 5, 9, 55), 'hace 5 min'],
  [new Date(2026, 9, 5, 9, 59, 50), 'hace 0 min'],
  [new Date(2026, 9, 5, 7, 50), 'hace 2 h 10 min'],
  [new Date(2026, 9, 2, 10, 0), 'hace 3 días'],
  [new Date(2026, 9, 4, 9, 0), 'hace 1 día']
])('haceCuanto(%s)', (valor, esperado) => {
  expect(haceCuanto(valor, new Date(2026, 9, 5, 10, 0))).toBe(esperado)
})

test('haceCuanto sin valor', () => {
  expect(haceCuanto(null)).toBe('')
})

test('fechaHora en hora local', () => {
  expect(fechaHora(new Date(2026, 9, 5, 7, 4))).toBe('2026-10-05 07:04')
  expect(fechaHora(null)).toBe('')
})
