<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  buscar: { type: Function, required: true },
  etiqueta: { type: Function, required: true },
  clave: { type: Function, required: true },
  seleccionado: { type: [String, Number, null], default: null },
  placeholder: { type: String, default: 'Buscar…' },
  inmediata: { type: Boolean, default: false }
})
const emit = defineEmits(['elegir'])

const texto = ref('')
const resultados = ref([])
const error = ref('')
let temporizador = null
let ultima = 0

async function ejecutar() {
  const numero = ++ultima
  error.value = ''
  try {
    const items = await props.buscar(texto.value.trim())
    if (numero === ultima) resultados.value = items
  } catch (e) {
    if (numero === ultima) error.value = e.message || 'No se pudo buscar'
  }
}

function alEscribir() {
  clearTimeout(temporizador)
  temporizador = setTimeout(ejecutar, 300)
}

onMounted(() => { if (props.inmediata) ejecutar() })
onBeforeUnmount(() => clearTimeout(temporizador))
</script>

<template>
  <div class="space-y-2">
    <input v-model="texto" class="campo" :placeholder="placeholder" data-test="buscable-texto" @input="alEscribir" />
    <p v-if="error" class="aviso-error">{{ error }}</p>
    <ul class="space-y-2">
      <li v-for="item in resultados" :key="clave(item)">
        <button
          type="button" class="btn w-full justify-start text-left border-2"
          :class="clave(item) === seleccionado ? 'border-primary-600 bg-primary-50' : 'border-gray-200 bg-white'"
          :aria-selected="String(clave(item) === seleccionado)" data-test="buscable-item" @click="emit('elegir', item)"
        >{{ etiqueta(item) }}</button>
      </li>
    </ul>
  </div>
</template>
