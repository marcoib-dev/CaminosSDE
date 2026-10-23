import { z } from 'zod';
import { booleanoQuerySchema, limiteSchema, paginaSchema } from './comun.js';

const nombreSchema = z
  .string({ error: 'El nombre es obligatorio.' })
  .trim()
  .min(1, { error: 'El nombre es obligatorio.' })
  .max(150, { error: 'El nombre no puede superar los 150 caracteres.' });

const localidadSchema = z
  .string({ error: 'La localidad es obligatoria.' })
  .trim()
  .min(1, { error: 'La localidad es obligatoria.' })
  .max(150, { error: 'La localidad no puede superar los 150 caracteres.' });

const departamentoSchema = z
  .string({ error: 'El departamento es obligatorio.' })
  .trim()
  .min(1, { error: 'El departamento es obligatorio.' })
  .max(150, { error: 'El departamento no puede superar los 150 caracteres.' });

const descripcionSchema = z
  .string({ error: 'La descripción debe ser texto.' })
  .trim()
  .max(2000, { error: 'La descripción no puede superar los 2000 caracteres.' })
  .nullish();

export const crearCaminoSchema = z.object({
  nombre: nombreSchema,
  localidad: localidadSchema,
  departamento: departamentoSchema,
  descripcion: descripcionSchema,
  activo: z.boolean({ error: 'El campo activo debe ser booleano.' }).optional(),
});

export const actualizarCaminoSchema = crearCaminoSchema
  .partial()
  .refine((datos) => Object.keys(datos).length > 0, {
    error: 'Debe enviar al menos un campo para actualizar.',
  });

export const listarCaminosQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(150, { error: 'La búsqueda no puede superar los 150 caracteres.' })
    .optional(),
  departamento: z
    .string()
    .trim()
    .max(150, { error: 'El departamento no puede superar los 150 caracteres.' })
    .optional(),
  activo: booleanoQuerySchema.optional(),
  pagina: paginaSchema,
  limite: limiteSchema,
});
