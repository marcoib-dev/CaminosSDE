import { z } from 'zod';
import { bboxSchema, TIPOS_INFRAESTRUCTURA } from '@sde/shared';

export const booleano = z.enum(['true', 'false']).transform((valor) => valor === 'true');

export const caminosQuery = z.object({
  bbox: bboxSchema.optional(),
  departamentoId: z.string().optional(),
  tipoViaId: z.string().optional(),
  q: z.string().trim().optional(),
  activo: booleano.optional(),
  zoom: z.coerce.number().int().min(0).max(22).optional(),
});

export const tramosQuery = z.object({
  bbox: bboxSchema.optional(),
  caminoId: z.string().optional(),
  estadoId: z.string().optional(),
  tipoViaId: z.string().optional(),
  departamentoId: z.string().optional(),
  q: z.string().trim().optional(),
  zoom: z.coerce.number().int().min(0).max(22).optional(),
});

export const puntosQuery = z.object({
  bbox: bboxSchema.optional(),
  categoria: z.string().optional(),
});

export const infraestructuraQuery = z.object({
  bbox: bboxSchema.optional(),
  tipo: z.enum(TIPOS_INFRAESTRUCTURA).optional(),
  caminoId: z.string().optional(),
});

export const mantenimientosQuery = z.object({
  desde: z.coerce.date().optional(),
  hasta: z.coerce.date().optional(),
  departamentoId: z.string().optional(),
  tramoId: z.string().optional(),
  anio: z.coerce.number().int().optional(),
});

export const prioridadQuery = z.object({
  limite: z.coerce.number().int().min(1).max(500).optional(),
});

export const reportesQuery = z.object({
  departamentoId: z.string().optional(),
  anio: z.coerce.number().int().optional(),
});
