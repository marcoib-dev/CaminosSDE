import { z } from 'zod';
import { categoriaPuntoSchema, limiteSchema, paginaSchema } from './comun.js';

const nombreSchema = z
  .string({ error: 'El nombre es obligatorio.' })
  .trim()
  .min(1, { error: 'El nombre es obligatorio.' })
  .max(150, { error: 'El nombre no puede superar los 150 caracteres.' });

export const crearPuntoInteresSchema = z.object({
  nombre: nombreSchema,
  categoria: categoriaPuntoSchema,
  latitud: z
    .number({ error: 'La latitud es obligatoria.' })
    .min(-90, { error: 'La latitud debe estar entre -90 y 90.' })
    .max(90, { error: 'La latitud debe estar entre -90 y 90.' }),
  longitud: z
    .number({ error: 'La longitud es obligatoria.' })
    .min(-180, { error: 'La longitud debe estar entre -180 y 180.' })
    .max(180, { error: 'La longitud debe estar entre -180 y 180.' }),
});

export const actualizarPuntoInteresSchema = crearPuntoInteresSchema
  .partial()
  .refine((datos) => Object.keys(datos).length > 0, {
    error: 'Debe enviar al menos un campo para actualizar.',
  });

export const listarPuntosQuerySchema = z.object({
  categoria: categoriaPuntoSchema.optional(),
  pagina: paginaSchema,
  limite: limiteSchema,
});
