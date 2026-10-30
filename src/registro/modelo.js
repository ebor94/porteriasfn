// Lógica del asistente de registro, sin dependencias de Vue: qué pasos se muestran, qué falta en cada uno y
// qué cuerpo se envía a POST /eventos. El servidor vuelve a validar todo.
import { normalizarPlaca } from '@/utils/placa'
import { horaCorta } from '@/utils/fechas'

export const PASOS = ['placa', 'tipo', 'conductor', 'motivo', 'referencia', 'detalles', 'confirmar']

export function estadoInicial(sentido = null) {
  return {
    sentido,
    placa: '',
    sugerencia: null,
    tipo: null,
    tipoConocido: false,
    conductor: { modo: 'ad', usuario: null, nombre: '', documento: '' },
    empresa: '',
    guardarEnCatalogo: false,
    motivoId: null,
    referencia: { asistenciaId: null, exequiaId: null, texto: '', etiqueta: '' },
    kilometraje: '',
    observaciones: ''
  }
}

const etiquetaReferencia = (r) => (r ? [r.codigo, r.nombre_ser_querido].filter(Boolean).join(' · ') : '')

export function aplicarSugerencia(estado, s) {
  estado.sugerencia = s
  estado.placa = s.placa
  estado.tipo = s.tipo_vehiculo
  estado.tipoConocido = Boolean(s.tipo_vehiculo)
  if (!estado.sentido) estado.sentido = s.sentido_sugerido
  if (s.vehiculo_externo) estado.empresa = s.vehiculo_externo.empresa || ''

  const p = s.propuesta
  if (!p || estado.sentido !== s.sentido_sugerido) return
  if (p.motivo) estado.motivoId = p.motivo.id
  if (s.tipo_vehiculo === 'PROPIO') {
    estado.referencia = {
      asistenciaId: p.asistencia_id ?? null,
      exequiaId: p.exequia_id ?? null,
      texto: p.referencia_texto || '',
      etiqueta: etiquetaReferencia(p.referencia)
    }
    estado.conductor = p.conductor_otro
      ? { modo: 'otro', usuario: null, nombre: p.conductor_nombre || '', documento: '' }
      : { modo: 'ad', usuario: p.conductor_usuario || null, nombre: p.conductor_nombre || '', documento: '' }
  } else {
    if (p.empresa) estado.empresa = p.empresa
    estado.conductor = { modo: 'ad', usuario: null, nombre: p.conductor_nombre || '', documento: p.conductor_documento || '' }
  }
}

const pideReferencia = (motivo) => Boolean(motivo && motivo.tipo_referencia && motivo.tipo_referencia !== 'NINGUNA')

export function pasosPara(estado, motivo) {
  return PASOS.filter((paso) => {
    if (paso === 'tipo') return !estado.tipoConocido
    if (paso === 'referencia') return pideReferencia(motivo)
    return true
  })
}

const texto = (v) => String(v ?? '').trim()
const vacio = (v) => !texto(v)

export function validarPaso(paso, estado, motivo) {
  switch (paso) {
    case 'placa':
      if (!normalizarPlaca(estado.placa)) return 'Escribe la placa'
      if (!estado.sugerencia || normalizarPlaca(estado.placa) !== estado.sugerencia.placa) return 'Consulta la placa'
      if (!estado.sentido) return 'Elige si es ingreso o salida'
      return null
    case 'tipo':
      return estado.tipo ? null : 'Elige el tipo de vehículo'
    case 'conductor': {
      const c = estado.conductor
      if (estado.tipo !== 'PROPIO') {
        return vacio(estado.empresa) || vacio(c.nombre) || vacio(c.documento)
          ? 'Escribe la empresa, el nombre y el documento del conductor' : null
      }
      if (c.modo === 'otro') return vacio(c.nombre) ? 'Escribe el nombre del conductor' : null
      return c.usuario ? null : 'Elige el conductor'
    }
    case 'motivo':
      return estado.motivoId ? null : 'Elige el motivo'
    case 'referencia': {
      if (!motivo || !motivo.referencia_obligatoria) return null
      const r = estado.referencia
      if (motivo.tipo_referencia === 'ASISTENCIA') return r.asistenciaId ? null : 'Elige la asistencia'
      if (motivo.tipo_referencia === 'EXEQUIA') return r.exequiaId ? null : 'Elige la exequia'
      if (motivo.tipo_referencia === 'TEXTO') return vacio(r.texto) ? 'Escribe la referencia' : null
      return null
    }
    case 'detalles':
      if (estado.kilometraje === '') return null
      return /^\d{1,7}$/.test(String(estado.kilometraje)) && Number(estado.kilometraje) <= 5000000 ? null : 'Kilometraje inválido'
    default:
      return null
  }
}

export function construirCuerpo(estado, motivo, { forzar = false } = {}) {
  const cuerpo = { sentido: estado.sentido, placa: normalizarPlaca(estado.placa), motivo_id: estado.motivoId }
  if (!(estado.sugerencia && estado.sugerencia.vehiculo)) cuerpo.tipo_vehiculo = estado.tipo
  const c = estado.conductor
  if (estado.tipo === 'PROPIO') {
    if (c.modo === 'otro') {
      cuerpo.conductor_otro = true
      cuerpo.conductor_nombre = texto(c.nombre)
      if (!vacio(c.documento)) cuerpo.conductor_documento = texto(c.documento)
    } else {
      // El nombre viaja por si el AD no responde en el servidor (lo acepta con la lista incompleta).
      cuerpo.conductor_usuario = c.usuario
      cuerpo.conductor_nombre = texto(c.nombre)
    }
    if (estado.kilometraje !== '') cuerpo.kilometraje = Number(estado.kilometraje)
  } else {
    cuerpo.empresa = texto(estado.empresa)
    cuerpo.conductor_nombre = texto(c.nombre)
    cuerpo.conductor_documento = texto(c.documento)
    if (estado.guardarEnCatalogo && !(estado.sugerencia && estado.sugerencia.vehiculo_externo)) cuerpo.guardar_en_catalogo = true
  }
  const r = estado.referencia
  if (motivo && motivo.tipo_referencia === 'ASISTENCIA' && r.asistenciaId) cuerpo.asistencia_id = r.asistenciaId
  if (motivo && motivo.tipo_referencia === 'EXEQUIA' && r.exequiaId) cuerpo.exequia_id = r.exequiaId
  if (motivo && motivo.tipo_referencia === 'TEXTO' && !vacio(r.texto)) cuerpo.referencia_texto = texto(r.texto)
  if (!vacio(estado.observaciones)) cuerpo.observaciones = texto(estado.observaciones)
  if (forzar) cuerpo.forzar = true
  return cuerpo
}

/** Texto bajo el mensaje del servidor en el diálogo de "registrar igual". */
export function detalleInconsistencia(e, nombreSede) {
  if (!e) return ''
  if (e.sin_historial) return 'Es el primer registro de esta placa en el sistema.'
  if (e.otra_sede) return `Figura dentro de la sede ${nombreSede(e.sede_id)}.`
  if (e.dentro) {
    const donde = e.sede_id ? ` de ${nombreSede(e.sede_id)}` : ''
    const desde = e.desde ? ` desde las ${horaCorta(e.desde)}` : ''
    return `Figura dentro${donde}${desde}.`
  }
  return 'Figura fuera.'
}
