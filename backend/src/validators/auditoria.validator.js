import { z } from 'zod';
import { accionAuditoriaSchema } from './comun.js';

export const listarAuditoriaQuerySchema = z.object({
  accion: accionAuditoriaSchema.optional(),
  entidad: z
    .string()
    .trim()
    .max(100, { error: 'La entidad no puede superar los 100 caracteres.' })
    .optional(),
  usuarioId: z
    .string()
    .trim()
    .min(1, { error: 'El id del usuario no puede estar vacío.' })
    .optional(),
  desde: z.coerce.date({ error: 'La fecha desde no es válida.' }).optional(),
  hasta: z.coerce.date({ error: 'La fecha hasta no es válida.' }).optional(),
  limite: z.coerce
    .number({ error: 'El límite debe ser un número.' })
    .int({ error: 'El límite debe ser un número entero.' })
    .min(1, { error: 'El límite mínimo es 1.' })
    .max(500, { error: 'El límite máximo es 500.' })
    .default(100),
});
