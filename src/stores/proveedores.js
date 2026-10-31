import { defineStore } from 'pinia'
import { porteria } from '@/services/api'
import { useCatalogosStore } from '@/stores/catalogos'

// Cada búsqueda, alta, edición o reinicio la incrementa: una búsqueda anterior ya no escribe la lista.
let secuenciaBusqueda = 0

// Catálogo de proveedores visto por el admin: incluye inactivos para poder reactivarlos.
export const useProveedoresStore = defineStore('proveedores', {
  state: () => ({ lista: [] }),
  actions: {
    async buscar(q) {
      const params = q ? { q, incluir_inactivos: '1' } : { incluir_inactivos: '1' }
      const mia = ++secuenciaBusqueda
      const { data } = await porteria.get('/vehiculos-externos', { params })
      // Solo la búsqueda más reciente escribe la lista: una respuesta vieja no la pisa.
      if (mia === secuenciaBusqueda) this.lista = data
      return data
    },
    async crear(datos) {
      const { data } = await porteria.post('/vehiculos-externos', datos)
      this.lista = [data, ...this.lista.filter((v) => v.id !== data.id)]
      secuenciaBusqueda++
      useCatalogosStore().limpiar()
      return data
    },
    async actualizar(id, cambios) {
      const { data } = await porteria.patch(`/vehiculos-externos/${id}`, cambios)
      this.lista = this.lista.map((v) => (v.id === id ? data : v))
      secuenciaBusqueda++
      useCatalogosStore().limpiar()
      return data
    },
    // Al cerrar sesión: además de vaciar, invalida las búsquedas en vuelo.
    reiniciar() {
      secuenciaBusqueda++
      this.$reset()
    }
  }
})
