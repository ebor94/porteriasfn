<script setup>
import { ref, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import MarcoGuarda from '@/components/MarcoGuarda.vue'
import DialogoTexto from '@/components/DialogoTexto.vue'
import { useEventosStore } from '@/stores/eventos'
import { useAuthStore } from '@/stores/auth'
import { horaCorta } from '@/utils/fechas'
import { puedeEditar } from '@/utils/permisos'

const eventos = useEventosStore()
const auth = useAuthStore()
const toast = useToast()
const error = ref('')
const dialogo = ref(null) // { tipo: 'anular' | 'km', evento }

onMounted(cargar)

async function cargar() {
  error.value = ''
  try {
    await eventos.cargarDelDia()
  } catch (e) {
    error.value = e.message
  }
}

async function aceptar(valor) {
  const { tipo, evento } = dialogo.value
  dialogo.value = null
  try {
    if (tipo === 'anular') {
      await eventos.anular(evento.id, valor)
      toast.success(`Registro de ${evento.placa} anulado`)
    } else {
      await eventos.corregir(evento.id, { kilometraje: Number(valor) })
      toast.success(`Kilometraje de ${evento.placa} corregido`)
    }
  } catch (e) {
    const mensaje = e.motivo === 'SIN_CONEXION'
      ? 'Sin conexión: no se pudo confirmar. Revisa la lista antes de reintentar.'
      : e.message
    // 409 MODIFICADO/ANULADO o corte de red: los datos en pantalla pueden no ser los del servidor.
    if (e.status === 409 || e.motivo === 'SIN_CONEXION') await cargar()
    error.value = mensaje
  }
}
</script>

<template>
  <MarcoGuarda titulo="Movimientos de hoy">
    <p v-if="error" class="aviso-error mb-3">{{ error }}</p>
    <p v-if="!eventos.delDia.length" class="text-gray-600">Sin movimientos hoy.</p>
    <ul class="space-y-3">
      <li v-for="e in eventos.delDia" :key="e.id" class="tarjeta space-y-2" :class="e.anulado ? 'opacity-60' : ''" data-test="movimiento-fila">
        <div class="flex items-center justify-between gap-2">
          <p class="text-lg font-bold">
            {{ horaCorta(e.registrado_at) }} · {{ e.sentido === 'INGRESO' ? 'Ingreso' : 'Salida' }} · <span class="tracking-wider">{{ e.placa }}</span>
          </p>
          <span v-if="e.anulado" class="rounded-lg bg-gray-200 px-2 py-1 text-sm" data-test="movimiento-anulado">Anulado</span>
          <span v-else-if="e.inconsistente" class="rounded-lg bg-amber-100 text-amber-900 px-2 py-1 text-sm" data-test="movimiento-inconsistente">Inconsistente</span>
        </div>
        <p class="text-gray-700">{{ e.motivo ? e.motivo.nombre : '' }} · {{ e.conductor_nombre }}<template v-if="e.kilometraje !== null && e.kilometraje !== undefined"> · {{ e.kilometraje }} km</template></p>
        <div v-if="puedeEditar(e, auth.usuario)" class="flex gap-2">
          <button v-if="e.tipo_vehiculo === 'PROPIO'" type="button" class="btn-secundario" data-test="movimiento-km" @click="dialogo = { tipo: 'km', evento: e }">Corregir km</button>
          <button type="button" class="btn-peligro" data-test="movimiento-anular" @click="dialogo = { tipo: 'anular', evento: e }">Anular</button>
        </div>
      </li>
    </ul>
    <DialogoTexto
      v-if="dialogo"
      :titulo="dialogo.tipo === 'anular' ? `Anular registro de ${dialogo.evento.placa}` : `Kilometraje de ${dialogo.evento.placa}`"
      :etiqueta="dialogo.tipo === 'anular' ? 'Motivo de la anulación' : 'Kilometraje'"
      :valor-inicial="dialogo.tipo === 'km' ? (dialogo.evento.kilometraje ?? '') : ''"
      :numerico="dialogo.tipo === 'km'"
      @aceptar="aceptar" @cancelar="dialogo = null"
    />
  </MarcoGuarda>
</template>
