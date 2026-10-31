<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import MarcoGuarda from '@/components/MarcoGuarda.vue'
import { useEstadoStore } from '@/stores/estado'
import { normalizarPlaca } from '@/utils/placa'

const router = useRouter()
const estado = useEstadoStore()
const placa = ref('')
const error = ref('')

const cargadoUnaVez = ref(false)
// Un cero falso (aún sin datos o con error) haría creer que la sede está vacía.
const sinDatos = computed(() => estado.cargando || Boolean(error.value) || !cargadoUnaVez.value)
const contador = (lista) => (sinDatos.value ? '—' : lista.length)

async function cargar() {
  error.value = ''
  try {
    await estado.cargarTodo()
  } catch (e) {
    error.value = e.message
  } finally {
    cargadoUnaVez.value = true
  }
}

function alCambiarVisibilidad() {
  if (document.visibilityState === 'visible') cargar()
}

onMounted(() => {
  document.addEventListener('visibilitychange', alCambiarVisibilidad)
  cargar()
})
onBeforeUnmount(() => document.removeEventListener('visibilitychange', alCambiarVisibilidad))

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
      <p v-if="error" class="aviso-error" role="alert" data-test="inicio-error">{{ error }}</p>
      <div class="grid grid-cols-2 gap-3">
        <RouterLink to="/vehiculos" class="tarjeta text-center">
          <p class="text-4xl font-bold text-primary-800" data-test="inicio-dentro">{{ contador(estado.dentro) }}</p>
          <p class="text-gray-700">Dentro ahora</p>
        </RouterLink>
        <RouterLink to="/vehiculos?vista=fuera" class="tarjeta text-center">
          <p class="text-4xl font-bold text-primary-800" data-test="inicio-fuera">{{ contador(estado.fuera) }}</p>
          <p class="text-gray-700">Propios fuera</p>
        </RouterLink>
      </div>
      <button type="button" class="btn-secundario w-full" :disabled="estado.cargando" data-test="inicio-actualizar" @click="cargar">Actualizar</button>
    </div>
  </MarcoGuarda>
</template>
