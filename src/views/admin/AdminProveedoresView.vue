<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useToast } from 'vue-toastification'
import MarcoAdmin from '@/components/MarcoAdmin.vue'
import FormularioProveedor from '@/components/FormularioProveedor.vue'
import { useProveedoresStore } from '@/stores/proveedores'
import { useCarga } from '@/composables/carga'

const proveedores = useProveedoresStore()
const toast = useToast()
const q = ref('')
const { cargando, error: errorCarga, ejecutar: buscar } = useCarga(() => proveedores.buscar(q.value.trim()))
const error = ref('')
const edicion = ref(null) // { vehiculo: null | objeto }
const errorFormulario = ref('')
const guardando = ref(false)
const ocupado = ref(new Set())
let temporizador = null

onMounted(buscar)
onBeforeUnmount(() => clearTimeout(temporizador))

function alEscribir() {
  clearTimeout(temporizador)
  temporizador = setTimeout(buscar, 300)
}

const TIPO = { PROVEEDOR: 'Proveedor', PROVEEDOR_ASISTENCIA: 'Proveedor de asistencias' }

function abrir(vehiculo) {
  errorFormulario.value = ''
  edicion.value = { vehiculo }
}

async function guardar(datos) {
  errorFormulario.value = ''
  guardando.value = true
  try {
    const v = edicion.value.vehiculo
    if (v) await proveedores.actualizar(v.id, datos)
    else await proveedores.crear(datos)
    toast.success(v ? 'Vehículo actualizado' : 'Vehículo agregado')
    edicion.value = null
  } catch (e) {
    errorFormulario.value = e.message || 'Ocurrió un error'
  } finally {
    guardando.value = false
  }
}

async function alternarActivo(v) {
  if (ocupado.value.has(v.id)) return
  error.value = ''
  ocupado.value = new Set(ocupado.value).add(v.id)
  try {
    await proveedores.actualizar(v.id, { activo: !v.activo })
    toast.success(v.activo ? 'Vehículo inactivado' : 'Vehículo activado')
  } catch (e) {
    error.value = e.message || 'Ocurrió un error'
  } finally {
    const resto = new Set(ocupado.value)
    resto.delete(v.id)
    ocupado.value = resto
  }
}
</script>

<template>
  <MarcoAdmin titulo="Proveedores">
    <div class="flex flex-wrap gap-2 mb-3">
      <input v-model="q" class="campo flex-1 min-w-[12rem]" placeholder="Placa o empresa" maxlength="50" data-test="proveedores-buscar" @input="alEscribir" />
      <button type="button" class="btn-primario" data-test="proveedor-nuevo" @click="abrir(null)">Agregar</button>
    </div>
    <p v-if="errorCarga || error" class="aviso-error mb-3" role="alert" data-test="proveedores-error">{{ errorCarga || error }}</p>
    <button v-if="errorCarga" type="button" class="btn-secundario mb-3" data-test="proveedores-reintentar" @click="buscar">Reintentar</button>
    <p v-if="cargando && !proveedores.lista.length" class="text-gray-600">Cargando…</p>
    <p v-else-if="!proveedores.lista.length && !errorCarga" class="text-gray-600">Sin resultados.</p>
    <p class="text-sm text-gray-600 mb-2">Se muestran hasta 30; afina la búsqueda para encontrar otros.</p>
    <ul class="space-y-3">
      <li v-for="v in proveedores.lista" :key="v.id" class="tarjeta space-y-2" :class="v.activo ? '' : 'opacity-70'" data-test="proveedor-fila">
        <div class="flex items-center justify-between gap-2">
          <p class="text-lg font-bold"><span class="tracking-wider">{{ v.placa }}</span> · {{ v.empresa }}</p>
          <span class="rounded-lg px-2 py-1 text-sm" :class="v.activo ? 'bg-green-100 text-green-900' : 'bg-gray-200'" data-test="proveedor-estado">{{ v.activo ? 'Activo' : 'Inactivo' }}</span>
        </div>
        <p class="text-gray-700">{{ TIPO[v.tipo] || v.tipo }}<template v-if="v.descripcion"> · {{ v.descripcion }}</template></p>
        <div class="flex gap-2">
          <button type="button" class="btn-secundario" data-test="proveedor-editar" :disabled="ocupado.has(v.id)" @click="abrir(v)">Editar</button>
          <button type="button" class="btn-secundario" data-test="proveedor-activo" :disabled="ocupado.has(v.id)" @click="alternarActivo(v)">{{ v.activo ? 'Inactivar' : 'Activar' }}</button>
        </div>
      </li>
    </ul>
    <FormularioProveedor
      v-if="edicion" :vehiculo="edicion.vehiculo" :error="errorFormulario" :guardando="guardando"
      @guardar="guardar" @cancelar="edicion = null"
    />
  </MarcoAdmin>
</template>
