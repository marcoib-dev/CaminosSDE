/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta principal inspirada en el sistema de Recursos Hídricos de SDE:
        // cian/teal para acciones y acentos.
        verde: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          950: '#083344',
        },
        // Superficies claras azuladas y textos.
        arena: {
          50: '#f0f7ff',
          100: '#e6f2fb',
          200: '#c9d9e8',
          300: '#b4cadd',
          400: '#8faec8',
          500: '#6b91b0',
          600: '#527596',
          700: '#405d78',
          800: '#344b61',
          900: '#2b3f52',
          950: '#0f1a24',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        display: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 24px 60px -28px rgba(15, 26, 36, 0.45)',
        tarjeta: '0 1px 2px 0 rgba(15, 26, 36, 0.06), 0 1px 3px 0 rgba(15, 26, 36, 0.1)',
      },
      keyframes: {
        aparecer: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        aparecer: 'aparecer 180ms ease-out both',
      },
    },
  },
  plugins: [],
};
