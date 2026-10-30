import { defineStore } from 'pinia'
import { porteria } from '@/services/api'
import { hoyLocal } from '@/utils/fechas'

export const useEventosStore = defineStore('eventos', {
  state: () => ({ delDia: [], total: 0 }),
  actions: {
    async registrar(cuerpo) {
      return (await porteria.post('/eventos', cuerpo)).data
    },
    // Primera página (50): suficiente para el día de una caseta; si no, el admin consulta en reportes.
    async cargarDelDia(hoy = hoyLocal()) {
      const { data } = await porteria.get('/eventos', { params: { desde: hoy, hasta: hoy } })
      this.delDia = data.items
      this.total = data.total
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
    reemplazar(evento) {
      const i = this.delDia.findIndex((e) => e.id === evento.id)
      if (i >= 0) this.delDia.splice(i, 1, evento)
    }
  }
})
