<script setup>
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { confirmar } from '@/composables/confirmar'

defineProps({ titulo: { type: String, default: '' } })

const auth = useAuthStore()
const router = useRouter()
const ENLACES = [
  { a: '/admin/movimientos', texto: 'Movimientos' },
  { a: '/admin/motivos', texto: 'Motivos' },
  { a: '/admin/proveedores', texto: 'Proveedores' },
  { a: '/inicio', texto: 'Sede' }
]

async function salir() {
  if (!(await confirmar('¿Cerrar sesión?', { aceptar: 'Cerrar sesión' }))) return
  auth.logout()
  router.replace('/login')
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="bg-primary-800 text-white px-4 py-3">
      <div class="flex items-center justify-between gap-2 max-w-6xl mx-auto">
        <div>
          <p class="text-lg font-bold">Administración · Portería</p>
          <p class="text-sm opacity-90">{{ auth.usuario ? auth.usuario.nombre : '' }}</p>
        </div>
        <button type="button" class="btn border-2 border-white/60 text-white text-base" data-test="admin-salir" @click="salir">Salir</button>
      </div>
      <nav class="mt-3 flex gap-2 overflow-x-auto max-w-6xl mx-auto" data-test="admin-nav">
        <RouterLink v-for="e in ENLACES" :key="e.a" :to="e.a" class="btn bg-primary-900 text-white text-base" active-class="ring-2 ring-white">{{ e.texto }}</RouterLink>
      </nav>
    </header>
    <p v-if="auth.servicioNoDisponible" class="bg-red-700 text-white px-4 py-2 text-center font-semibold" role="alert" data-test="admin-servicio">
      Portería no está disponible en este momento. Avisa a TI.
    </p>
    <main class="flex-1 p-4 max-w-6xl w-full mx-auto">
      <h1 v-if="titulo" class="text-2xl font-bold mb-4">{{ titulo }}</h1>
      <slot />
    </main>
  </div>
</template>
