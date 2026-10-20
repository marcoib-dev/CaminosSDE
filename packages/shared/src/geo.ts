import { z } from 'zod';

export const coordenadaSchema = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);

export const lineStringSchema = z.object({
  type: z.literal('LineString'),
  coordinates: z.array(coordenadaSchema).min(2, 'La línea necesita al menos dos puntos.'),
});

export const pointSchema = z.object({
  type: z.literal('Point'),
  coordinates: coordenadaSchema,
});

export const polygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(coordenadaSchema).min(4)).min(1),
});

export const multiPolygonSchema = z.object({
  type: z.literal('MultiPolygon'),
  coordinates: z.array(z.array(z.array(coordenadaSchema).min(4)).min(1)).min(1),
});

export const geometrySchema = z.union([polygonSchema, multiPolygonSchema]);

export type LineStringGeoJSON = z.infer<typeof lineStringSchema>;
export type PointGeoJSON = z.infer<typeof pointSchema>;
export type GeometryGeoJSON = z.infer<typeof geometrySchema>;

export const bboxSchema = z
  .string()
  .regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/, 'bbox inválido.')
  .transform((valor) => valor.split(',').map(Number) as [number, number, number, number]);
