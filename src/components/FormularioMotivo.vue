<script setup>
import { reactive, ref, watch } from 'vue'
import { formularioMotivo, validarMotivo, datosMotivo, TIPOS, SENTIDOS, REFERENCIAS } from '@/admin/motivos'

const props = defineProps({
  motivo: { type: Object, default: null },
  // Mensaje del servidor al guardar (lo pasa la vista).
  error: { type: String, default: '' },
  guardando: { type: Boolean, default: false }
})
const emit = defineEmits(['guardar', 'cancelar'])
const nuevo = !props.motivo
const f = reactive(formularioMotivo(props.motivo))
const local = ref('')

// Sin referencia no hay nada que exigir: la casilla queda desmarcada (y deshabilitada).
watch(() => f.tipo_referencia, (tipo) => {
  if (tipo === 'NINGUNA') f.referencia_obligatoria = false
})

function guardar() {
  local.value = validarMotivo(f, nuevo) || ''
  if (local.value) return
  const datos = datosMotivo(f, props.motivo)
  if (!datos) {
    emit('cancelar')
    return
  }
  emit('guardar', datos)
}
</script>

<template>
  <div class="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" data-test="motivo-formulario">
    <div class="tarjeta w-full max-w-lg space-y-3 max-h-[90vh] overflow-y-auto">
      <p class="text-lg font-bold">{{ nuevo ? 'Nuevo motivo' : `Editar ${motivo.codigo}` }}</p>
      <div v-if="nuevo">
        <label class="etiqueta" for="m-codigo">Código</label>
        <input id="m-codigo" v-model="f.codigo" class="campo uppercase" maxlength="40" data-test="motivo-codigo" />
      </div>
      <div>
        <label class="etiqueta" for="m-nombre">Nombre</label>
        <input id="m-nombre" v-model="f.nombre" class="campo" maxlength="100" data-test="motivo-nombre" />
      </div>
      <div>
        <label class="etiqueta" for="m-desc">Descripción (opcional)</label>
        <input id="m-desc" v-model="f.descripcion" class="campo" maxlength="255" data-test="motivo-descripcion" />
      </div>
      <fieldset>
        <legend class="etiqueta">Aplica a</legend>
        <label v-for="t in TIPOS" :key="t.campo" class="flex items-center gap-3 min-h-tactil">
          <input v-model="f[t.campo]" type="checkbox" class="w-6 h-6" :data-test="`motivo-${t.campo}`" /> {{ t.texto }}
        </label>
      </fieldset>
      <fieldset>
        <legend class="etiqueta">Sentido</legend>
        <label v-for="s in SENTIDOS" :key="s.campo" class="flex items-center gap-3 min-h-tactil">
          <input v-model="f[s.campo]" type="checkbox" class="w-6 h-6" :data-test="`motivo-${s.campo}`" /> {{ s.texto }}
        </label>
      </fieldset>
      <div>
        <label class="etiqueta" for="m-ref">Referencia</label>
        <select id="m-ref" v-model="f.tipo_referencia" class="campo" data-test="motivo-tipo_referencia">
          <option v-for="r in REFERENCIAS" :key="r.valor" :value="r.valor">{{ r.texto }}</option>
        </select>
      </div>
      <label class="flex items-center gap-3 min-h-tactil">
        <input v-model="f.referencia_obligatoria" type="checkbox" class="w-6 h-6" :disabled="f.tipo_referencia === 'NINGUNA'" data-test="motivo-referencia_obligatoria" />
        La referencia es obligatoria
      </label>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="etiqueta" for="m-orden">Orden</label>
          <input id="m-orden" v-model="f.orden" class="campo" inputmode="numeric" data-test="motivo-orden" />
        </div>
        <label class="flex items-center gap-3 min-h-tactil self-end">
          <input v-model="f.activo" type="checkbox" class="w-6 h-6" data-test="motivo-activo-form" /> Activo
        </label>
      </div>
      <p v-if="local || error" class="aviso-error" role="alert" data-test="motivo-form-error">{{ local || error }}</p>
      <div class="grid grid-cols-2 gap-3">
        <button type="button" class="btn-secundario" data-test="motivo-cancelar" @click="emit('cancelar')">Cancelar</button>
        <button type="button" class="btn-primario" :disabled="guardando" data-test="motivo-guardar" @click="guardar">{{ guardando ? 'Guardando…' : 'Guardar' }}</button>
      </div>
    </div>
  </div>
</template>
