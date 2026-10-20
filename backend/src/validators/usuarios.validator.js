import { z } from 'zod';
import { emailSchema } from './comun.js';

export const crearUsuarioSchema = z.object({
  nombre: z
    .string({ error: 'El nombre es obligatorio.' })
    .trim()
    .min(1, { error: 'El nombre es obligatorio.' })
    .max(150, { error: 'El nombre no puede superar los 150 caracteres.' }),
  email: emailSchema,
  password: z
    .string({ error: 'La contraseña es obligatoria.' })
    .min(8, { error: 'La contraseña debe tener al menos 8 caracteres.' })
    .max(72, { error: 'La contraseña no puede superar los 72 caracteres.' }),
});

export const actualizarEstadoUsuarioSchema = z.object({
  activo: z.boolean({ error: 'El campo activo debe ser booleano.' }),
});
