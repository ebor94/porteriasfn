import { test, expect } from 'vitest'
import { formularioCorreccion, validarCorreccion, cambiosCorreccion } from '@/admin/correccion'

const NINGUNA = { id: 6, tipo_referencia: 'NINGUNA', referencia_obligatoria: false }
const TEXTO = { id: 3, tipo_referencia: 'TEXTO', referencia_obligatoria: true }
const ASIST = { id: 1, tipo_referencia: 'ASISTENCIA', referencia_obligatoria: true }

const propio = {
  id: 10, tipo_vehiculo: 'PROPIO', sentido: 'SALIDA', placa: 'ABC123', motivo_id: 6, asistencia_id: null, exequia_id: null,
  referencia_texto: null, referencia: null, conductor_usuario: 'jperez', conductor_nombre: 'Juan Pérez', conductor_documento: null,
  conductor_otro: false, empresa: null, kilometraje: 1200, observaciones: null, inconsistente: false
}
const proveedor = {
  ...propio, id: 11, tipo_vehiculo: 'PROVEEDOR', motivo_id: 3, referencia_texto: 'Factura 1', conductor_usuario: null,
  conductor_nombre: 'Luis', conductor_documento: '1090', empresa: 'Flores', kilometraje: null
}

test('el formulario parte del evento', () => {
  expect(formularioCorreccion(propio)).toEqual({
    motivoId: 6, referencia: { asistenciaId: null, exequiaId: null, texto: '', etiqueta: '' },
    conductor: { modo: 'ad', usuario: 'jperez', nombre: 'Juan Pérez', documento: '' }, empresa: '', kilometraje: '1200', observaciones: ''
  })
  expect(formularioCorreccion(proveedor).conductor).toEqual({ modo: 'proveedor', usuario: null, nombre: 'Luis', documento: '1090' })
})

test('sin cambios no hay cuerpo', () => {
  expect(cambiosCorreccion(formularioCorreccion(propio), propio, NINGUNA)).toBeNull()
  expect(cambiosCorreccion(formularioCorreccion(proveedor), proveedor, TEXTO)).toBeNull()
})

test('kilometraje y observaciones viajan solos', () => {
  const f = { ...formularioCorreccion(propio), kilometraje: '', observaciones: ' Revisado ' }
  expect(cambiosCorreccion(f, propio, NINGUNA)).toEqual({ kilometraje: null, observaciones: 'Revisado' })
})

test('cambiar el motivo envía la referencia completa del nuevo motivo', () => {
  const f = { ...formularioCorreccion(propio), motivoId: 1, referencia: { asistenciaId: 77, exequiaId: null, texto: 'x', etiqueta: 'A-77' } }
  expect(cambiosCorreccion(f, propio, ASIST)).toEqual({ motivo_id: 1, asistencia_id: 77, exequia_id: null, referencia_texto: null })
})

test('cambiar el conductor envía el conductor completo', () => {
  const otro = { ...formularioCorreccion(propio), conductor: { modo: 'otro', usuario: null, nombre: 'Pedro', documento: '' } }
  expect(cambiosCorreccion(otro, propio, NINGUNA)).toEqual({
    conductor_otro: true, conductor_usuario: null, conductor_nombre: 'Pedro', conductor_documento: null, empresa: null
  })
  const empresa = { ...formularioCorreccion(proveedor), empresa: 'Flores SAS' }
  expect(cambiosCorreccion(empresa, proveedor, TEXTO)).toEqual({
    conductor_otro: false, conductor_usuario: null, conductor_nombre: 'Luis', conductor_documento: '1090', empresa: 'Flores SAS'
  })
})

test.each([
  [{ motivoId: null }, NINGUNA, 'Elige el motivo'],
  [{ motivoId: 1 }, ASIST, 'Selecciona la asistencia'],
  [{ conductor: { modo: 'ad', usuario: null, nombre: '', documento: '' } }, NINGUNA, 'Selecciona el conductor'],
  [{ conductor: { modo: 'otro', usuario: null, nombre: ' ', documento: '' } }, NINGUNA, 'Escribe el nombre del conductor'],
  [{ kilometraje: '12a' }, NINGUNA, 'Kilometraje inválido']
])('propio con %j → %s', (cambio, motivo, mensaje) => {
  expect(validarCorreccion({ ...formularioCorreccion(propio), ...cambio }, propio, motivo)).toBe(mensaje)
})

test('proveedor sin empresa o documento; forzado sin observación', () => {
  expect(validarCorreccion({ ...formularioCorreccion(proveedor), empresa: '' }, proveedor, TEXTO)).toBe('Escribe la empresa, el nombre y el documento del conductor')
  expect(validarCorreccion({ ...formularioCorreccion(proveedor), referencia: { asistenciaId: null, exequiaId: null, texto: '', etiqueta: '' } }, proveedor, TEXTO)).toBe('Escribe la referencia')
  const forzado = { ...propio, inconsistente: true, observaciones: 'x' }
  expect(validarCorreccion({ ...formularioCorreccion(forzado), observaciones: '' }, forzado, NINGUNA)).toBe('El registro forzado necesita una observación')
  expect(validarCorreccion(formularioCorreccion(propio), propio, NINGUNA)).toBeNull()
})
