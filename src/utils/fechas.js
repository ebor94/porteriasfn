const dos = (n) => String(n).padStart(2, '0')

/** Fecha local del dispositivo como 'AAAA-MM-DD' (para filtrar "hoy" en el servidor, que está en la misma zona). */
export function hoyLocal(fecha = new Date()) {
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`
}

export function horaCorta(valor) {
  if (!valor) return ''
  const f = new Date(valor)
  return `${dos(f.getHours())}:${dos(f.getMinutes())}`
}

export function haceCuanto(valor, ahora = new Date()) {
  if (!valor) return ''
  const minutos = Math.max(0, Math.floor((ahora - new Date(valor)) / 60000))
  if (minutos < 60) return `hace ${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `hace ${horas} h ${minutos % 60} min`
  const dias = Math.floor(horas / 24)
  return `hace ${dias} ${dias === 1 ? 'día' : 'días'}`
}
