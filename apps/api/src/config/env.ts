import { config } from 'dotenv';
import path from 'node:path';
import { z } from 'zod';

config({ path: process.env.DOTENV_CONFIG_PATH ?? path.resolve(process.cwd(), '../../.env') });
config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1, 'Falta DATABASE_URL.'),
  JWT_SHARED_SECRET: z.string().min(32, 'JWT_SHARED_SECRET debe tener al menos 32 caracteres.'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_EXPIRES_DAYS: z.coerce.number().int().positive().default(30),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  PRIORIDAD_UMBRAL_KM: z.coerce.number().positive().default(1),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Variables de entorno inválidas:', parsed.error.flatten().fieldErrors);
  throw new Error('Configuración inválida. Revisá .env.example.');
}

export const env = parsed.data;
export const origenesPermitidos = env.FRONTEND_URL.split(',')
  .map((origen) => origen.trim())
  .filter(Boolean);
