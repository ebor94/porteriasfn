<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  mensaje: { type: String, required: true },
  detalle: { type: String, default: '' },
  observacionInicial: { type: String, default: '' }
})
const emit = defineEmits(['registrar-igual', 'cancelar'])
const observacion = ref(props.observacionInicial)
const lista = computed(() => observacion.value.trim().length > 0)
</script>

<template>
  <div class="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true">
    <div class="tarjeta w-full max-w-md space-y-4">
      <p class="text-lg font-bold text-amber-800" data-test="inconsistencia-mensaje">{{ mensaje }}</p>
      <p v-if="detalle" class="text-gray-700" data-test="inconsistencia-detalle">{{ detalle }}</p>
      <div>
        <label class="etiqueta" for="observacion">Observación (obligatoria)</label>
        <textarea id="observacion" v-model="observacion" rows="3" class="campo py-2" maxlength="500" data-test="inconsistencia-observacion" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <button type="button" class="btn-secundario" data-test="inconsistencia-cancelar" @click="emit('cancelar')">Cancelar</button>
        <button type="button" class="btn-primario" :disabled="!lista" data-test="inconsistencia-registrar" @click="emit('registrar-igual', observacion.trim())">
          Registrar igual
        </button>
      </div>
    </div>
  </div>
</template>
