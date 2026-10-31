import { test, expect, vi, afterEach } from 'vitest'
import { nuevaClave } from '@/utils/clave'

afterEach(() => vi.unstubAllGlobals())

const FORMATO = /^[A-Za-z0-9-]{8,64}$/

test('usa randomUUID si existe', () => {
  vi.stubGlobal('crypto', { randomUUID: () => '3f2c9a1e-7b4d-4c2a-9e1f-0a1b2c3d4e5f', getRandomValues: vi.fn() })
  expect(nuevaClave()).toBe('3f2c9a1e-7b4d-4c2a-9e1f-0a1b2c3d4e5f')
})

test('sin randomUUID (página sin HTTPS) arma una con getRandomValues', () => {
  vi.stubGlobal('crypto', { getRandomValues: (b) => b.fill(171) })
  const clave = nuevaClave()
  expect(clave).toBe('abababab-abab-abab-abab-abababababab')
  expect(clave).toMatch(FORMATO)
})

test('dos claves seguidas son distintas', () => {
  expect(nuevaClave()).not.toBe(nuevaClave())
  expect(nuevaClave()).toMatch(FORMATO)
})
