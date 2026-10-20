import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        fondo: 'rgb(var(--fondo) / <alpha-value>)',
        panel: 'rgb(var(--panel) / <alpha-value>)',
        borde: 'rgb(var(--borde) / <alpha-value>)',
        texto: 'rgb(var(--texto) / <alpha-value>)',
        suave: 'rgb(var(--suave) / <alpha-value>)',
        marca: 'rgb(var(--marca) / <alpha-value>)',
      },
      boxShadow: {
        panel: '0 10px 40px -12px rgba(0,0,0,.35)',
      },
    },
  },
  plugins: [],
};

export default config;
