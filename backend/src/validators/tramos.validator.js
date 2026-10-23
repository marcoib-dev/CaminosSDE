import { z } from 'zod';
import {
  coordenadaSchema,
  estadoTramoSchema,
  geometriaLineStringSchema,
  limiteSchema,
  paginaSchema,
  tipoSuperficieSchema,
} from './comun.js';

const caminoIdSchema = z
  .string({ error: 'El camino es obligatorio.' })
  .min(1, { error: 'El camino es obligatorio.' });

const observacionesSchema = z
  .string({ error: 'Las observaciones deben ser texto.' })
  .trim()
  .max(2000, { error: 'Las observaciones no pueden superar los 2000 caracteres.' })
  .nullish();

export const crearTramoSchema = z.object({
  caminoId: caminoIdSchema,
  geometria: geometriaLineStringSchema,
  estado: estadoTramoSchema,
  tipo: tipoSuperficieSchema,
  observaciones: observacionesSchema,
});

export const actualizarTramoSchema = crearTramoSchema
  .partial()
  .refine((datos) => Object.keys(datos).length > 0, {
    error: 'Debe enviar al menos un campo para actualizar.',
  });

export const dividirTramoSchema = z.object({
  desde: coordenadaSchema,
  hasta: coordenadaSchema,
  estado: estadoTramoSchema.optional(),
  tipo: tipoSuperficieSchema.optional(),
  observaciones: observacionesSchema,
});

export const listarTramosQuerySchema = z.object({
  caminoId: z
    .string()
    .trim()
    .min(1, { error: 'El id del camino no puede estar vacío.' })
    .optional(),
  estado: estadoTramoSchema.optional(),
  tipo: tipoSuperficieSchema.optional(),
  departamento: z
    .string()
    .trim()
    .max(150, { error: 'El departamento no puede superar los 150 caracteres.' })
    .optional(),
  pagina: paginaSchema,
  limite: limiteSchema,
});
