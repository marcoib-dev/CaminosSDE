import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Prisma 7 ya no lee DATABASE_URL desde schema.prisma ni carga .env solo.
// En Docker la variable la inyecta Compose; en local sale de backend/.env.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node prisma/seed.js',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});
