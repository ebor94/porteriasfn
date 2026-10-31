import { defineStore } from 'pinia'
import { porteria } from '@/services/api'

const DIEZ_MINUTOS = 10 * 60 * 1000
// limpiar() la incrementa: una carga que empezó antes no guarda datos que ya se invalidaron.
let version = 0

export const useCatalogosStore = defineStore('catalogos', {
  state: () => ({ cache: {} }),
  actions: {
    async cacheado(clave, cargar) {
      const guardado = this.cache[clave]
      if (guardado && Date.now() - guardado.en < DIEZ_MINUTOS) return guardado.datos
      const mia = version
      const datos = await cargar()
      if (mia === version) this.cache[clave] = { datos, en: Date.now() }
      return datos
    },
    conductores() {
      return this.cacheado('conductores', async () => (await porteria.get('/catalogos/conductores')).data)
    },
    motivos(tipoVehiculo, sentido) {
      return this.cacheado(`motivos:${tipoVehiculo}:${sentido}`, async () =>
        (await porteria.get('/catalogos/motivos', { params: { tipo_vehiculo: tipoVehiculo, sentido } })).data)
    },
    async asistencias(q) {
      return (await porteria.get('/catalogos/asistencias', { params: { q } })).data
    },
    async exequias({ q, placa }) {
      return (await porteria.get('/catalogos/exequias', { params: { q, placa } })).data
    },
    async vehiculosExternos(q) {
      return (await porteria.get('/vehiculos-externos', { params: { q } })).data
    },
    limpiar() {
      version++
      this.cache = {}
    }
  }
})
