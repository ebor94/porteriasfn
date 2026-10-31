import { defineStore } from 'pinia'
import { porteria, tokenStorage } from '@/services/api'
import { responder } from '@/composables/confirmar'
import { useCatalogosStore } from '@/stores/catalogos'
import { useConsultaStore } from '@/stores/consulta'
import { useEstadoStore } from '@/stores/estado'
import { useEventosStore } from '@/stores/eventos'
import { useMotivosStore } from '@/stores/motivos'
import { useProveedoresStore } from '@/stores/proveedores'

export const useAuthStore = defineStore('auth', {
  state: () => ({ token: tokenStorage.leer(), usuario: null, sedes: [], servicioNoDisponible: false }),
  getters: {
    autenticado: (s) => Boolean(s.token && s.usuario),
    esAdmin: (s) => Boolean(s.usuario && s.usuario.rol === 'admin_porteria'),
    sede: (s) => (s.usuario && s.usuario.sede) || null,
    // El guarda empieza eligiendo sede; el admin sin sede, en la administración.
    rutaInicio: (s) => {
      if (s.usuario && s.usuario.sede) return '/inicio'
      return s.usuario && s.usuario.rol === 'admin_porteria' ? '/admin' : '/sede'
    }
  },
  actions: {
    fijarSesion(token, usuario) {
      this.token = token
      this.usuario = usuario
      tokenStorage.guardar(token)
    },
    fijarServicio(disponible) {
      this.servicioNoDisponible = !disponible
    },
    async login(usuario, password) {
      const { data } = await porteria.post('/auth/login', { usuario, password })
      this.sedes = data.sedes
      this.fijarSesion(data.token, data.user)
    },
    async elegirSede(sedeId) {
      const { data } = await porteria.post('/auth/sede', { sede_id: sedeId })
      this.fijarSesion(data.token, data.user)
    },
    async cargarPerfil() {
      try {
        const { data } = await porteria.get('/auth/me')
        this.usuario = data.user
      } catch (e) {
        if (e && e.status === 401) this.logout()
        throw e
      }
    },
    async cargarSedes() {
      if (this.sedes.length === 0) this.sedes = (await porteria.get('/catalogos/sedes')).data
      return this.sedes
    },
    nombreSede(id) {
      const sede = this.sedes.find((s) => s.id === id)
      return sede ? sede.nombre : ''
    },
    logout() {
      this.token = null
      this.usuario = null
      this.sedes = []
      tokenStorage.guardar(null)
      // Un diálogo de confirmación abierto no debe sobrevivir a la sesión.
      responder(false)
      // Nada de la sesión anterior debe verse con la siguiente.
      useEstadoStore().$reset()
      useEventosStore().$reset()
      useCatalogosStore().limpiar()
      useMotivosStore().$reset()
      useProveedoresStore().$reset()
      useConsultaStore().$reset()
    }
  }
})
