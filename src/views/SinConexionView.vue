<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { MOTIVO_SESION_EXPIRADA } from '@/services/sesion'
import { rutaInterna } from '@/utils/rutas'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const error = ref('')
const cargando = ref(false)
const MENSAJE_DESHABILITADA = 'Portería no está disponible en este momento. Avisa a TI.'

async function reintentar() {
  error.value = ''
  cargando.value = true
  try {
    await auth.cargarPerfil()
    router.replace(rutaInterna(route.query.redirect, '/inicio'))
  } catch (e) {
    if (e && e.status === 401) router.replace({ path: '/login', query: { motivo: MOTIVO_SESION_EXPIRADA } })
    else error.value = auth.servicioNoDisponible ? MENSAJE_DESHABILITADA : 'Sigue sin conexión. Intenta de nuevo.'
  } finally {
    cargando.value = false
  }
}
</script>

<template>
  <main class="min-h-screen flex items-center justify-center p-4">
    <div class="tarjeta w-full max-w-sm space-y-4 text-center">
      <h1 class="text-2xl font-bold text-primary-800">Sin conexión con el servidor</h1>
      <p v-if="auth.servicioNoDisponible && !error" class="aviso-error" role="alert" data-test="sin-conexion-deshabilitada">{{ MENSAJE_DESHABILITADA }}</p>
      <p v-if="!auth.servicioNoDisponible" class="text-gray-700">No se pudo comprobar tu sesión. Revisa la red y vuelve a intentar.</p>
      <p v-if="error" class="aviso-error" role="alert" data-test="sin-conexion-error">{{ error }}</p>
      <button type="button" class="btn-primario w-full" :disabled="cargando" data-test="sin-conexion-reintentar" @click="reintentar">
        {{ cargando ? 'Reintentando…' : 'Reintentar' }}
      </button>
    </div>
  </main>
</template>
