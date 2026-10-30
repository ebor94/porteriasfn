<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const error = ref('')
const enviando = ref(false)

onMounted(async () => {
  try {
    await auth.cargarSedes()
  } catch (e) {
    error.value = e.message
  }
})

async function elegir(id) {
  error.value = ''
  enviando.value = true
  try {
    await auth.elegirSede(id)
    const destino = typeof route.query.redirect === 'string' ? route.query.redirect : '/inicio'
    router.replace(destino)
  } catch (e) {
    error.value = e.message
  } finally {
    enviando.value = false
  }
}

function salir() {
  auth.logout()
  router.replace('/login')
}
</script>

<template>
  <main class="min-h-screen p-4 max-w-md mx-auto space-y-4">
    <h1 class="text-2xl font-bold">¿En qué sede estás de turno?</h1>
    <p class="text-gray-600">{{ auth.usuario ? auth.usuario.nombre : '' }}</p>
    <p v-if="error" class="aviso-error" data-test="sede-error">{{ error }}</p>
    <div class="grid gap-3">
      <button
        v-for="s in auth.sedes" :key="s.id" type="button" class="btn-secundario btn-grande"
        :disabled="enviando" :data-test="`sede-${s.id}`" @click="elegir(s.id)"
      >{{ s.nombre }}</button>
    </div>
    <button type="button" class="btn-secundario w-full" @click="salir">Salir</button>
  </main>
</template>
