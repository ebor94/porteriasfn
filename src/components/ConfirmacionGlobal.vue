<script setup>
import { ref, watch, nextTick } from 'vue'
import { confirmacion, responder } from '@/composables/confirmar'

const cancelar = ref(null)
const aceptar = ref(null)
let previo = null

// Al abrir el foco entra al diálogo (Cancelar, lo más seguro); al cerrar vuelve a donde estaba.
watch(() => confirmacion.abierta, async (abierta) => {
  if (abierta) {
    previo = document.activeElement
    await nextTick()
    if (cancelar.value) cancelar.value.focus()
  } else {
    const destino = previo
    previo = null
    await nextTick()
    if (destino && typeof destino.focus === 'function' && document.contains(destino)) destino.focus()
  }
})

// Tab no sale del diálogo: se alterna entre sus dos botones.
function atrapar(e) {
  const primero = cancelar.value
  const ultimo = aceptar.value
  if (!primero || !ultimo) return
  if (e.shiftKey && document.activeElement === primero) {
    e.preventDefault()
    ultimo.focus()
  } else if (!e.shiftKey && document.activeElement === ultimo) {
    e.preventDefault()
    primero.focus()
  }
}
</script>

<template>
  <div
    v-if="confirmacion.abierta" class="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-4"
    role="alertdialog" aria-modal="true" aria-labelledby="confirmacion-mensaje" tabindex="-1"
    @keydown.esc="responder(false)" @keydown.tab="atrapar"
  >
    <div class="tarjeta w-full max-w-md space-y-4">
      <p id="confirmacion-mensaje" class="text-lg font-bold" data-test="confirmacion-mensaje">{{ confirmacion.mensaje }}</p>
      <div class="grid grid-cols-2 gap-3">
        <button ref="cancelar" type="button" class="btn-secundario" data-test="confirmacion-cancelar" @click="responder(false)">Cancelar</button>
        <button
          ref="aceptar" type="button" :class="confirmacion.peligro ? 'btn-peligro' : 'btn-primario'"
          data-test="confirmacion-aceptar" @click="responder(true)"
        >{{ confirmacion.aceptar }}</button>
      </div>
    </div>
  </div>
</template>
