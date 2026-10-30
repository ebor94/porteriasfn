import { test, expect } from 'vitest'
import { puedeEditar } from '@/utils/permisos'

const ahora = new Date(2026, 9, 5, 10, 0)
const guarda = { usuario: 'g1', rol: 'guarda' }
const admin = { usuario: 'a1', rol: 'admin_porteria' }
const ev = (extra = {}) => ({ id: 1, anulado: false, registrado_por: 'g1', registrado_at: new Date(2026, 9, 5, 9, 50).toISOString(), ...extra })

test('el guarda edita sus registros de los últimos 15 minutos', () => {
  expect(puedeEditar(ev(), guarda, ahora)).toBe(true)
  expect(puedeEditar(ev({ registrado_at: new Date(2026, 9, 5, 9, 44).toISOString() }), guarda, ahora)).toBe(false)
  expect(puedeEditar(ev({ registrado_por: 'otro' }), guarda, ahora)).toBe(false)
})

test('el admin edita cualquiera; nadie edita anulados ni cargas iniciales', () => {
  expect(puedeEditar(ev({ registrado_por: 'otro', registrado_at: '2026-01-01T00:00:00Z' }), admin, ahora)).toBe(true)
  expect(puedeEditar(ev({ anulado: true }), admin, ahora)).toBe(false)
  expect(puedeEditar(ev({ id: null }), admin, ahora)).toBe(false)
})
