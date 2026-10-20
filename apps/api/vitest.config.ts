import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/caminos_rurales_test',
      JWT_SHARED_SECRET: 'secreto-de-prueba-con-mas-de-32-caracteres',
      JWT_EXPIRES_IN: '15m',
      REFRESH_EXPIRES_DAYS: '30',
      FRONTEND_URL: 'http://localhost:3000',
      PRIORIDAD_UMBRAL_KM: '1',
    },
  },
});
