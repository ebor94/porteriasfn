import { test, expect, vi } from 'vitest'
import { manejarSesionExpirada, vigilarTokenCompartido, MOTIVO_SESION_EXPIRADA } from '@/services/sesion'

function routerEn(path) {
  return { currentRoute: { value: { path, fullPath: path } }, replace: vi.fn() }
}

test('cierra sesión y lleva al login con aviso', () => {
  const auth = { token: 't', logout: vi.fn() }
  const router = routerEn('/inicio')
  manejarSesionExpirada({ auth, router })
  expect(auth.logout).toHaveBeenCalled()
  expect(router.replace).toHaveBeenCalledWith({ path: '/login', query: { motivo: MOTIVO_SESION_EXPIRADA } })
})

test('sin sesión no hace nada; en el login solo cierra sesión', () => {
  const sinToken = { token: null, logout: vi.fn() }
  manejarSesionExpirada({ auth: sinToken, router: routerEn('/inicio') })
  expect(sinToken.logout).not.toHaveBeenCalled()
  const auth = { token: 't', logout: vi.fn() }
  const router = routerEn('/login')
  manejarSesionExpirada({ auth, router })
  expect(auth.logout).toHaveBeenCalled()
  expect(router.replace).not.toHaveBeenCalled()
})

test('si otra pestaña cambia el token, recarga', () => {
  const recargar = vi.fn()
  const dejar = vigilarTokenCompartido(recargar)
  window.dispatchEvent(new StorageEvent('storage', { key: 'otra' }))
  expect(recargar).not.toHaveBeenCalled()
  window.dispatchEvent(new StorageEvent('storage', { key: 'por_token' }))
  expect(recargar).toHaveBeenCalledTimes(1)
  dejar()
})
