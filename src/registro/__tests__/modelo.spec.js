// src/registro/__tests__/modelo.spec.js
import { test, expect, describe } from 'vitest'
import { estadoInicial, aplicarSugerencia, pasosPara, validarPaso, construirCuerpo, detalleInconsistencia } from '@/registro/modelo'

const NINGUNA = { id: 1, tipo_referencia: 'NINGUNA', referencia_obligatoria: false }
const ASIST = { id: 2, tipo_referencia: 'ASISTENCIA', referencia_obligatoria: true }
const EXEQ = { id: 3, tipo_referencia: 'EXEQUIA', referencia_obligatoria: true }
const TEXTO = { id: 4, tipo_referencia: 'TEXTO', referencia_obligatoria: true }

const propio = (extra = {}) => ({
  placa: 'ABC123', tipo_vehiculo: 'PROPIO', vehiculo: { id: 9 }, vehiculo_externo: null,
  estado: { dentro: false, sede_id: 1, desde: '2026-10-05T13:00:00Z', sembrado: false }, sentido_sugerido: 'INGRESO',
  propuesta: {
    motivo: { id: 2, codigo: 'SERES_QUERIDOS', nombre: 'Seres queridos' }, asistencia_id: 50, exequia_id: null, referencia_texto: null,
    referencia: { tipo: 'ASISTENCIA', codigo: 'H360-1', nombre_ser_querido: 'María' }, conductor_usuario: 'jperez', conductor_nombre: 'Juan', conductor_otro: false
  },
  ...extra
})

describe('aplicarSugerencia', () => {
  test('propio fuera: sentido sugerido y propuesta de la salida abierta', () => {
    const e = estadoInicial()
    aplicarSugerencia(e, propio())
    expect(e).toMatchObject({
      placa: 'ABC123', tipo: 'PROPIO', tipoConocido: true, sentido: 'INGRESO', motivoId: 2,
      referencia: { asistenciaId: 50, exequiaId: null, texto: '', etiqueta: 'H360-1 · María' },
      conductor: { modo: 'ad', usuario: 'jperez', nombre: 'Juan', documento: '' }
    })
  })

  test('si el guarda eligió el otro sentido, no usa la propuesta', () => {
    const e = estadoInicial('SALIDA')
    aplicarSugerencia(e, propio())
    expect(e.sentido).toBe('SALIDA')
    expect(e.motivoId).toBeNull()
  })

  test('propuesta con conductor "otro"', () => {
    const e = estadoInicial()
    aplicarSugerencia(e, propio({ propuesta: { ...propio().propuesta, conductor_usuario: null, conductor_nombre: 'Pedro', conductor_otro: true } }))
    expect(e.conductor).toEqual({ modo: 'otro', usuario: null, nombre: 'Pedro', documento: '' })
  })

  test('proveedor del catálogo dentro: empresa y conductor de su ingreso', () => {
    const e = estadoInicial()
    aplicarSugerencia(e, {
      placa: 'XYZ1', tipo_vehiculo: 'PROVEEDOR', vehiculo: null, vehiculo_externo: { id: 3, empresa: 'Flores SA' },
      estado: { dentro: true, sede_id: 1, desde: null, sembrado: false }, sentido_sugerido: 'SALIDA',
      propuesta: { motivo: { id: 7 }, empresa: 'Flores SA', conductor_nombre: 'Ana', conductor_documento: '123' }
    })
    expect(e).toMatchObject({
      tipo: 'PROVEEDOR', tipoConocido: true, sentido: 'SALIDA', empresa: 'Flores SA', motivoId: 7,
      conductor: { modo: 'ad', usuario: null, nombre: 'Ana', documento: '123' }
    })
  })

  test('placa desconocida: tipo por elegir', () => {
    const e = estadoInicial()
    aplicarSugerencia(e, { placa: 'NEW1', tipo_vehiculo: null, vehiculo: null, vehiculo_externo: null, estado: null, sentido_sugerido: 'INGRESO', propuesta: null })
    expect(e).toMatchObject({ tipo: null, tipoConocido: false, sentido: 'INGRESO', empresa: '' })
  })
})

test('pasosPara omite tipo conocido y referencia que no aplica', () => {
  const conocido = { ...estadoInicial(), tipoConocido: true }
  const nuevo = { ...estadoInicial(), tipoConocido: false }
  expect(pasosPara(conocido, NINGUNA)).toEqual(['placa', 'conductor', 'motivo', 'detalles', 'confirmar'])
  expect(pasosPara(conocido, null)).toEqual(['placa', 'conductor', 'motivo', 'detalles', 'confirmar'])
  expect(pasosPara(nuevo, ASIST)).toEqual(['placa', 'tipo', 'conductor', 'motivo', 'referencia', 'detalles', 'confirmar'])
})

describe('validarPaso', () => {
  const base = () => ({ ...estadoInicial('SALIDA'), placa: 'ABC123', sugerencia: {}, tipo: 'PROPIO', tipoConocido: true })

  test('placa', () => {
    expect(validarPaso('placa', { ...estadoInicial(), placa: ' - ' }, null)).toBe('Escribe la placa')
    expect(validarPaso('placa', { ...estadoInicial(), placa: 'ABC123' }, null)).toBe('Consulta la placa')
    expect(validarPaso('placa', { ...base(), sentido: null }, null)).toBe('Elige si es ingreso o salida')
    expect(validarPaso('placa', base(), null)).toBeNull()
  })

  test('tipo y motivo', () => {
    expect(validarPaso('tipo', { ...base(), tipo: null }, null)).toBe('Elige el tipo de vehículo')
    expect(validarPaso('motivo', base(), null)).toBe('Elige el motivo')
    expect(validarPaso('motivo', { ...base(), motivoId: 1 }, NINGUNA)).toBeNull()
  })

  test('conductor de propio y de proveedor', () => {
    expect(validarPaso('conductor', base(), null)).toBe('Elige el conductor')
    expect(validarPaso('conductor', { ...base(), conductor: { modo: 'otro', nombre: ' ', documento: '' } }, null)).toBe('Escribe el nombre del conductor')
    expect(validarPaso('conductor', { ...base(), conductor: { modo: 'ad', usuario: 'j', nombre: 'J', documento: '' } }, null)).toBeNull()
    const prov = { ...base(), tipo: 'PROVEEDOR', empresa: 'X', conductor: { modo: 'ad', usuario: null, nombre: 'Ana', documento: '' } }
    expect(validarPaso('conductor', prov, null)).toBe('Escribe la empresa, el nombre y el documento del conductor')
    expect(validarPaso('conductor', { ...prov, conductor: { ...prov.conductor, documento: '1' } }, null)).toBeNull()
  })

  test('referencia según el motivo', () => {
    expect(validarPaso('referencia', base(), ASIST)).toBe('Elige la asistencia')
    expect(validarPaso('referencia', base(), EXEQ)).toBe('Elige la exequia')
    expect(validarPaso('referencia', base(), TEXTO)).toBe('Escribe la referencia')
    expect(validarPaso('referencia', { ...base(), referencia: { ...base().referencia, asistenciaId: 5 } }, ASIST)).toBeNull()
    expect(validarPaso('referencia', base(), { ...TEXTO, referencia_obligatoria: false })).toBeNull()
  })

  test('kilometraje', () => {
    expect(validarPaso('detalles', { ...base(), kilometraje: '12a' }, null)).toBe('Kilometraje inválido')
    expect(validarPaso('detalles', { ...base(), kilometraje: '' }, null)).toBeNull()
    expect(validarPaso('detalles', { ...base(), kilometraje: '1500' }, null)).toBeNull()
  })
})

describe('construirCuerpo', () => {
  test('propio con conductor del AD, asistencia y kilometraje', () => {
    const e = { ...estadoInicial('SALIDA'), placa: 'abc-123', tipo: 'PROPIO', tipoConocido: true, motivoId: 2,
      conductor: { modo: 'ad', usuario: 'jperez', nombre: 'Juan', documento: '' },
      referencia: { asistenciaId: 50, exequiaId: null, texto: 'ignorado', etiqueta: '' }, kilometraje: '1200', observaciones: '  ' }
    expect(construirCuerpo(e, ASIST)).toEqual({
      sentido: 'SALIDA', placa: 'ABC123', motivo_id: 2, conductor_usuario: 'jperez', conductor_nombre: 'Juan', kilometraje: 1200, asistencia_id: 50
    })
  })

  test('propio con "otro", exequia, observación y forzado', () => {
    const e = { ...estadoInicial('INGRESO'), placa: 'ABC123', tipo: 'PROPIO', tipoConocido: true, motivoId: 3,
      conductor: { modo: 'otro', usuario: 'x', nombre: ' Pedro ', documento: '' },
      referencia: { asistenciaId: null, exequiaId: 8, texto: '', etiqueta: '' }, observaciones: ' Llegó sin registrar salida ' }
    expect(construirCuerpo(e, EXEQ, { forzar: true })).toEqual({
      sentido: 'INGRESO', placa: 'ABC123', motivo_id: 3, conductor_otro: true, conductor_nombre: 'Pedro', exequia_id: 8,
      observaciones: 'Llegó sin registrar salida', forzar: true
    })
  })

  test('proveedor nuevo con tipo, texto y catálogo', () => {
    const e = { ...estadoInicial('INGRESO'), placa: 'NEW1', sugerencia: { vehiculo_externo: null }, tipo: 'PROVEEDOR', tipoConocido: false, motivoId: 4,
      empresa: ' Cofres SA ', guardarEnCatalogo: true, conductor: { modo: 'ad', usuario: null, nombre: 'Ana', documento: ' 99 ' },
      referencia: { asistenciaId: null, exequiaId: null, texto: ' Repuestos ', etiqueta: '' }, kilometraje: '50' }
    expect(construirCuerpo(e, TEXTO)).toEqual({
      sentido: 'INGRESO', placa: 'NEW1', motivo_id: 4, tipo_vehiculo: 'PROVEEDOR', empresa: 'Cofres SA', conductor_nombre: 'Ana',
      conductor_documento: '99', guardar_en_catalogo: true, referencia_texto: 'Repuestos'
    })
  })
})

test('detalleInconsistencia', () => {
  const nombre = (id) => ({ 1: 'Norte', 2: 'Sur' }[id] || '')
  expect(detalleInconsistencia({ sin_historial: true, dentro: true }, nombre)).toBe('Es el primer registro de esta placa en el sistema.')
  expect(detalleInconsistencia({ otra_sede: true, dentro: true, sede_id: 2 }, nombre)).toBe('Figura dentro de la sede Sur.')
  expect(detalleInconsistencia({ dentro: true, sede_id: 1, desde: new Date(2026, 9, 5, 14, 20).toISOString() }, nombre)).toBe('Figura dentro de Norte desde las 14:20.')
  expect(detalleInconsistencia({ dentro: false, sede_id: 1, desde: null }, nombre)).toBe('Figura fuera.')
})
