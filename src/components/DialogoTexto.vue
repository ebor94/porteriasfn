<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  titulo: { type: String, required: true },
  etiqueta: { type: String, required: true },
  valorInicial: { type: [String, Number], default: '' },
  obligatorio: { type: Boolean, default: true },
  numerico: { type: Boolean, default: false }
})
const emit = defineEmits(['aceptar', 'cancelar'])
const valor = ref(String(props.valorInicial ?? ''))
const valido = computed(() => {
  const v = valor.value.trim()
  if (props.numerico) return /^\d{1,7}$/.test(v)
  return !props.obligatorio || v.length > 0
})
</script>

<template>
  <div class="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true">
    <div class="tarjeta w-full max-w-md space-y-4">
      <p class="text-lg font-bold">{{ titulo }}</p>
      <label class="etiqueta" for="dialogo-valor">{{ etiqueta }}</label>
      <input id="dialogo-valor" v-model="valor" class="campo" :inputmode="numerico ? 'numeric' : 'text'" maxlength="255" data-test="dialogo-texto" />
      <div class="grid grid-cols-2 gap-3">
        <button type="button" class="btn-secundario" data-test="dialogo-cancelar" @click="emit('cancelar')">Cancelar</button>
        <button type="button" class="btn-primario" :disabled="!valido" data-test="dialogo-aceptar" @click="emit('aceptar', valor.trim())">Aceptar</button>
      </div>
    </div>
  </div>
</template>
