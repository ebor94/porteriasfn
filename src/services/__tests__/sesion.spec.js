import { test, expect, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { manejarSesionExpirada, vigilarTokenCompartido, instalarSesion, MOTIVO_SESION_EXPIRADA } from '@/services/sesion'
import { porteria, alCambiarDisponibilidad, alSesionExpirada } from '@/services/api'
import { useAuthStore } from '@/stores/auth'

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

test('instalarSesion enlaza la disponibilidad del servicio con el store', async () => {
  setActivePinia(createPinia())
  const dejar = instalarSesion(routerEn('/inicio'))
  const auth = useAuthStore()
  const responder = (status, data) => {
    porteria.defaults.adapter = async (config) => {
      const respuesta = { data, status, statusText: '', headers: {}, config }
      if (status >= 400) throw Object.assign(new Error('http'), { config, response: respuesta, isAxiosError: true })
      return respuesta
    }
  }
  responder(503, { success: false, motivo: 'PORTERIA_DESHABILITADO', message: 'Deshabilitado' })
  await expect(porteria.get('/estado/dentro')).rejects.toMatchObject({ status: 503 })
  expect(auth.servicioNoDisponible).toBe(true)
  responder(200, { success: true, data: [] })
  await porteria.get('/estado/dentro')
  expect(auth.servicioNoDisponible).toBe(false)
  dejar()
  alSesionExpirada(null)
  alCambiarDisponibilidad(null)
})
