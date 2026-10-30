<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import MarcoGuarda from '@/components/MarcoGuarda.vue'
import { useEstadoStore } from '@/stores/estado'
import { normalizarPlaca } from '@/utils/placa'

const router = useRouter()
const estado = useEstadoStore()
const placa = ref('')
const error = ref('')

onMounted(async () => {
  try {
    await estado.cargarTodo()
  } catch (e) {
    error.value = e.message
  }
})

function buscar() {
  const p = normalizarPlaca(placa.value)
  if (p) router.push({ path: '/registrar', query: { placa: p } })
}
</script>

<template>
  <MarcoGuarda>
    <div class="space-y-4">
      <div class="grid gap-3 sm:grid-cols-2">
        <button type="button" class="btn-primario btn-grande" data-test="inicio-ingreso" @click="router.push('/registrar/INGRESO')">Registrar ingreso</button>
        <button type="button" class="btn-primario btn-grande" data-test="inicio-salida" @click="router.push('/registrar/SALIDA')">Registrar salida</button>
      </div>
      <form class="flex gap-2" @submit.prevent="buscar">
        <input v-model="placa" class="campo uppercase text-xl" placeholder="Buscar placa" autocapitalize="characters" data-test="inicio-placa" />
        <button type="button" class="btn-secundario" data-test="inicio-buscar" @click="buscar">Buscar</button>
      </form>
      <p v-if="error" class="aviso-error">{{ error }}</p>
      <div class="grid grid-cols-2 gap-3">
        <RouterLink to="/vehiculos" class="tarjeta text-center">
          <p class="text-4xl font-bold text-primary-800" data-test="inicio-dentro">{{ estado.dentro.length }}</p>
          <p class="text-gray-700">Dentro ahora</p>
        </RouterLink>
        <RouterLink to="/vehiculos?vista=fuera" class="tarjeta text-center">
          <p class="text-4xl font-bold text-primary-800" data-test="inicio-fuera">{{ estado.fuera.length }}</p>
          <p class="text-gray-700">Propios fuera</p>
        </RouterLink>
      </div>
    </div>
  </MarcoGuarda>
</template>
