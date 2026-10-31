// Solo rutas internas de la app: empiezan por '/' y no por '//' ni '/\' (que el navegador toma como otro sitio).
export function rutaInterna(valor, porDefecto = null) {
  return typeof valor === 'string' && /^\/(?![/\\])/.test(valor) ? valor : porDefecto
}

// En un popstate el navegador ya cambió history.state antes de los guards; en un push/RouterLink todavía no.
export function esNavegacionDeHistorial(to) {
  return window.history.state?.current === to.fullPath
}
