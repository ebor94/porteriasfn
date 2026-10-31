import { test, expect } from 'vitest'
import { rutaInterna } from '@/utils/rutas'

test('acepta solo rutas internas', () => {
  expect(rutaInterna('/vehiculos?vista=fuera')).toBe('/vehiculos?vista=fuera')
  expect(rutaInterna('//malo.com')).toBeNull()
  expect(rutaInterna('/\\malo.com')).toBeNull()
  expect(rutaInterna('https://malo.com')).toBeNull()
  expect(rutaInterna('inicio')).toBeNull()
  expect(rutaInterna(['/a'], '/inicio')).toBe('/inicio')
  expect(rutaInterna(undefined, '/inicio')).toBe('/inicio')
})
