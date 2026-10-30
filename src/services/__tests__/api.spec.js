import { test, expect, beforeEach, vi } from 'vitest'
import { porteria, normalizarError, tokenStorage, alSesionExpirada } from '@/services/api'

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
