import { z } from 'zod';
import { MAXIMO_TRAMOS } from '../services/importacion/lectura.js';
import {
  estadoTramoSchema,
  geometriaLineStringSchema,
  tipoSuperficieSchema,
} from './comun.js';

export const reglaMapeoEstadoSchema = z.object({
  campo: z
    .string()
    .trim()
    .min(1, { error: 'El nombre del campo no puede estar vacío.' })
    .max(120, { error: 'El nombre del campo no puede superar los 120 caracteres.' })
    .optional(),
  valores: z.record(z.string(), estadoTramoSchema).optional(),
  porDefecto: estadoTramoSchema.optional(),
});

export const reglaMapeoTipoSchema = z.object({
  campo: z
    .string()
    .trim()
    .min(1, { error: 'El nombre del campo no puede estar vacío.' })
    .max(120, { error: 'El nombre del campo no puede superar los 120 caracteres.' })
    .optional(),
  valores: z.record(z.string(), tipoSuperficieSchema).optional(),
  porDefecto: tipoSuperficieSchema.optional(),
});

export const mapeoImportacionSchema = z.object({
  estado: reglaMapeoEstadoSchema.optional(),
  tipo: reglaMapeoTipoSchema.optional(),
});

const atributosSchema = z
  .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
  .optional();

export const featureImportadaSchema = z.object({
  id: z.string().max(120).optional(),
  grupo: z.string().trim().max(200).optional(),
  caminoId: z
    .string()
    .trim()
    .min(1, { error: 'El id del camino no puede estar vacío.' })
    .optional(),
  nombre: z
    .string({ error: 'El nombre del camino es obligatorio.' })
    .trim()
    .min(1, { error: 'El nombre del camino es obligatorio.' })
    .max(200, { error: 'El nombre del camino no puede superar los 200 caracteres.' }),
  localidad: z
    .string({ error: 'La localidad es obligatoria.' })
    .trim()
    .min(1, { error: 'La localidad es obligatoria.' })
    .max(150, { error: 'La localidad no puede superar los 150 caracteres.' }),
  departamento: z
    .string({ error: 'El departamento es obligatorio.' })
    .trim()
    .min(1, { error: 'El departamento es obligatorio.' })
    .max(150, { error: 'El departamento no puede superar los 150 caracteres.' }),
  descripcion: z
    .string()
    .trim()
    .max(2000, { error: 'La descripción no puede superar los 2000 caracteres.' })
    .nullish(),
  estado: estadoTramoSchema.optional(),
  tipo: tipoSuperficieSchema.optional(),
  observaciones: z
    .string()
    .trim()
    .max(2000, { error: 'Las observaciones no pueden superar los 2000 caracteres.' })
    .nullish(),
  atributos: atributosSchema,
  geometria: geometriaLineStringSchema,
});

export const confirmarImportacionSchema = z.object({
  features: z
    .array(featureImportadaSchema, { error: 'Tenés que enviar al menos un tramo para importar.' })
    .min(1, { error: 'Tenés que enviar al menos un tramo para importar.' })
    .max(MAXIMO_TRAMOS, {
      error: `No se pueden importar más de ${MAXIMO_TRAMOS} tramos en una sola operación.`,
    }),
  mapeo: mapeoImportacionSchema.optional(),
});
