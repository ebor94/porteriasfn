import { defineStore } from 'pinia'
import { porteria } from '@/services/api'
import { useCatalogosStore } from '@/stores/catalogos'

// Catálogo de proveedores visto por el admin: incluye inactivos para poder reactivarlos.
export const useProveedoresStore = defineStore('proveedores', {
  state: () => ({ lista: [] }),
  actions: {
    async buscar(q) {
      const params = q ? { q, incluir_inactivos: '1' } : { incluir_inactivos: '1' }
      this.lista = (await porteria.get('/vehiculos-externos', { params })).data
      return this.lista
    },
    async crear(datos) {
      const { data } = await porteria.post('/vehiculos-externos', datos)
      this.lista = [data, ...this.lista.filter((v) => v.id !== data.id)]
      useCatalogosStore().limpiar()
      return data
    },
    async actualizar(id, cambios) {
      const { data } = await porteria.patch(`/vehiculos-externos/${id}`, cambios)
      this.lista = this.lista.map((v) => (v.id === id ? data : v))
      useCatalogosStore().limpiar()
      return data
    }
  }
})
