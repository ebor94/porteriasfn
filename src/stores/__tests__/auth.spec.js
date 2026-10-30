import { test, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/services/api', () => {
  const almacen = { token: null }
  return {
    porteria: { post: vi.fn(), get: vi.fn() },
    tokenStorage: { leer: () => almacen.token, guardar: (t) => { almacen.token = t } }
  }
})

import { porteria, tokenStorage } from '@/services/api'
import { useAuthStore } from '@/stores/auth'

const SEDES = [{ id: 1, codigo: 'N', nombre: 'Norte', ciudad: 'Cúcuta' }]

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  tokenStorage.guardar(null)
})

test('login guarda token, usuario y sedes; sin sede va a elegirla', async () => {
  porteria.post.mockResolvedValue({ data: { token: 't1', user: { usuario: 'g1', nombre: 'G', rol: 'guarda', sede: null }, sedes: SEDES } })
  const auth = useAuthStore()
  await auth.login('OLIVOS\\g1', 'clave')
  expect(porteria.post).toHaveBeenCalledWith('/auth/login', { usuario: 'OLIVOS\\g1', password: 'clave' })
  expect(auth.autenticado).toBe(true)
  expect(tokenStorage.leer()).toBe('t1')
  expect(auth.sedes).toEqual(SEDES)
  expect(auth.rutaInicio).toBe('/sede')
  expect(auth.nombreSede(1)).toBe('Norte')
})

test('elegir sede cambia el token y lleva al inicio', async () => {
  porteria.post.mockResolvedValue({ data: { token: 't2', user: { usuario: 'g1', nombre: 'G', rol: 'guarda', sede: { id: 1, nombre: 'Norte' } } } })
  const auth = useAuthStore()
  await auth.elegirSede(1)
  expect(porteria.post).toHaveBeenCalledWith('/auth/sede', { sede_id: 1 })
  expect(tokenStorage.leer()).toBe('t2')
  expect(auth.sede).toEqual({ id: 1, nombre: 'Norte' })
  expect(auth.rutaInicio).toBe('/inicio')
})

test('cargarPerfil con 401 cierra sesión y relanza', async () => {
  tokenStorage.guardar('viejo')
  porteria.get.mockRejectedValue({ status: 401, motivo: 'NO_AUTENTICADO' })
  const auth = useAuthStore()
  await expect(auth.cargarPerfil()).rejects.toMatchObject({ status: 401 })
  expect(auth.token).toBeNull()
  expect(tokenStorage.leer()).toBeNull()
})

test('esAdmin y cargarSedes (una sola vez)', async () => {
  porteria.get.mockResolvedValue({ data: SEDES })
  const auth = useAuthStore()
  auth.usuario = { rol: 'admin_porteria' }
  expect(auth.esAdmin).toBe(true)
  await auth.cargarSedes()
  await auth.cargarSedes()
  expect(porteria.get).toHaveBeenCalledTimes(1)
  expect(porteria.get).toHaveBeenCalledWith('/catalogos/sedes')
})
