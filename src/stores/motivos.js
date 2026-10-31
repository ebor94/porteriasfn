import { defineStore } from 'pinia'
import { porteria } from '@/services/api'
import { useCatalogosStore } from '@/stores/catalogos'

const porOrden = (a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre)

// Motivos del admin (activos e inactivos). Cada cambio limpia la caché del asistente.
export const useMotivosStore = defineStore('motivos', {
  state: () => ({ lista: [] }),
  actions: {
    async cargar() {
      this.lista = (await porteria.get('/admin/motivos')).data
      return this.lista
    },
    async crear(datos) {
      const { data } = await porteria.post('/admin/motivos', datos)
      this.lista = [...this.lista, data].sort(porOrden)
      useCatalogosStore().limpiar()
      return data
    },
    async actualizar(id, cambios) {
      const { data } = await porteria.patch(`/admin/motivos/${id}`, cambios)
      this.lista = this.lista.map((m) => (m.id === id ? data : m)).sort(porOrden)
      useCatalogosStore().limpiar()
      return data
    },
    async eliminar(id) {
      await porteria.delete(`/admin/motivos/${id}`)
      this.lista = this.lista.filter((m) => m.id !== id)
      useCatalogosStore().limpiar()
    }
  }
})
