<script setup>
import { confirmacion, responder } from '@/composables/confirmar'
</script>

<template>
  <div
    v-if="confirmacion.abierta" class="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-4"
    role="alertdialog" aria-modal="true" aria-labelledby="confirmacion-mensaje" @keydown.esc="responder(false)"
  >
    <div class="tarjeta w-full max-w-md space-y-4">
      <p id="confirmacion-mensaje" class="text-lg font-bold" data-test="confirmacion-mensaje">{{ confirmacion.mensaje }}</p>
      <div class="grid grid-cols-2 gap-3">
        <button type="button" class="btn-secundario" data-test="confirmacion-cancelar" @click="responder(false)">Cancelar</button>
        <button
          type="button" :class="confirmacion.peligro ? 'btn-peligro' : 'btn-primario'"
          data-test="confirmacion-aceptar" @click="responder(true)"
        >{{ confirmacion.aceptar }}</button>
      </div>
    </div>
  </div>
</template>
