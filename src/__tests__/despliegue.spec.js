// Lo que necesita el front publicado en Apache 2.2 (AppServ) bajo /porteria/.
import { test, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

// Vitest corre desde la raíz del repo (con base '/porteria/', import.meta.url no sirve para ubicar archivos).
const raiz = (ruta) => resolve(process.cwd(), ruta)
const leer = (ruta) => readFileSync(raiz(ruta), 'utf8')

// Ancho y alto de un PNG: bytes 16–23 del encabezado IHDR.
function tamanoPng(ruta) {
  const b = readFileSync(raiz(ruta))
  expect(b.subarray(1, 4).toString()).toBe('PNG')
  return [b.readUInt32BE(16), b.readUInt32BE(20)]
}

test('.htaccess: fallback de SPA en /porteria/ y sin caché para index.html y sw.js', () => {
  const h = leer('public/.htaccess')
  expect(h).toMatch(/RewriteBase \/porteria\//)
  expect(h).toMatch(/RewriteRule \^ index\.html \[L\]/)
  expect(h).toMatch(/<FilesMatch "\^\(index\\\.html\|sw\\\.js\)\$">/)
  expect(h).toMatch(/no-cache/)
  // Apache 2.2: sin directivas de 2.4.
  expect(h).not.toMatch(/^\s*Require\s/m)
})

test('.htaccess: Apache 2.2 no conoce .webp; sin el tipo, nosniff puede impedir que se vea el logo', () => {
  expect(leer('public/.htaccess')).toMatch(/AddType image\/webp \.webp/)
})

test('íconos PNG de 192 y 512 para instalar en Android', () => {
  expect(tamanoPng('public/icono-192.png')).toEqual([192, 192])
  expect(tamanoPng('public/icono-512.png')).toEqual([512, 512])
})

test('el manifest declara los PNG y el service worker los precachea', () => {
  const v = leer('vite.config.js')
  expect(v).toMatch(/src: 'icono-192\.png', sizes: '192x192', type: 'image\/png'/)
  expect(v).toMatch(/src: 'icono-512\.png', sizes: '512x512', type: 'image\/png'/)
  expect(v).toMatch(/globPatterns: \['\*\*\/\*\.\{js,css,html,svg,png,webp\}'\]/)
  expect(existsSync(raiz('public/favicon.svg'))).toBe(true)
  expect(existsSync(raiz('public/logo-olivos.webp'))).toBe(true)
})
