# Portería — front del guarda

SPA (Vue 3 + Vite) del módulo Portería de Mantix. Se sirve en `/porteria/`.

- Desarrollo: `npm install`, `npm run dev` (proxy de `/api` a `VITE_PROXY_TARGET`, por defecto `http://localhost:3020`).
- Pruebas: `npm test`.
- Producción: `cp .env.production.example .env.production`, `npm ci && npm run build`, copiar `dist/` a `smb://192.9.17.11/www/porteria`.

## Despliegue

1. `cp .env.production.example .env.production`, `npm ci && npm run build`.
2. Copiar el contenido de `dist/` a `smb://192.9.17.11/www/porteria`.
3. El servidor web debe devolver `index.html` para cualquier ruta bajo `/porteria/` (la app usa rutas del historial del navegador). Ejemplo con nginx:

   ```nginx
   location /porteria/ { try_files $uri $uri/ /porteria/index.html; }
   location = /porteria/index.html { add_header Cache-Control "no-cache"; }
   location = /porteria/sw.js { add_header Cache-Control "no-cache"; }
   ```

   `index.html` y `sw.js` deben servirse con `Cache-Control: no-cache` para que las versiones nuevas lleguen a los equipos.
4. HTTPS es obligatorio: sin HTTPS el navegador no registra el service worker ni permite instalar la app.
5. El front debe poder llamar a la API de Mantix: agregar el origen del front a `CORS_ORIGIN` de Mantix, o servir `/api` en el mismo origen con un proxy y dejar `VITE_API_URL=/api`.
