<script setup>
import { ref, computed, onMounted } from 'vue'
import MarcoAdmin from '@/components/MarcoAdmin.vue'
import DetalleEvento from '@/components/DetalleEvento.vue'
import { useAuthStore } from '@/stores/auth'
import { useConsultaStore } from '@/stores/consulta'
import { useMotivosStore } from '@/stores/motivos'
import { useCarga } from '@/composables/carga'
import { fechaHora } from '@/utils/fechas'

const auth = useAuthStore()
const consulta = useConsultaStore()
const motivos = useMotivosStore()
const { cargando, error: errorBusqueda, ejecutar: buscar } = useCarga(() => consulta.buscar())
const error = ref('')
const descargando = ref(false)
const cargandoMas = ref(false)
const seleccionadoId = ref(null)
const seleccionado = computed(() => consulta.items.find((e) => e.id === seleccionadoId.value) || null)
const TIPOS = [{ valor: 'PROPIO', texto: 'Propio' }, { valor: 'PROVEEDOR_ASISTENCIA', texto: 'Proveedor de asistencias' }, { valor: 'PROVEEDOR', texto: 'Proveedor' }]

onMounted(() => {
  auth.cargarSedes().catch(() => {})
  motivos.cargar().catch(() => {})
  buscar()
})

async function conError(accion, bandera) {
  error.value = ''
  bandera.value = true
  try {
    await accion()
  } catch (e) {
    error.value = (e && e.message) || 'Ocurrió un error'
  } finally {
    bandera.value = false
  }
}
const cargarMas = () => conError(() => consulta.cargarMas(), cargandoMas)
const descargar = () => conError(() => consulta.descargarExcel(), descargando)
function consultar() {
  error.value = ''
  buscar()
}
</script>

<template>
  <MarcoAdmin titulo="Movimientos">
    <div class="tarjeta grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
      <div>
        <label class="etiqueta" for="f-sede">Sede</label>
        <select id="f-sede" v-model="consulta.filtros.sede" class="campo" data-test="filtro-sede">
          <option value="todas">Todas</option>
          <option v-for="s in auth.sedes" :key="s.id" :value="String(s.id)">{{ s.nombre }}</option>
        </select>
      </div>
      <div>
        <label class="etiqueta" for="f-desde">Desde</label>
        <input id="f-desde" v-model="consulta.filtros.desde" type="date" class="campo" data-test="filtro-desde" />
      </div>
      <div>
        <label class="etiqueta" for="f-hasta">Hasta</label>
        <input id="f-hasta" v-model="consulta.filtros.hasta" type="date" class="campo" data-test="filtro-hasta" />
      </div>
      <div>
        <label class="etiqueta" for="f-placa">Placa</label>
        <input id="f-placa" v-model="consulta.filtros.placa" class="campo uppercase" maxlength="20" data-test="filtro-placa" />
      </div>
      <div>
        <label class="etiqueta" for="f-tipo">Tipo</label>
        <select id="f-tipo" v-model="consulta.filtros.tipo" class="campo" data-test="filtro-tipo">
          <option value="">Todos</option>
          <option v-for="t in TIPOS" :key="t.valor" :value="t.valor">{{ t.texto }}</option>
        </select>
      </div>
      <div>
        <label class="etiqueta" for="f-motivo">Motivo</label>
        <select id="f-motivo" v-model="consulta.filtros.motivoId" class="campo" data-test="filtro-motivo">
          <option value="">Todos</option>
          <option v-for="m in motivos.lista" :key="m.id" :value="String(m.id)">{{ m.nombre }}</option>
        </select>
      </div>
      <div>
        <label class="etiqueta" for="f-inc">Inconsistencias</label>
        <select id="f-inc" v-model="consulta.filtros.inconsistente" class="campo" data-test="filtro-inconsistente">
          <option value="">Todas</option>
          <option value="1">Solo inconsistentes</option>
          <option value="0">Sin inconsistencia</option>
        </select>
      </div>
      <div class="flex gap-2 items-end">
        <button type="button" class="btn-primario flex-1" :disabled="cargando" data-test="consulta-buscar" @click="consultar">{{ cargando ? 'Buscando…' : 'Buscar' }}</button>
        <button type="button" class="btn-secundario flex-1" :disabled="descargando" data-test="consulta-excel" @click="descargar">{{ descargando ? 'Generando…' : 'Excel' }}</button>
      </div>
    </div>

    <p v-if="errorBusqueda || error" class="aviso-error mb-3" role="alert" data-test="consulta-error">{{ error || errorBusqueda }}</p>
    <p v-if="consulta.aplicados" class="text-gray-600 mb-2">Mostrando <span data-test="consulta-total">{{ consulta.items.length }} de {{ consulta.total }}</span></p>
    <p v-if="consulta.aplicados && !consulta.items.length && !cargando" class="text-gray-600">Sin movimientos con esos filtros.</p>

    <ul class="space-y-2">
      <li v-for="e in consulta.items" :key="e.id">
        <button
          type="button" class="tarjeta w-full text-left space-y-1" :class="e.anulado ? 'opacity-60' : ''"
          data-test="consulta-fila" @click="seleccionadoId = e.id"
        >
          <span class="flex flex-wrap items-center justify-between gap-2">
            <span class="font-bold">{{ fechaHora(e.registrado_at) }} · {{ e.sentido === 'INGRESO' ? 'Ingreso' : 'Salida' }} · <span class="tracking-wider">{{ e.placa }}</span></span>
            <span v-if="e.anulado" class="rounded-lg bg-gray-200 px-2 py-1 text-sm" data-test="consulta-anulado">Anulado</span>
            <span v-else-if="e.inconsistente" class="rounded-lg bg-amber-100 text-amber-900 px-2 py-1 text-sm" data-test="consulta-inconsistente">Inconsistente</span>
          </span>
          <span class="block text-gray-700">{{ auth.nombreSede(e.sede_id) }} · {{ e.motivo ? e.motivo.nombre : '' }} · {{ e.conductor_nombre }}</span>
        </button>
      </li>
    </ul>
    <button
      v-if="consulta.total > consulta.items.length && !consulta.sinMas" type="button" class="btn-secundario w-full mt-3"
      :disabled="cargandoMas || cargando" data-test="consulta-mas" @click="cargarMas"
    >{{ cargandoMas ? 'Cargando…' : 'Cargar más' }}</button>
    <DetalleEvento v-if="seleccionado" :evento="seleccionado" @cerrar="seleccionadoId = null" />
  </MarcoAdmin>
</template>
