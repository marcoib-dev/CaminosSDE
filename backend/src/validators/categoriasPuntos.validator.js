import { z } from 'zod';

const colorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, { error: 'El color debe tener el formato #RRGGBB.' });

export const crearCategoriaPuntoSchema = z.object({
  nombre: z
    .string({ error: 'El nombre es obligatorio.' })
    .trim()
    .min(1, { error: 'El nombre es obligatorio.' })
    .max(80, { error: 'El nombre no puede superar los 80 caracteres.' }),
  color: colorSchema.optional(),
  inicial: z
    .string()
    .trim()
    .min(1, { error: 'La inicial no puede estar vacía.' })
    .max(2, { error: 'La inicial no puede superar los 2 caracteres.' })
    .optional(),
  peso: z
    .number({ error: 'El peso debe ser un número.' })
    .int({ error: 'El peso debe ser un número entero.' })
    .min(0, { error: 'El peso debe estar entre 0 y 30.' })
    .max(30, { error: 'El peso debe estar entre 0 y 30.' })
    .optional(),
});
