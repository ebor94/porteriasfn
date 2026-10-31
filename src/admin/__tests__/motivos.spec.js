import { test, expect } from 'vitest'
import { formularioMotivo, validarMotivo, datosMotivo } from '@/admin/motivos'

const guardado = {
  id: 3, codigo: 'LAVADO', nombre: 'Lavado', descripcion: null, aplica_propio: true, aplica_proveedor_asistencia: false,
  aplica_proveedor: false, aplica_ingreso: true, aplica_salida: true, tipo_referencia: 'NINGUNA', referencia_obligatoria: false,
  orden: 70, activo: true, en_uso: true
}

test('formulario vacío y desde un motivo', () => {
  expect(formularioMotivo(null)).toEqual({
    codigo: '', nombre: '', descripcion: '', aplica_propio: false, aplica_proveedor_asistencia: false, aplica_proveedor: false,
    aplica_ingreso: true, aplica_salida: true, tipo_referencia: 'NINGUNA', referencia_obligatoria: false, orden: '0', activo: true
  })
  expect(formularioMotivo(guardado)).toMatchObject({ codigo: 'LAVADO', nombre: 'Lavado', descripcion: '', orden: '70', aplica_propio: true })
})

test.each([
  [{ codigo: 'x' }, 'Código inválido (letras, números y _; de 2 a 40)'],
  [{ nombre: ' ' }, 'Indica el nombre'],
  [{ aplica_propio: false }, 'Marca al menos un tipo de vehículo'],
  [{ aplica_ingreso: false, aplica_salida: false }, 'Marca al menos un sentido'],
  [{ referencia_obligatoria: true }, 'Un motivo sin referencia no puede exigirla'],
  [{ orden: '1.5' }, 'Orden inválido'],
  [{ orden: '10000' }, 'Orden inválido'],
  [{ nombre: 'n'.repeat(101) }, 'El nombre es demasiado largo'],
  [{ nombre: ` ${'n'.repeat(100)} `, descripcion: 'd'.repeat(256) }, 'La descripción es demasiado larga']
])('nuevo con %j → %s', (cambio, mensaje) => {
  const f = { ...formularioMotivo(null), codigo: 'NUEVO_1', nombre: 'Nuevo', aplica_propio: true, ...cambio }
  expect(validarMotivo(f, true)).toBe(mensaje)
})

test('un formulario válido no tiene errores; en edición el código no se valida', () => {
  expect(validarMotivo({ ...formularioMotivo(null), codigo: 'nuevo_1', nombre: 'Nuevo', aplica_proveedor: true }, true)).toBeNull()
  expect(validarMotivo({ ...formularioMotivo(guardado), codigo: '' }, false)).toBeNull()
})

test('datos de un motivo nuevo: código en mayúsculas, textos recortados y orden numérico', () => {
  const f = { ...formularioMotivo(null), codigo: ' nuevo_1 ', nombre: ' Nuevo ', descripcion: ' ', aplica_proveedor: true, orden: '15' }
  expect(datosMotivo(f, null)).toEqual({
    codigo: 'NUEVO_1', nombre: 'Nuevo', descripcion: null, aplica_propio: false, aplica_proveedor_asistencia: false, aplica_proveedor: true,
    aplica_ingreso: true, aplica_salida: true, tipo_referencia: 'NINGUNA', referencia_obligatoria: false, orden: 15, activo: true
  })
})

test('en edición solo viaja lo que cambió (nunca el código)', () => {
  const f = { ...formularioMotivo(guardado), nombre: 'Lavado general', orden: '75' }
  expect(datosMotivo(f, guardado)).toEqual({ nombre: 'Lavado general', orden: 75 })
  expect(datosMotivo(formularioMotivo(guardado), guardado)).toBeNull()
})
