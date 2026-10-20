import { z } from 'zod';
import { estadoSugerenciaSchema } from './comun.js';

export const crearSugerenciaSchema = z.object({
  texto: z
    .string({ error: 'El texto de la sugerencia es obligatorio.' })
    .trim()
    .min(5, { error: 'El texto debe tener al menos 5 caracteres.' })
    .max(2000, { error: 'El texto no puede superar los 2000 caracteres.' }),
  contacto: z
    .string({ error: 'El contacto debe ser texto.' })
    .trim()
    .max(200, { error: 'El contacto no puede superar los 200 caracteres.' })
    .optional(),
  caminoId: z
    .string()
    .trim()
    .min(1, { error: 'El id del camino no puede estar vacío.' })
    .optional(),
  tramoId: z
    .string()
    .trim()
    .min(1, { error: 'El id del tramo no puede estar vacío.' })
    .optional(),
});

export const actualizarSugerenciaSchema = z.object({
  estado: estadoSugerenciaSchema,
});

export const listarSugerenciasQuerySchema = z.object({
  estado: estadoSugerenciaSchema.optional(),
  caminoId: z
    .string()
    .trim()
    .min(1, { error: 'El id del camino no puede estar vacío.' })
    .optional(),
});
