<script setup>
import { ref, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import MarcoAdmin from '@/components/MarcoAdmin.vue'
import FormularioMotivo from '@/components/FormularioMotivo.vue'
import { useMotivosStore } from '@/stores/motivos'
import { useCarga } from '@/composables/carga'
import { confirmar } from '@/composables/confirmar'
import { TIPOS, REFERENCIAS } from '@/admin/motivos'

const motivos = useMotivosStore()
const toast = useToast()
const { cargando, error: errorCarga, ejecutar: cargar } = useCarga(() => motivos.cargar())
const error = ref('')
const edicion = ref(null) // { motivo: null | objeto }
const errorFormulario = ref('')
const guardando = ref(false)
const ocupado = ref(new Set())

onMounted(cargar)

const tiposDe = (m) => TIPOS.filter((t) => m[t.campo]).map((t) => t.texto).join(', ')
const sentidosDe = (m) => [m.aplica_ingreso && 'Ingreso', m.aplica_salida && 'Salida'].filter(Boolean).join(' y ')
const referenciaDe = (m) => {
  const r = REFERENCIAS.find((x) => x.valor === m.tipo_referencia)
  return m.tipo_referencia === 'NINGUNA' ? 'Sin referencia' : `${r ? r.texto : m.tipo_referencia}${m.referencia_obligatoria ? ' (obligatoria)' : ''}`
}

function abrir(motivo) {
  errorFormulario.value = ''
  edicion.value = { motivo }
}

async function guardar(datos) {
  errorFormulario.value = ''
  guardando.value = true
  try {
    const m = edicion.value.motivo
    if (m) await motivos.actualizar(m.id, datos)
    else await motivos.crear(datos)
    toast.success(m ? 'Motivo actualizado' : 'Motivo creado')
    edicion.value = null
  } catch (e) {
    errorFormulario.value = e.message
  } finally {
    guardando.value = false
  }
}

async function enFila(m, accion) {
  if (ocupado.value.has(m.id)) return
  error.value = ''
  ocupado.value = new Set(ocupado.value).add(m.id)
  try {
    await accion()
  } catch (e) {
    error.value = e.message
  } finally {
    const resto = new Set(ocupado.value)
    resto.delete(m.id)
    ocupado.value = resto
  }
}

const alternarActivo = (m) => enFila(m, async () => {
  await motivos.actualizar(m.id, { activo: !m.activo })
  toast.success(m.activo ? 'Motivo inactivado' : 'Motivo activado')
})

async function borrar(m) {
  if (!(await confirmar(`¿Borrar el motivo "${m.nombre}"?`, { aceptar: 'Borrar', peligro: true }))) return
  await enFila(m, async () => {
    await motivos.eliminar(m.id)
    toast.success('Motivo borrado')
  })
}
</script>

<template>
  <MarcoAdmin titulo="Motivos">
    <div class="flex justify-end mb-3">
      <button type="button" class="btn-primario" data-test="motivo-nuevo" @click="abrir(null)">Nuevo motivo</button>
    </div>
    <p v-if="errorCarga || error" class="aviso-error mb-3" role="alert" data-test="motivos-error">{{ errorCarga || error }}</p>
    <button v-if="errorCarga" type="button" class="btn-secundario mb-3" data-test="motivos-reintentar" @click="cargar">Reintentar</button>
    <p v-if="cargando && !motivos.lista.length" class="text-gray-600">Cargando…</p>
    <ul class="space-y-3">
      <li v-for="m in motivos.lista" :key="m.id" class="tarjeta space-y-2" :class="m.activo ? '' : 'opacity-70'" data-test="motivo-fila">
        <div class="flex items-center justify-between gap-2">
          <p class="text-lg font-bold">{{ m.nombre }} <span class="text-sm font-normal text-gray-600">· {{ m.codigo }} · orden {{ m.orden }}</span></p>
          <span class="rounded-lg px-2 py-1 text-sm" :class="m.activo ? 'bg-green-100 text-green-900' : 'bg-gray-200'" data-test="motivo-estado">{{ m.activo ? 'Activo' : 'Inactivo' }}</span>
        </div>
        <p class="text-gray-700">{{ tiposDe(m) }} · {{ sentidosDe(m) }} · {{ referenciaDe(m) }}</p>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn-secundario" data-test="motivo-editar" :disabled="ocupado.has(m.id)" @click="abrir(m)">Editar</button>
          <button type="button" class="btn-secundario" data-test="motivo-activo" :disabled="ocupado.has(m.id)" @click="alternarActivo(m)">{{ m.activo ? 'Inactivar' : 'Activar' }}</button>
          <button v-if="!m.en_uso" type="button" class="btn-peligro" data-test="motivo-borrar" :disabled="ocupado.has(m.id)" @click="borrar(m)">Borrar</button>
        </div>
      </li>
    </ul>
    <FormularioMotivo
      v-if="edicion" :motivo="edicion.motivo" :error="errorFormulario" :guardando="guardando"
      @guardar="guardar" @cancelar="edicion = null"
    />
  </MarcoAdmin>
</template>
