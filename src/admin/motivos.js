// Formulario de motivos del admin, sin Vue. Repite las reglas del servidor para avisar antes de enviar.
export const TIPOS = [
  { campo: 'aplica_propio', texto: 'Propio' },
  { campo: 'aplica_proveedor_asistencia', texto: 'Proveedor de asistencias' },
  { campo: 'aplica_proveedor', texto: 'Proveedor' }
]
export const SENTIDOS = [{ campo: 'aplica_ingreso', texto: 'Ingreso' }, { campo: 'aplica_salida', texto: 'Salida' }]
export const REFERENCIAS = [
  { valor: 'NINGUNA', texto: 'Ninguna' },
  { valor: 'ASISTENCIA', texto: 'Asistencia' },
  { valor: 'EXEQUIA', texto: 'Exequia' },
  { valor: 'TEXTO', texto: 'Texto libre' }
]
const BOOLEANOS = [...TIPOS.map((t) => t.campo), ...SENTIDOS.map((s) => s.campo), 'referencia_obligatoria', 'activo']
const CODIGO = /^[A-Z0-9_]{2,40}$/

export function formularioMotivo(m) {
  if (!m) {
    return {
      codigo: '', nombre: '', descripcion: '', aplica_propio: false, aplica_proveedor_asistencia: false, aplica_proveedor: false,
      aplica_ingreso: true, aplica_salida: true, tipo_referencia: 'NINGUNA', referencia_obligatoria: false, orden: '0', activo: true
    }
  }
  return {
    codigo: m.codigo,
    nombre: m.nombre,
    descripcion: m.descripcion || '',
    ...Object.fromEntries(BOOLEANOS.map((c) => [c, Boolean(m[c])])),
    tipo_referencia: m.tipo_referencia,
    orden: String(m.orden)
  }
}

export function validarMotivo(f, nuevo) {
  if (nuevo && !CODIGO.test(f.codigo.trim().toUpperCase())) return 'Código inválido (letras, números y _; de 2 a 40)'
  if (!f.nombre.trim()) return 'Indica el nombre'
  if (!TIPOS.some((t) => f[t.campo])) return 'Marca al menos un tipo de vehículo'
  if (!SENTIDOS.some((s) => f[s.campo])) return 'Marca al menos un sentido'
  if (f.referencia_obligatoria && f.tipo_referencia === 'NINGUNA') return 'Un motivo sin referencia no puede exigirla'
  if (!/^\d{1,4}$/.test(String(f.orden).trim())) return 'Orden inválido'
  return null
}

function cuerpo(f) {
  const datos = {
    nombre: f.nombre.trim(),
    descripcion: f.descripcion.trim() || null,
    tipo_referencia: f.tipo_referencia,
    orden: Number(String(f.orden).trim())
  }
  for (const c of BOOLEANOS) datos[c] = Boolean(f[c])
  return datos
}

export function datosMotivo(f, original) {
  const datos = cuerpo(f)
  if (!original) return { codigo: f.codigo.trim().toUpperCase(), ...datos }
  const cambios = Object.fromEntries(Object.entries(datos).filter(([c, v]) => v !== (original[c] ?? null)))
  return Object.keys(cambios).length ? cambios : null
}
