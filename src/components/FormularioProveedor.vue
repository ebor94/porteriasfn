<script setup>
import { reactive, ref } from 'vue'
import { normalizarPlaca } from '@/utils/placa'

const props = defineProps({
  vehiculo: { type: Object, default: null },
  error: { type: String, default: '' },
  guardando: { type: Boolean, default: false }
})
const emit = defineEmits(['guardar', 'cancelar'])
const TIPOS = [{ valor: 'PROVEEDOR', texto: 'Proveedor' }, { valor: 'PROVEEDOR_ASISTENCIA', texto: 'Proveedor de asistencias' }]
const v = props.vehiculo
const f = reactive({ placa: v ? v.placa : '', tipo: v ? v.tipo : '', empresa: v ? v.empresa : '', descripcion: (v && v.descripcion) || '' })
const local = ref('')

function guardar() {
  const datos = { tipo: f.tipo, empresa: f.empresa.trim(), descripcion: f.descripcion.trim() || null }
  if ((!v && !normalizarPlaca(f.placa)) || !datos.tipo || !datos.empresa) {
    local.value = 'Escribe la placa, el tipo y la empresa'
    return
  }
  local.value = ''
  if (!v) return emit('guardar', { placa: normalizarPlaca(f.placa), ...datos })
  const cambios = Object.fromEntries(Object.entries(datos).filter(([c, valor]) => valor !== (v[c] ?? null)))
  if (Object.keys(cambios).length === 0) return emit('cancelar')
  emit('guardar', cambios)
}
</script>

<template>
  <div class="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" data-test="proveedor-formulario">
    <div class="tarjeta w-full max-w-md space-y-3">
      <p class="text-lg font-bold">{{ v ? `Editar ${v.placa}` : 'Agregar vehículo de proveedor' }}</p>
      <div>
        <label class="etiqueta" for="p-placa">Placa</label>
        <input id="p-placa" v-model="f.placa" class="campo uppercase tracking-widest" maxlength="20" :disabled="Boolean(v)" data-test="proveedor-placa" />
      </div>
      <div>
        <label class="etiqueta" for="p-tipo">Tipo</label>
        <select id="p-tipo" v-model="f.tipo" class="campo" data-test="proveedor-tipo">
          <option value="" disabled>Elige el tipo</option>
          <option v-for="t in TIPOS" :key="t.valor" :value="t.valor">{{ t.texto }}</option>
        </select>
      </div>
      <div>
        <label class="etiqueta" for="p-empresa">Empresa</label>
        <input id="p-empresa" v-model="f.empresa" class="campo" maxlength="150" data-test="proveedor-empresa" />
      </div>
      <div>
        <label class="etiqueta" for="p-desc">Descripción (opcional)</label>
        <input id="p-desc" v-model="f.descripcion" class="campo" maxlength="255" data-test="proveedor-descripcion" />
      </div>
      <p v-if="local || error" class="aviso-error" role="alert" data-test="proveedor-form-error">{{ local || error }}</p>
      <div class="grid grid-cols-2 gap-3">
        <button type="button" class="btn-secundario" data-test="proveedor-cancelar" @click="emit('cancelar')">Cancelar</button>
        <button type="button" class="btn-primario" :disabled="guardando" data-test="proveedor-guardar" @click="guardar">{{ guardando ? 'Guardando…' : 'Guardar' }}</button>
      </div>
    </div>
  </div>
</template>
