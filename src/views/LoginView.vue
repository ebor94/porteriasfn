<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { MOTIVO_SESION_EXPIRADA } from '@/services/sesion'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const usuario = ref('')
const clave = ref('')
const error = ref('')
const enviando = ref(false)
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
    router.replace(auth.rutaInicio)
  } catch (e) {
    error.value = e.message || 'No se pudo entrar'
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <main class="min-h-screen flex items-center justify-center p-4">
    <form class="tarjeta w-full max-w-sm space-y-4" @submit.prevent="entrar">
      <h1 class="text-2xl font-bold text-primary-800">Portería</h1>
      <p v-if="vencida" class="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3" data-test="login-aviso">
        Tu sesión venció. Vuelve a entrar.
      </p>
      <div>
        <label class="etiqueta" for="usuario">Usuario</label>
        <input id="usuario" v-model="usuario" class="campo" autocomplete="username" autocapitalize="none" data-test="login-usuario" />
      </div>
      <div>
        <label class="etiqueta" for="clave">Contraseña</label>
        <input id="clave" v-model="clave" type="password" class="campo" autocomplete="current-password" data-test="login-clave" />
      </div>
      <p v-if="error" class="aviso-error" data-test="login-error">{{ error }}</p>
      <button type="submit" class="btn-primario w-full" :disabled="enviando" data-test="login-entrar">
        {{ enviando ? 'Entrando…' : 'Entrar' }}
      </button>
    </form>
  </main>
</template>
