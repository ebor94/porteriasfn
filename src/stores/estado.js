import { defineStore } from 'pinia'
import { porteria } from '@/services/api'

export const useEstadoStore = defineStore('estado', {
  state: () => ({ dentro: [], fuera: [], cargando: false }),
  actions: {
    async sugerir(placa) {
      return (await porteria.get(`/estado/placa/${encodeURIComponent(placa)}`)).data
    },
    async cargarDentro() {
      this.dentro = (await porteria.get('/estado/dentro')).data
    },
    async cargarFuera() {
      this.fuera = (await porteria.get('/estado/fuera')).data
    },
    async cargarTodo() {
      this.cargando = true
      try {
        await Promise.all([this.cargarDentro(), this.cargarFuera()])
      } finally {
        this.cargando = false
      }
    }
  }
})
