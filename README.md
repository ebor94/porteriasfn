# Portería — front del guarda

SPA (Vue 3 + Vite) del módulo Portería de Mantix. Se sirve en `/porteria/`.

- Desarrollo: `npm install`, `npm run dev` (proxy de `/api` a `VITE_PROXY_TARGET`, por defecto `http://localhost:3020`).
- Pruebas: `npm test`.
- Producción: `cp .env.production.example .env.production`, `npm ci && npm run build`, copiar `dist/` a `smb://192.9.17.11/AppServ/www/porteria` (ver "Despliegue").

## Despliegue

1. `cp .env.production.example .env.production`, `npm ci && npm run build`.
2. Copiar el contenido de `dist/` a `www/porteria` del share de AppServ (`smb://192.9.17.11/AppServ/www/porteria`). Incluye `.htaccess` (viene de `public/`): no editarlo en el servidor.
3. AppServ es Apache 2.2: el `.htaccess` hace el fallback de la SPA (`/porteria/*` → `index.html`) y sirve `index.html` y `sw.js` sin caché. Necesita `mod_rewrite` y `mod_headers` (están cargados) y que `AllowOverride` permita `FileInfo`, `Options` e `Indexes` para `www/porteria`. Si una ruta profunda recargada da 404, revisar `AllowOverride`.
4. HTTPS es obligatorio: sin HTTPS el navegador no registra el service worker ni permite instalar la app.
5. El front debe poder llamar a la API de Mantix: agregar el origen del front a `CORS_ORIGIN` de Mantix, o servir `/api` en el mismo origen con un proxy y dejar `VITE_API_URL=/api`.
