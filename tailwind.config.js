/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        // Verde Serfunorte (mantix-frontend). Texto blanco solo sobre 700+ (contraste AA).
        primary: {
          50: '#e6f7f1', 100: '#b3e6d4', 200: '#80d5b7', 300: '#4dc49a', 400: '#1ab37d',
          500: '#00875c', 600: '#006d4a', 700: '#005a3d', 800: '#004730', 900: '#003423'
        }
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      // La caseta: dedos con guantes, sol en la pantalla.
      minHeight: { tactil: '56px' },
      minWidth: { tactil: '56px' }
    }
  },
  plugins: []
}
