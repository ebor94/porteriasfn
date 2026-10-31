import { defineStore } from 'pinia'
import { porteria } from '@/services/api'
import { guardarArchivo, nombreReporte } from '@/services/archivos'
import { hoyLocal } from '@/utils/fechas'
import { normalizarPlaca } from '@/utils/placa'

const filtrosIniciales = () => ({ sede: 'todas', desde: hoyLocal(), hasta: hoyLocal(), placa: '', tipo: '', motivoId: '', inconsistente: '' })
// Un Excel de muchas filas tarda más que una consulta normal.
const TIEMPO_EXCEL = 120000

// Generación de la consulta: cada buscar (y reiniciar) la incrementa; las respuestas de generaciones
// anteriores se descartan.
let generacion = 0

export function paramsDe(f) {
  const p = { sede_id: f.sede === 'todas' ? 'todas' : String(f.sede) }
  if (f.desde) p.desde = f.desde
  if (f.hasta) p.hasta = f.hasta
  const placa = normalizarPlaca(f.placa || '')
  if (placa) p.placa = placa
  if (f.tipo) p.tipo_vehiculo = f.tipo
  if (f.motivoId) p.motivo_id = String(f.motivoId)
  if (f.inconsistente !== '') p.inconsistente = f.inconsistente
  return p
}

function validar(f) {
  if (f.desde && f.hasta && f.desde > f.hasta) throw { message: 'La fecha inicial es posterior a la final' }
}

// Consulta del admin: los filtros que se ven, y los ya aplicados para paginar sin mezclar.
export const useConsultaStore = defineStore('consulta', {
  state: () => ({ filtros: filtrosIniciales(), aplicados: null, items: [], total: 0, pagina: 0, sinMas: false }),
  actions: {
    async buscar() {
      validar(this.filtros)
      const params = paramsDe(this.filtros)
      const mia = ++generacion
      const { data } = await porteria.get('/eventos', { params })
      if (mia !== generacion) return
      this.aplicados = params
      this.items = data.items
      this.total = data.total
      this.pagina = data.pagina
      this.sinMas = false
    },
    async cargarMas() {
      const mia = generacion
      let data
      try {
        ({ data } = await porteria.get('/eventos', { params: { ...this.aplicados, pagina: this.pagina + 1 } }))
      } catch (e) {
        // El error de una página de filtros anteriores ya no le importa a nadie.
        if (mia !== generacion) return
        throw e
      }
      // Si hubo otra búsqueda mientras tanto, esta página es de filtros anteriores.
      if (mia !== generacion) return
      const vistos = new Set(this.items.map((e) => e.id))
      const nuevos = data.items.filter((e) => !vistos.has(e.id))
      this.items.push(...nuevos)
      this.sinMas = !nuevos.length
      this.total = data.total
      this.pagina = data.pagina
    },
    // Con una búsqueda aplicada, el Excel es de lo que se ve en la lista; si no, de los filtros visibles.
    async descargarExcel() {
      let params
      if (this.aplicados) {
        params = { ...this.aplicados }
      } else {
        validar(this.filtros)
        params = paramsDe(this.filtros)
      }
      const blob = await porteria.get('/admin/reportes/movimientos.xlsx', { params, responseType: 'blob', timeout: TIEMPO_EXCEL })
      guardarArchivo(blob, nombreReporte(params))
    },
    async corregir(id, cambios) {
      const { data } = await porteria.patch(`/eventos/${id}`, cambios)
      this.reemplazar(data)
      return data
    },
    async anular(id, motivo) {
      const { data } = await porteria.post(`/eventos/${id}/anular`, { motivo })
      this.reemplazar(data)
      return data
    },
    async recargar(id) {
      const { data } = await porteria.get(`/eventos/${id}`)
      this.reemplazar(data)
      return data
    },
    reemplazar(evento) {
      const i = this.items.findIndex((e) => e.id === evento.id)
      if (i >= 0) this.items.splice(i, 1, evento)
    },
    // Al cerrar sesión: además de vaciar, invalida las respuestas en vuelo.
    reiniciar() {
      generacion++
      this.$reset()
    }
  }
})
