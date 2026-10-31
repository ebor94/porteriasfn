<script setup>
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

defineProps({ titulo: { type: String, default: '' } })

const auth = useAuthStore()
const router = useRouter()

function salir() {
  auth.logout()
  router.replace('/login')
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="bg-primary-700 text-white px-4 py-3">
      <div class="flex items-center justify-between gap-2">
        <div>
          <p class="text-lg font-bold" data-test="marco-sede">{{ auth.sede ? auth.sede.nombre : 'Sin sede' }}</p>
          <p class="text-sm opacity-90">{{ auth.usuario ? auth.usuario.nombre : '' }}</p>
        </div>
        <div class="flex gap-2">
          <RouterLink to="/sede" class="btn border-2 border-white/60 text-white text-base" data-test="marco-cambiar-sede">Cambiar sede</RouterLink>
          <button type="button" class="btn border-2 border-white/60 text-white text-base" data-test="marco-salir" @click="salir">Salir</button>
        </div>
      </div>
      <nav class="mt-3 flex gap-2 overflow-x-auto">
        <RouterLink to="/inicio" class="btn bg-primary-800 text-white text-base" active-class="ring-2 ring-white">Inicio</RouterLink>
        <RouterLink to="/vehiculos" class="btn bg-primary-800 text-white text-base" active-class="ring-2 ring-white">Vehículos</RouterLink>
        <RouterLink to="/movimientos" class="btn bg-primary-800 text-white text-base" active-class="ring-2 ring-white">Movimientos</RouterLink>
      </nav>
    </header>
    <p v-if="auth.servicioNoDisponible" class="bg-red-700 text-white px-4 py-2 text-center font-semibold" role="alert" data-test="marco-servicio">
      Portería no está disponible en este momento. Avisa a TI.
    </p>
    <main class="flex-1 p-4 max-w-3xl w-full mx-auto">
      <h1 v-if="titulo" class="text-2xl font-bold mb-4">{{ titulo }}</h1>
      <slot />
    </main>
  </div>
</template>
