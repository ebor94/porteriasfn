import { defineStore } from 'pinia'
import { porteria } from '@/services/api'
import { guardarArchivo, nombreReporte } from '@/services/archivos'
import { hoyLocal } from '@/utils/fechas'
import { normalizarPlaca } from '@/utils/placa'

const filtrosIniciales = () => ({ sede: 'todas', desde: hoyLocal(), hasta: hoyLocal(), placa: '', tipo: '', motivoId: '', inconsistente: '' })
// Un Excel de muchas filas tarda más que una consulta normal.
const TIEMPO_EXCEL = 120000

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
  state: () => ({ filtros: filtrosIniciales(), aplicados: null, items: [], total: 0, pagina: 0 }),
  actions: {
    async buscar() {
      validar(this.filtros)
      const params = paramsDe(this.filtros)
      const { data } = await porteria.get('/eventos', { params })
      this.aplicados = params
      this.items = data.items
      this.total = data.total
      this.pagina = data.pagina
    },
    async cargarMas() {
      const { data } = await porteria.get('/eventos', { params: { ...this.aplicados, pagina: this.pagina + 1 } })
      const vistos = new Set(this.items.map((e) => e.id))
      this.items.push(...data.items.filter((e) => !vistos.has(e.id)))
      this.total = data.total
      this.pagina = data.pagina
    },
    async descargarExcel() {
      validar(this.filtros)
      const params = paramsDe(this.filtros)
      const blob = await porteria.get('/admin/reportes/movimientos.xlsx', { params, responseType: 'blob', timeout: TIEMPO_EXCEL })
      guardarArchivo(blob, nombreReporte(params))
    },
    reemplazar(evento) {
      const i = this.items.findIndex((e) => e.id === evento.id)
      if (i >= 0) this.items.splice(i, 1, evento)
    }
  }
})
