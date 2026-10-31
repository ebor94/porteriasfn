// Estado de una carga con error y reintento. Si se vuelve a cargar antes de que termine la anterior,
// la respuesta vieja se descarta (ni datos ni error).
import { ref } from 'vue'

export function useCarga(fn) {
  const cargando = ref(false)
  const error = ref('')
  let ultima = 0

  async function ejecutar(...args) {
    const numero = ++ultima
    cargando.value = true
    error.value = ''
    try {
      const resultado = await fn(...args)
      return numero === ultima ? resultado : undefined
    } catch (e) {
      if (numero === ultima) error.value = (e && e.message) || 'Ocurrió un error'
      return undefined
    } finally {
      if (numero === ultima) cargando.value = false
    }
  }

  return { cargando, error, ejecutar }
}
