import { defineStore } from 'pinia'
import { porteria, tokenStorage } from '@/services/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({ token: tokenStorage.leer(), usuario: null, sedes: [] }),
  getters: {
    autenticado: (s) => Boolean(s.token && s.usuario),
    esAdmin: (s) => Boolean(s.usuario && s.usuario.rol === 'admin_porteria'),
    sede: (s) => (s.usuario && s.usuario.sede) || null,
    rutaInicio: (s) => (s.usuario && s.usuario.sede ? '/inicio' : '/sede')
  },
  actions: {
    fijarSesion(token, usuario) {
      this.token = token
      this.usuario = usuario
      tokenStorage.guardar(token)
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
    }
  }
})
