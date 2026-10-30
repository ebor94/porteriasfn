<script setup>
import { reactive, ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import MarcoGuarda from '@/components/MarcoGuarda.vue'
import ListaBuscable from '@/components/ListaBuscable.vue'
import DialogoInconsistencia from '@/components/DialogoInconsistencia.vue'
import { useAuthStore } from '@/stores/auth'
import { useCatalogosStore } from '@/stores/catalogos'
import { useEstadoStore } from '@/stores/estado'
import { useEventosStore } from '@/stores/eventos'
import { normalizarPlaca } from '@/utils/placa'
import { estadoInicial, aplicarSugerencia, pasosPara, validarPaso, construirCuerpo, detalleInconsistencia } from '@/registro/modelo'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const auth = useAuthStore()
const catalogos = useCatalogosStore()
const estadoStore = useEstadoStore()
const eventos = useEventosStore()

const sentidoInicial = ['INGRESO', 'SALIDA'].includes(route.params.sentido) ? route.params.sentido : null
const estado = reactive(estadoInicial(sentidoInicial))
const indice = ref(0)
const error = ref('')
const enviando = ref(false)
const motivos = ref([])
const inconsistencia = ref(null)

const motivo = computed(() => motivos.value.find((m) => m.id === estado.motivoId) || null)
const pasos = computed(() => pasosPara(estado, motivo.value))
const paso = computed(() => pasos.value[indice.value])
const esPropio = computed(() => estado.tipo === 'PROPIO')
const TIPOS = [{ valor: 'PROVEEDOR', texto: 'Proveedor' }, { valor: 'PROVEEDOR_ASISTENCIA', texto: 'Proveedor de asistencias' }]

const motivosError = ref('')
const errorVisible = computed(() => error.value || (paso.value === 'motivo' ? motivosError.value : ''))
let peticionMotivos = 0
let peticionPlaca = 0

async function cargarMotivos() {
  const numero = ++peticionMotivos
  const { tipo, sentido } = estado
  motivosError.value = ''
  if (!tipo || !sentido) {
    motivos.value = []
    return
  }
  try {
    const lista = await catalogos.motivos(tipo, sentido)
    if (numero !== peticionMotivos) return
    motivos.value = lista
    if (error.value && error.value === motivosError.value) error.value = ''
    // El motivo propuesto por la salida abierta puede no aplicar al nuevo sentido.
    if (estado.motivoId && !lista.some((m) => m.id === estado.motivoId)) estado.motivoId = null
  } catch (e) {
    if (numero !== peticionMotivos) return
    motivos.value = []
    motivosError.value = e.message
    error.value = e.message
  }
}

watch(() => [estado.tipo, estado.sentido], cargarMotivos)

// Si cambian los pasos (p. ej. el motivo ya no pide referencia), el índice no puede quedar fuera.
watch(pasos, (lista) => {
  if (indice.value > lista.length - 1) indice.value = lista.length - 1
})

onMounted(async () => {
  auth.cargarSedes().catch(() => {})
  if (typeof route.query.placa === 'string' && route.query.placa) {
    estado.placa = route.query.placa
    await consultarPlaca()
  }
})

async function consultarPlaca() {
  error.value = ''
  const placa = normalizarPlaca(estado.placa)
  if (!placa) {
    error.value = 'Escribe la placa'
    return
  }
  const numero = ++peticionPlaca
  try {
    const sentido = estado.sentido
    Object.assign(estado, estadoInicial(sentido), { placa })
    const sugerencia = await estadoStore.sugerir(placa)
    if (numero !== peticionPlaca) return
    aplicarSugerencia(estado, sugerencia)
  } catch (e) {
    if (numero === peticionPlaca) error.value = e.message
  }
}

function siguiente() {
  const falta = validarPaso(paso.value, estado, motivo.value)
  if (falta) {
    error.value = falta
    return
  }
  error.value = ''
  if (paso.value === 'confirmar') return enviar(false)
  indice.value += 1
}

function atras() {
  error.value = ''
  if (indice.value > 0) indice.value -= 1
  else router.back()
}

async function enviar(forzar) {
  enviando.value = true
  error.value = ''
  try {
    const ev = await eventos.registrar(construirCuerpo(estado, motivo.value, { forzar }))
    toast.success(`${ev.sentido === 'INGRESO' ? 'Ingreso' : 'Salida'} de ${ev.placa} ${ev.sentido === 'INGRESO' ? 'registrado' : 'registrada'}`)
    router.replace('/inicio')
  } catch (e) {
    if (e.status === 409 && e.motivo === 'SENTIDO_INCOHERENTE') {
      inconsistencia.value = { mensaje: e.message, detalle: detalleInconsistencia(e.errors && e.errors.estado, auth.nombreSede) }
    } else if (e.motivo === 'SIN_CONEXION') {
      error.value = 'Sin conexión: no se pudo confirmar el registro. Revisa los movimientos antes de reintentar.'
    } else {
      error.value = e.message
    }
  } finally {
    enviando.value = false
  }
}

function registrarIgual(observacion) {
  estado.observaciones = observacion
  inconsistencia.value = null
  enviar(true)
}

const buscarConductor = async (q) => {
  const lista = await catalogos.conductores()
  const t = q.toLowerCase()
  const tiene = (x) => String(x ?? '').toLowerCase().includes(t)
  return t ? lista.filter((c) => tiene(c.nombre) || tiene(c.usuario)) : lista
}
function elegirConductor(c) {
  estado.conductor = { modo: 'ad', usuario: c.usuario, nombre: c.nombre, documento: '' }
}
function usarOtro() {
  estado.conductor = { modo: 'otro', usuario: null, nombre: '', documento: '' }
}
const buscarAsistencia = (q) => catalogos.asistencias(q || undefined)
const buscarExequia = (q) => catalogos.exequias({ q: q || undefined, placa: estado.placa })
function elegirAsistencia(a) {
  estado.referencia = { asistenciaId: a.id, exequiaId: null, texto: '', etiqueta: `${a.codigo} · ${a.nombre_ser_querido}` }
}
function elegirExequia(x) {
  estado.referencia = { asistenciaId: null, exequiaId: x.id, texto: '', etiqueta: `${x.asistencia_codigo} · ${x.nombre_ser_querido}` }
}
const etiquetaExequia = (x) => `${x.es_de_la_placa ? '★ ' : ''}${x.tipo || 'Exequia'} ${x.fecha}${x.hora ? ` ${x.hora}` : ''} · ${x.nombre_ser_querido}${x.lugar ? ` · ${x.lugar}` : ''}`
</script>

<template>
  <MarcoGuarda :titulo="estado.sentido === 'INGRESO' ? 'Registrar ingreso' : estado.sentido === 'SALIDA' ? 'Registrar salida' : 'Registrar'">
    <div class="space-y-4">
      <section v-if="paso === 'placa'" class="space-y-3" data-test="paso-placa">
        <label class="etiqueta" for="placa">Placa</label>
        <div class="flex gap-2">
          <input id="placa" v-model="estado.placa" class="campo uppercase text-2xl tracking-widest" maxlength="20" autocapitalize="characters" data-test="registro-placa" @keyup.enter="consultarPlaca" />
          <button type="button" class="btn-secundario" data-test="registro-consultar" @click="consultarPlaca">Consultar</button>
        </div>
        <div v-if="estado.sugerencia" class="tarjeta space-y-2">
          <p class="text-xl font-bold">{{ estado.sugerencia.placa }}</p>
          <p v-if="estado.sugerencia.vehiculo">Vehículo de la empresa · {{ estado.sugerencia.vehiculo.marca }} {{ estado.sugerencia.vehiculo.modelo }}</p>
          <p v-else-if="estado.sugerencia.vehiculo_externo">Proveedor · {{ estado.sugerencia.vehiculo_externo.empresa }}</p>
          <p v-else>Placa nueva</p>
          <p v-if="estado.sugerencia.estado" class="text-gray-700">
            {{ estado.sugerencia.estado.dentro ? 'Figura dentro' : 'Figura fuera' }}{{ estado.sugerencia.estado.sede_id ? ` · ${auth.nombreSede(estado.sugerencia.estado.sede_id)}` : '' }}
          </p>
          <div class="grid grid-cols-2 gap-3 pt-2">
            <button
              v-for="s in ['INGRESO', 'SALIDA']" :key="s" type="button" class="btn border-2"
              :class="estado.sentido === s ? 'bg-primary-700 text-white border-primary-700' : 'bg-white border-gray-300'"
              :data-test="`registro-sentido-${s}`" @click="estado.sentido = s"
            >{{ s === 'INGRESO' ? 'Ingreso' : 'Salida' }}</button>
          </div>
        </div>
      </section>

      <section v-else-if="paso === 'tipo'" class="space-y-3" data-test="paso-tipo">
        <p class="etiqueta">¿Qué tipo de vehículo es?</p>
        <button
          v-for="t in TIPOS" :key="t.valor" type="button" class="btn btn-grande w-full border-2"
          :class="estado.tipo === t.valor ? 'bg-primary-700 text-white border-primary-700' : 'bg-white border-gray-300'"
          :data-test="`registro-tipo-${t.valor}`" @click="estado.tipo = t.valor"
        >{{ t.texto }}</button>
      </section>

      <section v-else-if="paso === 'conductor'" class="space-y-3" data-test="paso-conductor">
        <template v-if="esPropio">
          <p class="etiqueta">Conductor</p>
          <template v-if="estado.conductor.modo === 'ad'">
            <ListaBuscable
              :buscar="buscarConductor" :etiqueta="(c) => c.nombre" :clave="(c) => c.usuario"
              :seleccionado="estado.conductor.usuario" placeholder="Buscar conductor" inmediata @elegir="elegirConductor"
            />
            <button type="button" class="btn-secundario w-full" data-test="registro-conductor-otro" @click="usarOtro">Otro (no está en la lista)</button>
          </template>
          <template v-else>
            <input v-model="estado.conductor.nombre" class="campo" maxlength="150" placeholder="Nombre del conductor" data-test="registro-conductor-nombre" />
            <button type="button" class="btn-secundario w-full" @click="estado.conductor = { modo: 'ad', usuario: null, nombre: '', documento: '' }">Elegir de la lista</button>
          </template>
        </template>
        <template v-else>
          <div><label class="etiqueta" for="empresa">Empresa</label><input id="empresa" v-model="estado.empresa" class="campo" maxlength="150" data-test="registro-empresa" /></div>
          <div><label class="etiqueta" for="cnombre">Nombre del conductor</label><input id="cnombre" v-model="estado.conductor.nombre" class="campo" maxlength="150" data-test="registro-conductor-nombre" /></div>
          <div><label class="etiqueta" for="cdoc">Documento del conductor</label><input id="cdoc" v-model="estado.conductor.documento" class="campo" maxlength="30" inputmode="numeric" data-test="registro-conductor-documento" /></div>
          <label v-if="!estado.sugerencia || !estado.sugerencia.vehiculo_externo" class="flex items-center gap-3 min-h-tactil">
            <input v-model="estado.guardarEnCatalogo" type="checkbox" class="w-6 h-6" data-test="registro-catalogo" />
            Guardar esta placa para la próxima vez
          </label>
        </template>
      </section>

      <section v-else-if="paso === 'motivo'" class="space-y-3" data-test="paso-motivo">
        <p class="etiqueta">Motivo</p>
        <button
          v-for="m in motivos" :key="m.id" type="button" class="btn w-full justify-start border-2"
          :class="estado.motivoId === m.id ? 'bg-primary-700 text-white border-primary-700' : 'bg-white border-gray-300'"
          :data-test="`registro-motivo-${m.id}`" @click="estado.motivoId = m.id"
        >{{ m.nombre }}</button>
        <button v-if="motivosError" type="button" class="btn-secundario w-full" data-test="registro-motivos-reintentar" @click="cargarMotivos">Reintentar</button>
      </section>

      <section v-else-if="paso === 'referencia'" class="space-y-3" data-test="paso-referencia">
        <p v-if="estado.referencia.etiqueta" class="tarjeta">Elegida: {{ estado.referencia.etiqueta }}</p>
        <template v-if="motivo.tipo_referencia === 'ASISTENCIA'">
          <p class="etiqueta">Asistencia</p>
          <ListaBuscable
            :buscar="buscarAsistencia" :etiqueta="(a) => `${a.codigo} · ${a.nombre_ser_querido}`" :clave="(a) => a.id"
            :seleccionado="estado.referencia.asistenciaId" placeholder="Código, ser querido o contrato" inmediata @elegir="elegirAsistencia"
          />
        </template>
        <template v-else-if="motivo.tipo_referencia === 'EXEQUIA'">
          <p class="etiqueta">Exequia</p>
          <ListaBuscable
            :buscar="buscarExequia" :etiqueta="etiquetaExequia" :clave="(x) => x.id"
            :seleccionado="estado.referencia.exequiaId" placeholder="Código o ser querido" inmediata @elegir="elegirExequia"
          />
        </template>
        <template v-else>
          <label class="etiqueta" for="reftexto">Referencia</label>
          <input id="reftexto" v-model="estado.referencia.texto" class="campo" maxlength="255" data-test="registro-referencia-texto" />
        </template>
      </section>

      <section v-else-if="paso === 'detalles'" class="space-y-3" data-test="paso-detalles">
        <div v-if="esPropio">
          <label class="etiqueta" for="km">Kilometraje (opcional)</label>
          <input id="km" v-model="estado.kilometraje" class="campo" inputmode="numeric" data-test="registro-km" />
        </div>
        <div>
          <label class="etiqueta" for="obs">Observaciones (opcional)</label>
          <textarea id="obs" v-model="estado.observaciones" rows="3" class="campo py-2" maxlength="500" data-test="registro-observaciones" />
        </div>
      </section>

      <section v-else-if="paso === 'confirmar'" class="tarjeta space-y-1" data-test="paso-confirmar">
        <p class="text-xl font-bold">{{ estado.sentido === 'INGRESO' ? 'Ingreso' : 'Salida' }} · {{ estado.placa }}</p>
        <p>Conductor: {{ estado.conductor.nombre || estado.conductor.usuario }}</p>
        <p v-if="!esPropio">Empresa: {{ estado.empresa }}</p>
        <p>Motivo: {{ motivo ? motivo.nombre : '' }}</p>
        <p v-if="motivo && motivo.tipo_referencia !== 'NINGUNA' && (estado.referencia.etiqueta || estado.referencia.texto)">Referencia: {{ estado.referencia.etiqueta || estado.referencia.texto }}</p>
        <p v-if="estado.kilometraje">Kilometraje: {{ estado.kilometraje }}</p>
        <p v-if="estado.observaciones">Observaciones: {{ estado.observaciones }}</p>
      </section>

      <p v-if="errorVisible" class="aviso-error" data-test="registro-error">{{ errorVisible }}</p>

      <div class="grid grid-cols-2 gap-3 pt-2">
        <button type="button" class="btn-secundario" data-test="registro-atras" :disabled="enviando" @click="atras">Atrás</button>
        <button type="button" class="btn-primario" :disabled="enviando" data-test="registro-siguiente" @click="siguiente">
          {{ paso === 'confirmar' ? (enviando ? 'Registrando…' : 'Registrar') : 'Siguiente' }}
        </button>
      </div>
    </div>

    <DialogoInconsistencia
      v-if="inconsistencia" :mensaje="inconsistencia.mensaje" :detalle="inconsistencia.detalle" :observacion-inicial="estado.observaciones"
      @registrar-igual="registrarIgual" @cancelar="inconsistencia = null"
    />
  </MarcoGuarda>
</template>
