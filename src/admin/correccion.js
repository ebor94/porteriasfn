// Corrección completa de un evento por el admin, sin Vue. El servidor vuelve a validar todo; esto evita
// enviar cuerpos que sabe que va a rechazar y arma el conductor y la referencia como los espera.
const texto = (v) => {
  const t = String(v ?? '').trim()
  return t === '' ? null : t
}
const etiquetaReferencia = (r) => (r ? [r.codigo, r.nombre_ser_querido].filter(Boolean).join(' · ') : '')

export function formularioCorreccion(e) {
  const propio = e.tipo_vehiculo === 'PROPIO'
  return {
    motivoId: e.motivo_id,
    referencia: { asistenciaId: e.asistencia_id ?? null, exequiaId: e.exequia_id ?? null, texto: e.referencia_texto || '', etiqueta: etiquetaReferencia(e.referencia) },
    conductor: {
      modo: propio ? (e.conductor_otro ? 'otro' : 'ad') : 'proveedor',
      usuario: propio && !e.conductor_otro ? e.conductor_usuario : null,
      nombre: e.conductor_nombre || '',
      documento: e.conductor_documento || ''
    },
    empresa: e.empresa || '',
    kilometraje: e.kilometraje === null || e.kilometraje === undefined ? '' : String(e.kilometraje),
    observaciones: e.observaciones || ''
  }
}

function conductorDe(f, e) {
  const c = f.conductor
  if (e.tipo_vehiculo !== 'PROPIO') {
    return { conductor_otro: false, conductor_usuario: null, conductor_nombre: texto(c.nombre), conductor_documento: texto(c.documento), empresa: texto(f.empresa) }
  }
  if (c.modo === 'otro') {
    return { conductor_otro: true, conductor_usuario: null, conductor_nombre: texto(c.nombre), conductor_documento: texto(c.documento), empresa: null }
  }
  return { conductor_otro: false, conductor_usuario: c.usuario, conductor_nombre: texto(c.nombre), conductor_documento: null, empresa: null }
}

const conductorActual = (e) => ({
  conductor_otro: Boolean(e.conductor_otro),
  conductor_usuario: e.conductor_usuario ?? null,
  conductor_nombre: e.conductor_nombre ?? null,
  conductor_documento: e.conductor_documento ?? null,
  empresa: e.empresa ?? null
})

export function validarCorreccion(f, e, motivo) {
  if (!f.motivoId || !motivo) return 'Elige el motivo'
  const r = f.referencia
  if (motivo.referencia_obligatoria) {
    if (motivo.tipo_referencia === 'ASISTENCIA' && !r.asistenciaId) return 'Selecciona la asistencia'
    if (motivo.tipo_referencia === 'EXEQUIA' && !r.exequiaId) return 'Selecciona la exequia'
    if (motivo.tipo_referencia === 'TEXTO' && !texto(r.texto)) return 'Escribe la referencia'
  }
  const c = f.conductor
  if (e.tipo_vehiculo !== 'PROPIO') {
    if (!texto(f.empresa) || !texto(c.nombre) || !texto(c.documento)) return 'Escribe la empresa, el nombre y el documento del conductor'
  } else if (c.modo === 'otro') {
    if (!texto(c.nombre)) return 'Escribe el nombre del conductor'
  } else if (!c.usuario) {
    return 'Selecciona el conductor'
  }
  if (f.kilometraje.trim() !== '' && !(/^\d{1,7}$/.test(f.kilometraje.trim()) && Number(f.kilometraje) <= 5000000)) return 'Kilometraje inválido'
  if (e.inconsistente && !texto(f.observaciones)) return 'El registro forzado necesita una observación'
  return null
}

export function cambiosCorreccion(f, e, motivo) {
  const cambios = {}
  const r = f.referencia
  const tipoRef = motivo ? motivo.tipo_referencia : 'NINGUNA'
  const referencia = {
    motivo_id: f.motivoId,
    asistencia_id: tipoRef === 'ASISTENCIA' ? r.asistenciaId : null,
    exequia_id: tipoRef === 'EXEQUIA' ? r.exequiaId : null,
    referencia_texto: tipoRef === 'TEXTO' ? texto(r.texto) : null
  }
  const refActual = {
    motivo_id: e.motivo_id,
    asistencia_id: tipoRef === 'ASISTENCIA' ? e.asistencia_id ?? null : null,
    exequia_id: tipoRef === 'EXEQUIA' ? e.exequia_id ?? null : null,
    referencia_texto: tipoRef === 'TEXTO' ? e.referencia_texto ?? null : null
  }
  if (JSON.stringify(referencia) !== JSON.stringify(refActual)) Object.assign(cambios, referencia)

  const conductor = conductorDe(f, e)
  if (JSON.stringify(conductor) !== JSON.stringify(conductorActual(e))) Object.assign(cambios, conductor)

  if (e.tipo_vehiculo === 'PROPIO') {
    const km = f.kilometraje.trim() === '' ? null : Number(f.kilometraje)
    if (km !== (e.kilometraje ?? null)) cambios.kilometraje = km
  }
  const obs = texto(f.observaciones)
  if (obs !== (e.observaciones ?? null)) cambios.observaciones = obs
  return Object.keys(cambios).length ? cambios : null
}
