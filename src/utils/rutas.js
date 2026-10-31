// Solo rutas internas de la app: empiezan por '/' y no por '//' ni '/\' (que el navegador toma como otro sitio).
export function rutaInterna(valor, porDefecto = null) {
  return typeof valor === 'string' && /^\/(?![/\\])/.test(valor) ? valor : porDefecto
}
