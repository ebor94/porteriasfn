<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MarcoGuarda from '@/components/MarcoGuarda.vue'
import { useEstadoStore } from '@/stores/estado'
import { useAuthStore } from '@/stores/auth'
import { haceCuanto } from '@/utils/fechas'

const route = useRoute()
const router = useRouter()
const estado = useEstadoStore()
const auth = useAuthStore()
const vista = ref(route.query.vista === 'fuera' ? 'fuera' : 'dentro')
const error = ref('')

const filas = computed(() => (vista.value === 'dentro' ? estado.dentro : estado.fuera))
const TIPO = { PROPIO: 'Empresa', PROVEEDOR: 'Proveedor', PROVEEDOR_ASISTENCIA: 'Proveedor de asistencias' }

onMounted(async () => {
  auth.cargarSedes().catch(() => {})
  try {
    await estado.cargarTodo()
  } catch (e) {
    error.value = e.message
  }
})

function registrar(fila) {
  const sentido = vista.value === 'dentro' ? 'SALIDA' : 'INGRESO'
  router.push({ path: `/registrar/${sentido}`, query: { placa: fila.placa } })
}
</script>

<template>
  <MarcoGuarda titulo="Vehículos">
    <div class="grid grid-cols-2 gap-2 mb-4">
      <button type="button" class="btn border-2" :class="vista === 'dentro' ? 'bg-primary-700 text-white border-primary-700' : 'bg-white border-gray-300'" data-test="vehiculos-tab-dentro" @click="vista = 'dentro'">
        Dentro ({{ estado.dentro.length }})
      </button>
      <button type="button" class="btn border-2" :class="vista === 'fuera' ? 'bg-primary-700 text-white border-primary-700' : 'bg-white border-gray-300'" data-test="vehiculos-tab-fuera" @click="vista = 'fuera'">
        Propios fuera ({{ estado.fuera.length }})
      </button>
    </div>
    <p v-if="error" class="aviso-error mb-3">{{ error }}</p>
    <p v-if="!filas.length && !estado.cargando" class="text-gray-600">No hay vehículos.</p>
    <ul class="space-y-3">
      <li v-for="f in filas" :key="f.placa" class="tarjeta flex items-center justify-between gap-3" data-test="vehiculo-fila">
        <div>
          <p class="text-xl font-bold tracking-wider">{{ f.placa }}</p>
          <p class="text-gray-700">
            {{ TIPO[f.tipo_vehiculo] || '' }}{{ f.empresa ? ` · ${f.empresa}` : '' }} ·
            {{ f.carga_inicial ? 'Carga inicial' : (f.motivo ? f.motivo.nombre : '') }}
          </p>
          <p class="text-sm text-gray-600">
            {{ haceCuanto(f.registrado_at) }}<template v-if="vista === 'fuera' && f.sede_id"> · salió por {{ auth.nombreSede(f.sede_id) }}</template>
          </p>
        </div>
        <button type="button" class="btn-secundario shrink-0" data-test="vehiculo-accion" @click="registrar(f)">
          {{ vista === 'dentro' ? 'Salida' : 'Ingreso' }}
        </button>
      </li>
    </ul>
  </MarcoGuarda>
</template>
