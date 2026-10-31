import { test, expect, beforeEach, vi } from 'vitest'
import { porteria, normalizarError, tokenStorage, alSesionExpirada, alCambiarDisponibilidad } from '@/services/api'

let ultima
function responder(status, data) {
  porteria.defaults.adapter = async (config) => {
    ultima = config
    const respuesta = { data, status, statusText: '', headers: {}, config }
    if (status >= 400) throw Object.assign(new Error('http'), { config, response: respuesta, isAxiosError: true })
    return respuesta
  }
}

beforeEach(() => {
  localStorage.clear()
  alSesionExpirada(null)
  alCambiarDisponibilidad(null)
})

test('devuelve el cuerpo y manda el token', async () => {
  tokenStorage.guardar('t1')
  responder(200, { success: true, data: { ok: 1 } })
  expect(await porteria.get('/auth/me')).toEqual({ success: true, data: { ok: 1 } })
  expect(ultima.headers.Authorization).toBe('Bearer t1')
  expect(localStorage.getItem('por_token')).toBe('t1')
})

test('normaliza el contrato de error del backend', async () => {
  responder(409, { success: false, error: 'POR-EVT-001', motivo: 'SENTIDO_INCOHERENTE', message: 'Figura dentro', errors: { estado: { dentro: true } } })
  await expect(porteria.post('/eventos', {})).rejects.toEqual({
    status: 409, codigo: 'POR-EVT-001', motivo: 'SENTIDO_INCOHERENTE', message: 'Figura dentro', errors: { estado: { dentro: true } }
  })
})

test('sin respuesta → SIN_CONEXION', () => {
  expect(normalizarError(new Error('Network Error'))).toEqual({
    status: 0, codigo: null, motivo: 'SIN_CONEXION', message: 'Sin conexión con el servidor', errors: []
  })
})

test('un 401 de la sesión vigente avisa; el del login o de un token viejo no', async () => {
  const aviso = vi.fn()
  alSesionExpirada(aviso)
  tokenStorage.guardar('t1')
  responder(401, { success: false, motivo: 'NO_AUTENTICADO', message: 'Sesión inválida o vencida' })
  await expect(porteria.post('/auth/login', {})).rejects.toMatchObject({ status: 401 })
  expect(aviso).not.toHaveBeenCalled()
  await expect(porteria.get('/estado/dentro')).rejects.toMatchObject({ status: 401 })
  expect(aviso).toHaveBeenCalledTimes(1)

  porteria.defaults.adapter = async (config) => {
    tokenStorage.guardar('t2') // otra pestaña entró mientras esta petición viajaba
    throw Object.assign(new Error('http'), { config, response: { status: 401, data: {}, headers: {}, config } })
  }
  await expect(porteria.get('/estado/dentro')).rejects.toMatchObject({ status: 401 })
  expect(aviso).toHaveBeenCalledTimes(1)
})

test('un 502/503/504 sin motivo, o un cuerpo que no es un objeto, es un servidor que no responde', async () => {
  const esperado = (status) => ({ status, codigo: null, motivo: 'SIN_CONEXION', message: 'El servidor no responde. Intenta de nuevo.', errors: [] })
  responder(502, '<html>Bad Gateway</html>')
  await expect(porteria.get('/estado/dentro')).rejects.toEqual(esperado(502))
  responder(503, {})
  await expect(porteria.get('/estado/dentro')).rejects.toEqual(esperado(503))
  responder(504, undefined)
  await expect(porteria.get('/estado/dentro')).rejects.toEqual(esperado(504))
  responder(500, 'Internal Server Error')
  await expect(porteria.get('/estado/dentro')).rejects.toEqual(esperado(500))
  // Con motivo del backend (o 4xx/500 con JSON) se conserva el contrato.
  responder(500, { success: false, motivo: 'ERROR_INTERNO', message: 'Falló' })
  await expect(porteria.get('/estado/dentro')).rejects.toMatchObject({ status: 500, motivo: 'ERROR_INTERNO', message: 'Falló' })
})

test('avisa cuando Portería está deshabilitada y cuando vuelve a responder', async () => {
  const aviso = vi.fn()
  alCambiarDisponibilidad(aviso)
  responder(503, { success: false, motivo: 'PORTERIA_DESHABILITADO', message: 'Deshabilitado' })
  await expect(porteria.get('/estado/dentro')).rejects.toMatchObject({ status: 503, motivo: 'PORTERIA_DESHABILITADO' })
  expect(aviso).toHaveBeenLastCalledWith(false)
  responder(200, { success: true, data: [] })
  await porteria.get('/estado/dentro')
  expect(aviso).toHaveBeenLastCalledWith(true)
})
