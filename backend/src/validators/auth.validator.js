import { z } from 'zod';
import { emailSchema } from './comun.js';

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ error: 'La contraseña es obligatoria.' }).min(1, {
    error: 'La contraseña es obligatoria.',
  }),
});

export const cambioPasswordSchema = z.object({
  passwordActual: z.string({ error: 'La contraseña actual es obligatoria.' }).min(1, {
    error: 'La contraseña actual es obligatoria.',
  }),
  passwordNueva: z
    .string({ error: 'La nueva contraseña es obligatoria.' })
    .min(8, { error: 'La nueva contraseña debe tener al menos 8 caracteres.' })
    .max(72, { error: 'La nueva contraseña no puede superar los 72 caracteres.' }),
});
