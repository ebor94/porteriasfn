import { test, expect } from 'vitest'
import { rutaInterna, esNavegacionDeHistorial } from '@/utils/rutas'

test('acepta solo rutas internas', () => {
  expect(rutaInterna('/vehiculos?vista=fuera')).toBe('/vehiculos?vista=fuera')
  expect(rutaInterna('//malo.com')).toBeNull()
  expect(rutaInterna('/\\malo.com')).toBeNull()
  expect(rutaInterna('https://malo.com')).toBeNull()
  expect(rutaInterna('inicio')).toBeNull()
  expect(rutaInterna(['/a'], '/inicio')).toBe('/inicio')
  expect(rutaInterna(undefined, '/inicio')).toBe('/inicio')
})

test('esNavegacionDeHistorial compara history.state.current con el destino', () => {
  window.history.replaceState({ current: '/inicio' }, '')
  expect(esNavegacionDeHistorial({ fullPath: '/inicio' })).toBe(true)
  expect(esNavegacionDeHistorial({ fullPath: '/vehiculos' })).toBe(false)
  window.history.replaceState(null, '')
  expect(esNavegacionDeHistorial({ fullPath: '/inicio' })).toBe(false)
})
