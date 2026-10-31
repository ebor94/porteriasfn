import { test, expect } from 'vitest'
import { useCarga } from '@/composables/carga'

const diferido = () => {
  let resolver
  let rechazar
  const promesa = new Promise((ok, mal) => { resolver = ok; rechazar = mal })
  return { promesa, resolver, rechazar }
}

test('marca la carga y devuelve el resultado', async () => {
  const d = diferido()
  const { cargando, error, ejecutar } = useCarga(() => d.promesa)
  const p = ejecutar()
  expect(cargando.value).toBe(true)
  d.resolver(5)
  expect(await p).toBe(5)
  expect(cargando.value).toBe(false)
  expect(error.value).toBe('')
})

test('en error deja el mensaje y devuelve undefined', async () => {
  const { error, ejecutar } = useCarga(async () => { throw { message: 'Sin conexión con el servidor' } })
  expect(await ejecutar()).toBeUndefined()
  expect(error.value).toBe('Sin conexión con el servidor')
})

test('descarta la respuesta de una llamada vieja', async () => {
  const vieja = diferido()
  const nueva = diferido()
  const llamadas = [vieja, nueva]
  const { cargando, error, ejecutar } = useCarga(() => llamadas.shift().promesa)
  const p1 = ejecutar()
  const p2 = ejecutar()
  nueva.resolver('nueva')
  expect(await p2).toBe('nueva')
  vieja.rechazar({ message: 'tarde' })
  expect(await p1).toBeUndefined()
  expect(error.value).toBe('')
  expect(cargando.value).toBe(false)
})
