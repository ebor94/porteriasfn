// Flujo completo del asistente con la API simulada.
import { test, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory, RouterView } from 'vue-router'
import { h } from 'vue'

vi.mock('@/services/api', () => ({
  porteria: { get: vi.fn(), post: vi.fn() },
  tokenStorage: { leer: () => 't', guardar: () => {} }
}))
const toastExito = vi.hoisted(() => vi.fn())
vi.mock('vue-toastification', () => ({ useToast: () => ({ success: toastExito, error: vi.fn() }) }))

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

// Se monta dentro de RouterView para que onBeforeRouteLeave tenga la ruta activa.
async function montar(ruta = '/registrar') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/registrar/:sentido?', component: RegistroView }, { path: '/inicio', component: { template: '<div />' } }]
  })
  router.push('/inicio')
  await router.push(ruta)
  await router.isReady()
  const w = mount({ render: () => h(RouterView) }, { global: { plugins: [router], stubs: { MarcoGuarda: { template: '<div><slot /></div>' } } } })
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
  porteria.get.mockReset()
  porteria.post.mockReset()
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
  porteria.post.mockResolvedValueOnce({ data: { id: 1, sentido: 'SALIDA', placa: 'ABC123' } })
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
  expect(w.get('[data-test=registro-error]').attributes('role')).toBe('alert')
  expect(w.find('[data-test=paso-placa]').exists()).toBe(true)
})

test('otros errores del servidor se muestran sin diálogo', async () => {
  porteria.post.mockRejectedValueOnce({ status: 409, motivo: 'OCUPADO', message: 'Otro registro de esta placa está en curso. Intenta de nuevo.', errors: [] })
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
  expect(w.get('[data-test=registro-tipo-PROVEEDOR]').attributes('aria-pressed')).toBe('false')
  await w.get('[data-test=registro-tipo-PROVEEDOR]').trigger('click')
  expect(w.get('[data-test=registro-tipo-PROVEEDOR]').attributes('aria-pressed')).toBe('true')
  await avanzar(w)
  expect(w.get('[data-test=registro-empresa]').attributes('maxlength')).toBe('150')
  expect(w.get('[data-test=registro-conductor-nombre]').attributes('maxlength')).toBe('150')
  expect(w.get('[data-test=registro-conductor-documento]').attributes('maxlength')).toBe('30')
})

function diferido() {
  const d = {}
  d.promesa = new Promise((resolve, reject) => { d.resolve = resolve; d.reject = reject })
  return d
}

async function consultar(w, placa = 'abc123') {
  await w.get('[data-test=registro-placa]').setValue(placa)
  await w.get('[data-test=registro-consultar]').trigger('click')
  await flushPromises()
}

async function hastaMotivo(w) {
  await avanzar(w)
  await vi.advanceTimersByTimeAsync(300)
  await flushPromises()
  await w.get('[data-test=buscable-item]').trigger('click')
  await avanzar(w)
  expect(w.find('[data-test=paso-motivo]').exists()).toBe(true)
}

test('la respuesta de motivos de un sentido viejo no pisa la nueva', async () => {
  const base = porteria.get.getMockImplementation()
  const porSentido = { SALIDA: diferido(), INGRESO: diferido() }
  porteria.get.mockImplementation(async (url, cfg) => (url === '/catalogos/motivos' ? porSentido[cfg.params.sentido].promesa : base(url, cfg)))
  const { w } = await montar()
  await consultar(w)
  await w.get('[data-test=registro-sentido-INGRESO]').trigger('click')
  await flushPromises()
  porSentido.INGRESO.resolve({ data: [{ id: 7, nombre: 'Visita', tipo_referencia: 'NINGUNA', referencia_obligatoria: false }] })
  await flushPromises()
  porSentido.SALIDA.resolve({ data: MOTIVOS })
  await flushPromises()
  await hastaMotivo(w)
  expect(w.find('[data-test=registro-motivo-7]').exists()).toBe(true)
  expect(w.find('[data-test=registro-motivo-6]').exists()).toBe(false)
})

test('si falla la carga de motivos se muestra el error y "Reintentar" recarga', async () => {
  const base = porteria.get.getMockImplementation()
  let llamadas = 0
  porteria.get.mockImplementation(async (url, cfg) => {
    if (url === '/catalogos/motivos' && ++llamadas === 1) throw new Error('No se pudo cargar los motivos')
    return base(url, cfg)
  })
  const { w } = await montar()
  await consultar(w)
  await hastaMotivo(w)
  expect(w.get('[data-test=registro-error]').text()).toBe('No se pudo cargar los motivos')
  expect(w.find('[data-test=registro-motivo-6]').exists()).toBe(false)
  await w.get('[data-test=registro-motivos-reintentar]').trigger('click')
  await flushPromises()
  expect(w.find('[data-test=registro-error]').exists()).toBe(false)
  expect(w.find('[data-test=registro-motivos-reintentar]').exists()).toBe(false)
  expect(w.find('[data-test=registro-motivo-6]').exists()).toBe(true)
})

test('editar la placa tras consultar no deja avanzar hasta consultar de nuevo', async () => {
  const { w } = await montar()
  await consultar(w)
  await w.get('[data-test=registro-placa]').setValue('abc124')
  await avanzar(w)
  expect(w.get('[data-test=registro-error]').text()).toBe('Consulta la placa')
  expect(w.find('[data-test=paso-placa]').exists()).toBe(true)
})

test('la respuesta de una consulta de placa vieja se descarta', async () => {
  const base = porteria.get.getMockImplementation()
  const porPlaca = { ABC123: diferido(), XYZ987: diferido() }
  porteria.get.mockImplementation(async (url, cfg) => {
    const placa = url.startsWith('/estado/placa/') ? url.split('/').pop() : null
    return placa ? porPlaca[placa].promesa : base(url, cfg)
  })
  const { w } = await montar()
  await consultar(w, 'abc123')
  await consultar(w, 'xyz987')
  porPlaca.XYZ987.resolve({ data: { ...SUGERENCIA, placa: 'XYZ987', vehiculo: { id: 10, placa: 'XYZ987' } } })
  await flushPromises()
  porPlaca.ABC123.resolve({ data: SUGERENCIA })
  await flushPromises()
  expect(w.get('[data-test=registro-placa]').element.value).toBe('XYZ987')
  expect(w.get('.tarjeta').text()).toContain('XYZ987')
})

test('sin conexión al registrar avisa que se revisen los movimientos', async () => {
  porteria.post.mockRejectedValueOnce({ motivo: 'SIN_CONEXION', message: 'Sin red' })
  const { w } = await montar()
  await llenarHastaConfirmar(w)
  await avanzar(w)
  expect(w.get('[data-test=registro-error]').text()).toBe('Sin conexión: no se pudo confirmar el registro. Revisa los movimientos antes de reintentar.')
})

test('el toast concuerda con el sentido y Atrás se deshabilita mientras se envía', async () => {
  const envio = diferido()
  porteria.post.mockReturnValue(envio.promesa)
  const { w } = await montar()
  await llenarHastaConfirmar(w)
  await avanzar(w)
  expect(w.get('[data-test=registro-atras]').attributes('disabled')).toBeDefined()
  envio.resolve({ data: { id: 1, sentido: 'SALIDA', placa: 'ABC123' } })
  await flushPromises()
  expect(toastExito).toHaveBeenCalledWith('Salida de ABC123 registrada')
})

test('la referencia solo aparece al confirmar si el motivo la pide', async () => {
  const { w } = await montar()
  await llenarHastaConfirmar(w)
  expect(w.get('[data-test=paso-confirmar]').text()).not.toContain('Referencia')
})

const sentidoActivo = (w) => ['INGRESO', 'SALIDA'].find((s) => w.get(`[data-test=registro-sentido-${s}]`).attributes('aria-pressed') === 'true')

function conSugerencias(porPlaca) {
  const base = porteria.get.getMockImplementation()
  porteria.get.mockImplementation(async (url, cfg) => {
    const placa = url.startsWith('/estado/placa/') ? url.split('/').pop() : null
    return placa ? { data: porPlaca[placa] } : base(url, cfg)
  })
}

test('el sentido sugerido de una placa no se arrastra a la siguiente', async () => {
  conSugerencias({
    ABC123: SUGERENCIA,
    XYZ987: { ...SUGERENCIA, placa: 'XYZ987', sentido_sugerido: 'INGRESO', propuesta: { motivo: { id: 6 } } }
  })
  const { w } = await montar()
  await consultar(w, 'abc123')
  expect(sentidoActivo(w)).toBe('SALIDA')
  await consultar(w, 'xyz987')
  expect(sentidoActivo(w)).toBe('INGRESO')
  await avanzar(w)
  await vi.advanceTimersByTimeAsync(300)
  await flushPromises()
  await w.get('[data-test=buscable-item]').trigger('click')
  await avanzar(w)
  expect(w.get('[data-test=registro-motivo-6]').attributes('aria-pressed')).toBe('true')
})

test('el sentido que tocó el guarda o vino en la ruta se conserva al cambiar de placa', async () => {
  conSugerencias({ ABC123: SUGERENCIA, XYZ987: { ...SUGERENCIA, placa: 'XYZ987', sentido_sugerido: 'INGRESO' } })
  const tocado = await montar()
  await consultar(tocado.w, 'xyz987')
  await tocado.w.get('[data-test=registro-sentido-SALIDA]').trigger('click')
  await consultar(tocado.w, 'abc123')
  expect(sentidoActivo(tocado.w)).toBe('SALIDA')
  await consultar(tocado.w, 'xyz987')
  expect(sentidoActivo(tocado.w)).toBe('SALIDA')

  const deRuta = await montar('/registrar/INGRESO')
  await consultar(deRuta.w, 'abc123')
  expect(sentidoActivo(deRuta.w)).toBe('INGRESO')
})

test('si el motivo cargó vacío avisa que no hay motivos', async () => {
  const base = porteria.get.getMockImplementation()
  porteria.get.mockImplementation(async (url, cfg) => (url === '/catalogos/motivos' ? { data: [] } : base(url, cfg)))
  const { w } = await montar()
  await consultar(w)
  await hastaMotivo(w)
  expect(w.get('[data-test=registro-sin-motivos]').text()).toBe('No hay motivos para este vehículo y sentido. Avisa al administrador.')
})

test('el atrás del sistema retrocede un paso del asistente en vez de salir', async () => {
  const { w, router } = await montar()
  await consultar(w)
  await avanzar(w)
  expect(w.find('[data-test=paso-conductor]').exists()).toBe(true)
  await router.push('/inicio').catch(() => {})
  await flushPromises()
  expect(router.currentRoute.value.path).toBe('/registrar')
  expect(w.find('[data-test=paso-placa]').exists()).toBe(true)
})

test('en el primer paso con placa escrita pide confirmar la salida', async () => {
  const confirmar = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
  const { w, router } = await montar()
  await w.get('[data-test=registro-placa]').setValue('abc123')
  await router.push('/inicio')
  await flushPromises()
  expect(confirmar).toHaveBeenCalledWith('¿Salir sin registrar?')
  expect(router.currentRoute.value.path).toBe('/registrar')
  await router.push('/inicio')
  await flushPromises()
  expect(router.currentRoute.value.path).toBe('/inicio')
  confirmar.mockRestore()
})

test('sin placa escrita sale sin preguntar y tras registrar no se bloquea la ida al inicio', async () => {
  const confirmar = vi.spyOn(window, 'confirm')
  const vacio = await montar()
  await vacio.router.push('/inicio')
  await flushPromises()
  expect(vacio.router.currentRoute.value.path).toBe('/inicio')
  expect(confirmar).not.toHaveBeenCalled()

  porteria.post.mockResolvedValueOnce({ data: { id: 1, sentido: 'SALIDA', placa: 'ABC123' } })
  const { w, router } = await montar()
  await llenarHastaConfirmar(w)
  await avanzar(w)
  expect(router.currentRoute.value.path).toBe('/inicio')
  expect(confirmar).not.toHaveBeenCalled()
  confirmar.mockRestore()
})
