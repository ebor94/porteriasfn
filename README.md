# Portería — front del guarda

SPA (Vue 3 + Vite) del módulo Portería de Mantix. Se sirve en `/porteria/`.

- Desarrollo: `npm install`, `npm run dev` (proxy de `/api` a `VITE_PROXY_TARGET`, por defecto `http://localhost:3020`).
- Pruebas: `npm test`.
- Producción: `cp .env.production.example .env.production`, `npm ci && npm run build`, copiar `dist/` a `smb://192.9.17.11/www/porteria`.
