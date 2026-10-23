import { z } from 'zod';
import { PASSWORD_MAX, PASSWORD_MIN, mensajePasswordDebil } from '../config/seguridad.js';
import { emailSchema } from './comun.js';

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ error: 'La contraseña es obligatoria.' }).min(1, {
    error: 'La contraseña es obligatoria.',
  }),
});

export const cambioPasswordSchema = z
  .object({
    passwordActual: z.string({ error: 'La contraseña actual es obligatoria.' }).min(1, {
      error: 'La contraseña actual es obligatoria.',
    }),
    passwordNueva: z
      .string({ error: 'La nueva contraseña es obligatoria.' })
      .min(PASSWORD_MIN, {
        error: `La nueva contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`,
      })
      .max(PASSWORD_MAX, {
        error: `La nueva contraseña no puede superar los ${PASSWORD_MAX} caracteres.`,
      }),
  })
  .superRefine((datos, ctx) => {
    if (datos.passwordNueva === datos.passwordActual) {
      ctx.addIssue({
        code: 'custom',
        path: ['passwordNueva'],
        message: 'La nueva contraseña no puede ser igual a la actual.',
      });
      return;
    }

    const passwordDebil = mensajePasswordDebil(datos.passwordNueva);
    if (passwordDebil) {
      ctx.addIssue({
        code: 'custom',
        path: ['passwordNueva'],
        message: passwordDebil,
      });
    }
  });
