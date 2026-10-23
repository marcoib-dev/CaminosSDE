import { z } from 'zod';
import { PASSWORD_MAX, PASSWORD_MIN, mensajePasswordDebil } from '../config/seguridad.js';
import { emailSchema } from './comun.js';

export const crearUsuarioSchema = z
  .object({
    nombre: z
      .string({ error: 'El nombre es obligatorio.' })
      .trim()
      .min(1, { error: 'El nombre es obligatorio.' })
      .max(150, { error: 'El nombre no puede superar los 150 caracteres.' }),
    email: emailSchema,
    password: z
      .string({ error: 'La contraseña es obligatoria.' })
      .min(PASSWORD_MIN, {
        error: `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`,
      })
      .max(PASSWORD_MAX, {
        error: `La contraseña no puede superar los ${PASSWORD_MAX} caracteres.`,
      }),
  })
  .superRefine((datos, ctx) => {
    const passwordDebil = mensajePasswordDebil(datos.password, { email: datos.email });
    if (passwordDebil) {
      ctx.addIssue({
        code: 'custom',
        path: ['password'],
        message: passwordDebil,
      });
    }
  });

export const actualizarEstadoUsuarioSchema = z.object({
  activo: z.boolean({ error: 'El campo activo debe ser booleano.' }),
});
