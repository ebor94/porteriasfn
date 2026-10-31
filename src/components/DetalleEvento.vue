<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useToast } from 'vue-toastification'
import ListaBuscable from '@/components/ListaBuscable.vue'
import DialogoTexto from '@/components/DialogoTexto.vue'
import { useAuthStore } from '@/stores/auth'
import { useCatalogosStore } from '@/stores/catalogos'
import { useConsultaStore } from '@/stores/consulta'
import { fechaHora } from '@/utils/fechas'
import { formularioCorreccion, validarCorreccion, cambiosCorreccion } from '@/admin/correccion'

const props = defineProps({ evento: { type: Object, required: true } })
const emit = defineEmits(['cerrar'])

const auth = useAuthStore()
const catalogos = useCatalogosStore()
const consulta = useConsultaStore()
const toast = useToast()
const editando = ref(false)
const anulando = ref(false)
const guardando = ref(false)
const error = ref('')
const motivos = ref([])
const motivosCargados = ref(false)
const f = reactive(formularioCorreccion(props.evento))
const esPropio = computed(() => props.evento.tipo_vehiculo === 'PROPIO')
const motivo = computed(() => motivos.value.find((m) => m.id === f.motivoId) || null)
const TIPO = { PROPIO: 'Propio', PROVEEDOR_ASISTENCIA: 'Proveedor de asistencias', PROVEEDOR: 'Proveedor' }
const INCONSISTENCIA = { INGRESO_ESTANDO_DENTRO: 'Ingreso estando dentro', SALIDA_ESTANDO_FUERA: 'Salida estando fuera', SALIDA_OTRA_SEDE: 'Salida por otra sede' }

// Si el evento cambia (otra fila, o el servidor devolvió una versión nueva), el formulario parte de él.
watch(() => props.evento, (e) => Object.assign(f, formularioCorreccion(e)))

async function abrirCorreccion() {
  error.value = ''
  editando.value = true
  motivosCargados.value = false
  try {
    const lista = await catalogos.motivos(props.evento.tipo_vehiculo, props.evento.sentido)
    // El motivo actual puede estar inactivo o ya no aplicar a este vehículo: se ofrece igual para no perderlo.
    const actual = props.evento.motivo
    motivos.value = lista.some((m) => m.id === props.evento.motivo_id) || !actual
      ? lista
      : [{ id: props.evento.motivo_id, nombre: `${actual.nombre} (ya no aplica)`, tipo_referencia: 'NINGUNA', referencia_obligatoria: false }, ...lista]
    motivosCargados.value = true
  } catch (e) {
    error.value = e.message
  }
}

function elegirMotivo(id) {
  f.motivoId = Number(id)
  // Volver al motivo del evento recupera su referencia, para no enviarla vacía sin querer.
  f.referencia = f.motivoId === props.evento.motivo_id
    ? formularioCorreccion(props.evento).referencia
    : { asistenciaId: null, exequiaId: null, texto: '', etiqueta: '' }
}

const buscarConductor = async (q) => {
  const lista = await catalogos.conductores()
  const t = q.toLowerCase()
  const tiene = (x) => String(x ?? '').toLowerCase().includes(t)
  return t ? lista.filter((c) => tiene(c.nombre) || tiene(c.usuario)) : lista
}
const buscarAsistencia = (q) => catalogos.asistencias(q || undefined)
const buscarExequia = (q) => catalogos.exequias({ q: q || undefined, placa: props.evento.placa })

function cancelarCorreccion() {
  editando.value = false
  error.value = ''
  Object.assign(f, formularioCorreccion(props.evento))
}

async function guardar() {
  error.value = validarCorreccion(f, props.evento, motivo.value) || ''
  if (error.value) return
  const cambios = cambiosCorreccion(f, props.evento, motivo.value)
  if (!cambios) {
    editando.value = false
    return
  }
  guardando.value = true
  try {
    await consulta.corregir(props.evento.id, cambios)
    toast.success(`Registro de ${props.evento.placa} corregido`)
    editando.value = false
  } catch (e) {
    error.value = e.message
    // Otro cambio se guardó antes: se trae la versión actual para no pisarla.
    if (e.status === 409 || e.motivo === 'SIN_CONEXION') await consulta.recargar(props.evento.id).catch(() => {})
  } finally {
    guardando.value = false
  }
}

async function anular(motivoAnulacion) {
  anulando.value = false
  error.value = ''
  guardando.value = true
  try {
    await consulta.anular(props.evento.id, motivoAnulacion)
    toast.success(`Registro de ${props.evento.placa} anulado`)
  } catch (e) {
    error.value = e.message
    if (e.status === 409 || e.motivo === 'SIN_CONEXION') await consulta.recargar(props.evento.id).catch(() => {})
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <div class="fixed inset-0 z-40 bg-black/50 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" data-test="detalle-evento">
    <div class="tarjeta w-full max-w-2xl space-y-3 max-h-[90vh] overflow-y-auto">
      <div class="flex items-start justify-between gap-2">
        <p class="text-xl font-bold">
          {{ evento.sentido === 'INGRESO' ? 'Ingreso' : 'Salida' }} · <span class="tracking-wider">{{ evento.placa }}</span>
        </p>
        <button type="button" class="btn-secundario" data-test="detalle-cerrar" @click="emit('cerrar')">Cerrar</button>
      </div>
      <dl class="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1">
        <dt class="font-semibold">Fecha</dt><dd>{{ fechaHora(evento.registrado_at) }}</dd>
        <dt class="font-semibold">Sede</dt><dd>{{ auth.nombreSede(evento.sede_id) }}</dd>
        <dt class="font-semibold">Tipo</dt><dd>{{ TIPO[evento.tipo_vehiculo] || evento.tipo_vehiculo }}</dd>
        <dt class="font-semibold">Motivo</dt><dd>{{ evento.motivo ? evento.motivo.nombre : '' }}</dd>
        <template v-if="evento.referencia || evento.referencia_texto">
          <dt class="font-semibold">Referencia</dt>
          <dd>{{ evento.referencia ? [evento.referencia.codigo, evento.referencia.nombre_ser_querido].filter(Boolean).join(' · ') : evento.referencia_texto }}</dd>
        </template>
        <dt class="font-semibold">Conductor</dt><dd>{{ evento.conductor_nombre }}{{ evento.conductor_otro ? ' (otro)' : '' }}{{ evento.conductor_documento ? ` · ${evento.conductor_documento}` : '' }}</dd>
        <template v-if="evento.empresa"><dt class="font-semibold">Empresa</dt><dd>{{ evento.empresa }}</dd></template>
        <template v-if="evento.kilometraje !== null && evento.kilometraje !== undefined"><dt class="font-semibold">Kilometraje</dt><dd>{{ evento.kilometraje }}</dd></template>
        <template v-if="evento.inconsistente"><dt class="font-semibold">Inconsistencia</dt><dd>{{ INCONSISTENCIA[evento.inconsistencia_tipo] || 'Sí' }}</dd></template>
        <template v-if="evento.observaciones"><dt class="font-semibold">Observaciones</dt><dd>{{ evento.observaciones }}</dd></template>
        <dt class="font-semibold">Registró</dt><dd>{{ evento.registrado_por }}</dd>
        <template v-if="evento.corregido_por"><dt class="font-semibold">Corrigió</dt><dd>{{ evento.corregido_por }} · {{ fechaHora(evento.corregido_at) }}</dd></template>
        <template v-if="evento.anulado"><dt class="font-semibold">Anulado</dt><dd>{{ evento.anulado_por }} · {{ evento.anulado_motivo }}</dd></template>
      </dl>

      <p v-if="error" class="aviso-error" role="alert" data-test="detalle-error">{{ error }}</p>

      <div v-if="!evento.anulado && !editando" class="grid grid-cols-2 gap-3">
        <button type="button" class="btn-secundario" :disabled="guardando" data-test="detalle-corregir" @click="abrirCorreccion">Corregir</button>
        <button type="button" class="btn-peligro" :disabled="guardando" data-test="detalle-anular" @click="anulando = true">Anular</button>
      </div>

      <section v-if="editando && !evento.anulado" class="space-y-3 border-t pt-3" data-test="detalle-correccion">
        <div>
          <label class="etiqueta" for="c-motivo">Motivo</label>
          <select id="c-motivo" :value="String(f.motivoId)" class="campo" data-test="correccion-motivo" @change="elegirMotivo($event.target.value)">
            <option v-for="m in motivos" :key="m.id" :value="String(m.id)">{{ m.nombre }}</option>
          </select>
        </div>
        <template v-if="motivo && motivo.tipo_referencia === 'ASISTENCIA'">
          <p v-if="f.referencia.etiqueta" class="text-gray-700">Elegida: {{ f.referencia.etiqueta }}</p>
          <ListaBuscable
            :buscar="buscarAsistencia" :etiqueta="(a) => `${a.codigo} · ${a.nombre_ser_querido}`" :clave="(a) => a.id"
            :seleccionado="f.referencia.asistenciaId" placeholder="Asistencia"
            @elegir="(a) => (f.referencia = { asistenciaId: a.id, exequiaId: null, texto: '', etiqueta: `${a.codigo} · ${a.nombre_ser_querido}` })"
          />
        </template>
        <template v-else-if="motivo && motivo.tipo_referencia === 'EXEQUIA'">
          <p v-if="f.referencia.etiqueta" class="text-gray-700">Elegida: {{ f.referencia.etiqueta }}</p>
          <ListaBuscable
            :buscar="buscarExequia" :etiqueta="(x) => `${x.asistencia_codigo} · ${x.nombre_ser_querido} · ${x.fecha}`" :clave="(x) => x.id"
            :seleccionado="f.referencia.exequiaId" placeholder="Exequia"
            @elegir="(x) => (f.referencia = { asistenciaId: null, exequiaId: x.id, texto: '', etiqueta: `${x.asistencia_codigo} · ${x.nombre_ser_querido}` })"
          />
        </template>
        <div v-else-if="motivo && motivo.tipo_referencia === 'TEXTO'">
          <label class="etiqueta" for="c-ref">Referencia</label>
          <input id="c-ref" v-model="f.referencia.texto" class="campo" maxlength="255" data-test="correccion-referencia" />
        </div>

        <template v-if="esPropio">
          <p class="etiqueta">Conductor</p>
          <template v-if="f.conductor.modo === 'ad'">
            <ListaBuscable
              :buscar="buscarConductor" :etiqueta="(c) => c.nombre" :clave="(c) => c.usuario" :seleccionado="f.conductor.usuario"
              placeholder="Buscar conductor" inmediata
              @elegir="(c) => (f.conductor = { modo: 'ad', usuario: c.usuario, nombre: c.nombre, documento: '' })"
            />
            <button type="button" class="btn-secundario w-full" data-test="correccion-conductor-otro" @click="f.conductor = { modo: 'otro', usuario: null, nombre: '', documento: '' }">Otro (no está en la lista)</button>
          </template>
          <template v-else>
            <input v-model="f.conductor.nombre" class="campo" maxlength="150" placeholder="Nombre del conductor" data-test="correccion-conductor-nombre" />
            <input v-model="f.conductor.documento" class="campo" maxlength="30" placeholder="Documento (opcional)" data-test="correccion-conductor-documento" />
            <button type="button" class="btn-secundario w-full" @click="f.conductor = { modo: 'ad', usuario: null, nombre: '', documento: '' }">Elegir de la lista</button>
          </template>
          <div>
            <label class="etiqueta" for="c-km">Kilometraje</label>
            <input id="c-km" v-model="f.kilometraje" class="campo" inputmode="numeric" data-test="correccion-km" />
          </div>
        </template>
        <template v-else>
          <div><label class="etiqueta" for="c-empresa">Empresa</label><input id="c-empresa" v-model="f.empresa" class="campo" maxlength="150" data-test="correccion-empresa" /></div>
          <div><label class="etiqueta" for="c-cnombre">Nombre del conductor</label><input id="c-cnombre" v-model="f.conductor.nombre" class="campo" maxlength="150" data-test="correccion-conductor-nombre" /></div>
          <div><label class="etiqueta" for="c-cdoc">Documento del conductor</label><input id="c-cdoc" v-model="f.conductor.documento" class="campo" maxlength="30" data-test="correccion-conductor-documento" /></div>
        </template>
        <div>
          <label class="etiqueta" for="c-obs">Observaciones</label>
          <textarea id="c-obs" v-model="f.observaciones" rows="3" class="campo py-2" maxlength="500" data-test="correccion-observaciones" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <button type="button" class="btn-secundario" :disabled="guardando" data-test="correccion-cancelar" @click="cancelarCorreccion">Cancelar</button>
          <button type="button" class="btn-primario" :disabled="guardando || !motivosCargados" data-test="correccion-guardar" @click="guardar">{{ guardando ? 'Guardando…' : 'Guardar' }}</button>
        </div>
      </section>
    </div>
    <DialogoTexto
      v-if="anulando" :titulo="`Anular registro de ${evento.placa}`" etiqueta="Motivo de la anulación"
      @aceptar="anular" @cancelar="anulando = false"
    />
  </div>
</template>
