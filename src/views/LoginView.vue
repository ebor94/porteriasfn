<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { MOTIVO_SESION_EXPIRADA } from '@/services/sesion'
import { rutaInterna } from '@/utils/rutas'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const usuario = ref('')
const clave = ref('')
const error = ref('')
const enviando = ref(false)
const verClave = ref(false)
const LOGO = `${import.meta.env.BASE_URL}logo-olivos.webp`
const vencida = computed(() => route.query.motivo === MOTIVO_SESION_EXPIRADA)

async function entrar() {
  error.value = ''
  if (!usuario.value.trim() || !clave.value) {
    error.value = 'Escribe tu usuario y contraseña'
    return
  }
  enviando.value = true
  try {
    await auth.login(usuario.value.trim(), clave.value)
    clave.value = ''
    const redirect = rutaInterna(route.query.redirect)
    if (!redirect) router.replace(auth.rutaInicio)
    // El admin no necesita sede para la administración; si el destino la pide, la guarda lo lleva a elegirla.
    else if (auth.sede || auth.esAdmin) router.replace(redirect)
    else router.replace({ path: '/sede', query: { redirect } })
  } catch (e) {
    error.value = e.message || 'No se pudo entrar'
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <!-- Mismo aspecto que el login de home360 (homenajes360-frontend/src/views/LoginView.vue). -->
  <main class="min-h-screen bg-gradient-to-br from-[#155f35] via-[#1a7a45] to-[#2d9957] flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center bg-white rounded-2xl px-6 py-4 mb-5 shadow-lg">
          <img :src="LOGO" alt="Serfunorte Los Olivos" class="h-16 w-auto" data-test="login-logo" />
        </div>
        <h1 class="text-white text-2xl font-bold">Portería</h1>
      </div>

      <form class="bg-white rounded-2xl shadow-2xl p-8 space-y-4" @submit.prevent="entrar">
        <h2 class="text-gray-800 font-bold text-lg">Iniciar sesión</h2>
        <p v-if="auth.servicioNoDisponible" class="aviso-error" role="alert" data-test="login-servicio">
          Portería no está disponible en este momento. Avisa a TI.
        </p>
        <p v-if="vencida" class="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3" role="alert" data-test="login-aviso">
          Tu sesión venció. Vuelve a entrar.
        </p>
        <div>
          <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1" for="usuario">Usuario de red</label>
          <input id="usuario" v-model="usuario" class="campo border rounded-lg focus:ring-2 focus:ring-[#2d9957]" placeholder="Ej: jperez" autocomplete="username" autocapitalize="none" data-test="login-usuario" />
        </div>
        <div>
          <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1" for="clave">Contraseña</label>
          <div class="relative">
            <input id="clave" v-model="clave" :type="verClave ? 'text' : 'password'" class="campo border rounded-lg pr-14 focus:ring-2 focus:ring-[#2d9957]" placeholder="Contraseña" autocomplete="current-password" data-test="login-clave" />
            <button
              type="button" class="absolute right-0 top-0 min-h-tactil min-w-tactil text-xl"
              :aria-label="verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'" :aria-pressed="verClave"
              data-test="login-ver-clave" @click="verClave = !verClave"
            >{{ verClave ? '🙈' : '👁️' }}</button>
          </div>
        </div>
        <p v-if="error" class="aviso-error" role="alert" data-test="login-error">{{ error }}</p>
        <button type="submit" class="btn w-full bg-[#1a7a45] text-white hover:bg-[#2d9957] active:scale-95" :disabled="enviando" data-test="login-entrar">
          <span aria-hidden="true">{{ enviando ? '⏳' : '🔐' }}</span>
          {{ enviando ? 'Verificando…' : 'Ingresar' }}
        </button>
      </form>

      <p class="text-center text-green-100/80 text-xs mt-6" data-test="login-pie">Tecnologías de la información, Serfunorte Los Olivos</p>
    </div>
  </main>
</template>
