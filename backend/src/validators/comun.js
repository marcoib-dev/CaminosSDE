import { z } from 'zod';

export const ESTADOS_TRAMO = ['TRANSITABLE', 'REGULAR', 'INTRANSITABLE', 'EN_OBRA'];
export const TIPOS_SUPERFICIE = ['TIERRA', 'RIPIO', 'ENRIPIADO_MEJORADO', 'PAVIMENTADO'];
export const ESTADOS_SUGERENCIA = ['PENDIENTE', 'REVISADA', 'DESCARTADA'];
export const ACCIONES_AUDITORIA = ['CREAR', 'EDITAR', 'BORRAR'];

export const estadoTramoSchema = z.enum(ESTADOS_TRAMO, {
  error: `El estado debe ser uno de: ${ESTADOS_TRAMO.join(', ')}.`,
});

export const tipoSuperficieSchema = z.enum(TIPOS_SUPERFICIE, {
  error: `El tipo debe ser uno de: ${TIPOS_SUPERFICIE.join(', ')}.`,
});

export const categoriaPuntoSchema = z
  .string({ error: 'La categoría es obligatoria.' })
  .trim()
  .min(1, { error: 'La categoría es obligatoria.' })
  .max(60, { error: 'La categoría no puede superar los 60 caracteres.' })
  .transform((valor) => valor.toUpperCase())
  .refine((valor) => /^[A-Z0-9_]+$/.test(valor), {
    error: 'La categoría no es válida.',
  });

export const estadoSugerenciaSchema = z.enum(ESTADOS_SUGERENCIA, {
  error: `El estado debe ser uno de: ${ESTADOS_SUGERENCIA.join(', ')}.`,
});

export const accionAuditoriaSchema = z.enum(ACCIONES_AUDITORIA, {
  error: `La acción debe ser una de: ${ACCIONES_AUDITORIA.join(', ')}.`,
});

export const idParamSchema = z.object({
  id: z.string().min(1, { error: 'El id es obligatorio.' }),
});

export const coordenadaSchema = z.tuple(
  [
    z
      .number({ error: 'La longitud debe ser un número.' })
      .min(-180, { error: 'La longitud debe estar entre -180 y 180.' })
      .max(180, { error: 'La longitud debe estar entre -180 y 180.' }),
    z
      .number({ error: 'La latitud debe ser un número.' })
      .min(-90, { error: 'La latitud debe estar entre -90 y 90.' })
      .max(90, { error: 'La latitud debe estar entre -90 y 90.' }),
  ],
  { error: 'Cada coordenada debe ser un par [longitud, latitud].' }
);

export const geometriaLineStringSchema = z
  .object({
    type: z.literal('LineString', { error: 'La geometría debe ser un LineString.' }),
    coordinates: z
      .array(coordenadaSchema, { error: 'Las coordenadas deben ser una lista de puntos.' })
      .min(2, { error: 'La geometría debe tener al menos dos puntos.' }),
  })
  .refine((geometria) => new Set(geometria.coordinates.map((punto) => punto.join(','))).size >= 2, {
    error: 'La geometría debe tener al menos dos puntos distintos.',
  });

export const emailSchema = z
  .string({ error: 'El email es obligatorio.' })
  .trim()
  .toLowerCase()
  .email({ error: 'El email no es válido.' });

export const booleanoQuerySchema = z
  .enum(['true', 'false'], { error: 'El valor debe ser true o false.' })
  .transform((valor) => valor === 'true');

export const paginaSchema = z.coerce
  .number({ error: 'La página debe ser un número.' })
  .int({ error: 'La página debe ser un número entero.' })
  .min(1, { error: 'La página mínima es 1.' })
  .default(1);

export const limiteSchema = z.coerce
  .number({ error: 'El límite debe ser un número.' })
  .int({ error: 'El límite debe ser un número entero.' })
  .min(1, { error: 'El límite mínimo es 1.' })
  .max(500, { error: 'El límite máximo es 500.' })
  .default(100);
