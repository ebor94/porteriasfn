import axios from 'axios'

export const CLAVE_TOKEN = 'por_token'

export const tokenStorage = {
  leer() {
    try { return localStorage.getItem(CLAVE_TOKEN) } catch { return null }
  },
  guardar(token) {
    try {
      if (token) localStorage.setItem(CLAVE_TOKEN, token)
      else localStorage.removeItem(CLAVE_TOKEN)
    } catch { /* almacenamiento no disponible */ }
  }
}

const SIN_RESPUESTA = [502, 503, 504]

// Contrato de error del backend → objeto plano para la UI.
export function normalizarError(error) {
  const r = error && error.response
  if (!r) return { status: 0, codigo: null, motivo: 'SIN_CONEXION', message: 'Sin conexión con el servidor', errors: [] }
  const d = r.data
  const cuerpo = d !== null && typeof d === 'object' ? d : null
  // Un proxy caído o una página HTML de error no traen el contrato: se trata como servidor que no responde.
  if (!cuerpo || (!cuerpo.motivo && SIN_RESPUESTA.includes(r.status))) {
    return { status: r.status, codigo: null, motivo: 'SIN_CONEXION', message: 'El servidor no responde. Intenta de nuevo.', errors: [] }
  }
  return {
    status: r.status,
    codigo: cuerpo.error || null,
    motivo: cuerpo.motivo || 'ERROR',
    message: cuerpo.message || 'Ocurrió un error',
    errors: cuerpo.errors || []
  }
}

let alExpirar = null
export function alSesionExpirada(fn) {
  alExpirar = fn
}
// Avisa si el servicio está disponible (true) o Portería está deshabilitada en el servidor (false).
let alDisponibilidad = null
export function alCambiarDisponibilidad(fn) {
  alDisponibilidad = fn
}

// Un 401 del login significa credenciales malas, no sesión vencida.
const esLogin = (url = '') => /^\/?auth\/login/.test(url)

function avisarSiExpiro(e, err) {
  if (err.status !== 401 || !alExpirar || esLogin(e?.config?.url)) return
  const actual = tokenStorage.leer()
  const usado = e?.config?.headers?.Authorization
  // Solo si el 401 es de la sesión vigente: un 401 tardío de un token ya reemplazado no cierra la sesión nueva.
  if (actual && usado === `Bearer ${actual}`) alExpirar(err)
}

// Las descargas piden `responseType: 'blob'`: un error llega como Blob y hay que leer su JSON.
async function leerErrorBlob(e) {
  const r = e && e.response
  if (!r || typeof Blob === 'undefined' || !(r.data instanceof Blob)) return
  try {
    const texto = typeof r.data.text === 'function'
      ? await r.data.text()
      : await new Promise((ok, mal) => {
        const lector = new FileReader()
        lector.onload = () => ok(lector.result)
        lector.onerror = mal
        lector.readAsText(r.data)
      })
    r.data = JSON.parse(texto)
  } catch {
    r.data = null
  }
}

function crearCliente(baseURL) {
  const cliente = axios.create({ baseURL, timeout: 20000 })
  cliente.interceptors.request.use((config) => {
    const token = tokenStorage.leer()
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  })
  cliente.interceptors.response.use(
    (r) => {
      if (alDisponibilidad) alDisponibilidad(true)
      return r.data
    },
    async (e) => {
      await leerErrorBlob(e)
      const err = normalizarError(e)
      if (err.status === 503 && err.motivo === 'PORTERIA_DESHABILITADO' && alDisponibilidad) alDisponibilidad(false)
      avisarSiExpiro(e, err)
      return Promise.reject(err)
    }
  )
  return cliente
}

const BASE = import.meta.env.VITE_API_URL || '/api'
export const porteria = crearCliente(`${BASE}/porteria/v1`)
