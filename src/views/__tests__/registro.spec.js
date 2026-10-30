// Flujo completo del asistente con la API simulada.
import { test, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

vi.mock('@/services/api', () => ({
  porteria: { get: vi.fn(), post: vi.fn() },
  tokenStorage: { leer: () => 't', guardar: () => {} }
}))
vi.mock('vue-toastification', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }))

import { porteria } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import RegistroView from '@/views/RegistroView.vue'

const SUGERENCIA = {
  placa: 'ABC123', tipo_vehiculo: 'PROPIO', vehiculo: { id: 9, placa: 'ABC123' }, vehiculo_externo: null,
  estado: null, sentido_sugerido: 'SALIDA', propuesta: null
}
const MOTIVOS = [{ id: 6, codigo: 'TANQUEO', nombre: 'Tanqueo', tipo_referencia: 'NINGUNA', referencia_obligatoria: false }]

function apiSimulada() {
  porteria.get.mockImplementation(async (url) => {
    if (url.startsWith('/estado/placa/')) return { data: SUGERENCIA }
    if (url === '/catalogos/conductores') return { data: [{ usuario: 'jperez', nombre: 'Juan Pérez' }] }
    if (url === '/catalogos/motivos') return { data: MOTIVOS }
    if (url === '/catalogos/sedes') return { data: [{ id: 1, nombre: 'Norte' }] }
    return { data: [] }
  })
}

async function montar() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/registrar/:sentido?', component: RegistroView }, { path: '/inicio', component: { template: '<div />' } }]
  })
  router.push('/registrar')
  await router.isReady()
  const w = mount(RegistroView, { global: { plugins: [router], stubs: { MarcoGuarda: { template: '<div><slot /></div>' } } } })
  await flushPromises()
  return { w, router }
}

async function avanzar(w) {
  await w.get('[data-test=registro-siguiente]').trigger('click')
  await flushPromises()
}

afterEach(() => vi.useRealTimers())

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  setActivePinia(createPinia())
  vi.clearAllMocks()
  useAuthStore().usuario = { usuario: 'g1', nombre: 'G', rol: 'guarda', sede: { id: 1, nombre: 'Norte' } }
  apiSimulada()
})

async function llenarHastaConfirmar(w) {
  await w.get('[data-test=registro-placa]').setValue('abc-123')
  await w.get('[data-test=registro-consultar]').trigger('click')
  await flushPromises()
  expect(porteria.get).toHaveBeenCalledWith('/estado/placa/ABC123')
  await avanzar(w)
  expect(w.find('[data-test=paso-conductor]').exists()).toBe(true)
  await vi.advanceTimersByTimeAsync(300)
  await flushPromises()
  await w.get('[data-test=buscable-item]').trigger('click')
  await avanzar(w)
  await w.get('[data-test=registro-motivo-6]').trigger('click')
  await avanzar(w)
  expect(w.find('[data-test=paso-detalles]').exists()).toBe(true)
  await w.get('[data-test=registro-km]').setValue('1200')
  await avanzar(w)
  expect(w.find('[data-test=paso-confirmar]').exists()).toBe(true)
}

test('registra la salida de un propio con los pasos que aplican', async () => {
  porteria.post.mockResolvedValue({ data: { id: 1, sentido: 'SALIDA', placa: 'ABC123' } })
  const { w, router } = await montar()
  await llenarHastaConfirmar(w)
  await avanzar(w)
  expect(porteria.post).toHaveBeenCalledWith('/eventos', {
    sentido: 'SALIDA', placa: 'ABC123', motivo_id: 6, conductor_usuario: 'jperez', conductor_nombre: 'Juan Pérez', kilometraje: 1200
  })
  expect(router.currentRoute.value.path).toBe('/inicio')
})

test('un 409 de sentido abre el diálogo y "registrar igual" reenvía con observación', async () => {
  porteria.post
    .mockRejectedValueOnce({
      status: 409, motivo: 'SENTIDO_INCOHERENTE', message: 'Este vehículo figura fuera. Para registrar la salida igual, confírmalo y escribe una observación.',
      errors: { estado: { dentro: false, sede_id: 1, desde: null, sin_historial: false, otra_sede: false } }
    })
    .mockResolvedValueOnce({ data: { id: 2, sentido: 'SALIDA', placa: 'ABC123' } })
  const { w } = await montar()
  await llenarHastaConfirmar(w)
  await avanzar(w)
  expect(w.get('[data-test=inconsistencia-detalle]').text()).toBe('Figura fuera.')
  await w.get('[data-test=inconsistencia-observacion]').setValue('Salió de noche sin registro')
  await w.get('[data-test=inconsistencia-registrar]').trigger('click')
  await flushPromises()
  expect(porteria.post).toHaveBeenLastCalledWith('/eventos', expect.objectContaining({ forzar: true, observaciones: 'Salió de noche sin registro' }))
})

test('un paso incompleto muestra el error y no avanza', async () => {
  const { w } = await montar()
  await avanzar(w)
  expect(w.get('[data-test=registro-error]').text()).toBe('Escribe la placa')
  expect(w.find('[data-test=paso-placa]').exists()).toBe(true)
})

test('otros errores del servidor se muestran sin diálogo', async () => {
  porteria.post.mockRejectedValue({ status: 409, motivo: 'OCUPADO', message: 'Otro registro de esta placa está en curso. Intenta de nuevo.', errors: [] })
  const { w } = await montar()
  await llenarHastaConfirmar(w)
  await avanzar(w)
  expect(w.find('[data-test=inconsistencia-registrar]').exists()).toBe(false)
  expect(w.get('[data-test=registro-error]').text()).toBe('Otro registro de esta placa está en curso. Intenta de nuevo.')
})

test('si el motivo propuesto no está en la lista del sentido, se descarta', async () => {
  const base = porteria.get.getMockImplementation()
  porteria.get.mockImplementation(async (url, ...resto) => {
    if (url.startsWith('/estado/placa/')) return { data: { ...SUGERENCIA, propuesta: { motivo: { id: 99 } } } }
    return base(url, ...resto)
  })
  const { w } = await montar()
  await w.get('[data-test=registro-placa]').setValue('abc123')
  await w.get('[data-test=registro-consultar]').trigger('click')
  await flushPromises()
  await avanzar(w)
  await vi.advanceTimersByTimeAsync(300)
  await flushPromises()
  await w.get('[data-test=buscable-item]').trigger('click')
  await avanzar(w)
  expect(w.find('[data-test=paso-motivo]').exists()).toBe(true)
  await avanzar(w)
  expect(w.get('[data-test=registro-error]').text()).toBe('Elige el motivo')
})

test('los campos de texto respetan los límites del servidor', async () => {
  const base = porteria.get.getMockImplementation()
  porteria.get.mockImplementation(async (url, ...resto) => {
    if (url.startsWith('/estado/placa/')) {
      return { data: { placa: 'XYZ987', tipo_vehiculo: null, vehiculo: null, vehiculo_externo: null, estado: null, sentido_sugerido: 'INGRESO', propuesta: null } }
    }
    return base(url, ...resto)
  })
  const { w } = await montar()
  expect(w.get('[data-test=registro-placa]').attributes('maxlength')).toBe('20')
  await w.get('[data-test=registro-placa]').setValue('xyz987')
  await w.get('[data-test=registro-consultar]').trigger('click')
  await flushPromises()
  await avanzar(w)
  await w.get('[data-test=registro-tipo-PROVEEDOR]').trigger('click')
  await avanzar(w)
  expect(w.get('[data-test=registro-empresa]').attributes('maxlength')).toBe('150')
  expect(w.get('[data-test=registro-conductor-nombre]').attributes('maxlength')).toBe('150')
  expect(w.get('[data-test=registro-conductor-documento]').attributes('maxlength')).toBe('30')
})
