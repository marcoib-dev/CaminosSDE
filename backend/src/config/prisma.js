import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

const adapter = new PrismaPg({
  connectionString: env.databaseUrl,
  // Mantiene el timeout de conexión que tenía Prisma 6 (5 s); pg usa 0 por defecto.
  connectionTimeoutMillis: 5000,
});

export const prisma = new PrismaClient({ adapter });
