import { z } from 'zod';
import {
  ACCIONES_AUDITORIA,
  ESTADOS_SUGERENCIA,
  ROLES,
  TIPOS_INFRAESTRUCTURA,
  TIPOS_MANTENIMIENTO,
} from './enums.js';
import { geometrySchema, lineStringSchema, pointSchema } from './geo.js';

export const idSchema = z.string().min(1);
export const colorHexSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'El color debe tener el formato #rrggbb.');

export const loginSchema = z.object({
  email: z.string().email('Email inválido.'),
  password: z.string().min(1, 'La contraseña es obligatoria.'),
});

export const changePasswordSchema = z.object({
  passwordActual: z.string().min(1),
  passwordNueva: z.string().min(8, 'La contraseña nueva debe tener al menos 8 caracteres.'),
});

export const crearUsuarioSchema = z.object({
  nombre: z.string().trim().min(2, 'El nombre es obligatorio.'),
  email: z.string().email('Email inválido.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
  rol: z.enum(ROLES).default('EDITOR'),
});

export const cambiarEstadoUsuarioSchema = z.object({ activo: z.boolean() });

export const caminoCreateSchema = z.object({
  nombre: z.string().trim().min(2, 'El nombre es obligatorio.'),
  localidad: z.string().trim().min(1, 'La localidad es obligatoria.'),
  departamentoId: idSchema.optional().nullable(),
  tipoViaId: idSchema,
  descripcion: z.string().trim().max(2000).optional().nullable(),
  activo: z.boolean().optional(),
  geom: lineStringSchema,
});

export const caminoUpdateSchema = caminoCreateSchema.partial();

export const tramoCreateSchema = z.object({
  geometria: lineStringSchema,
  estadoId: idSchema.optional(),
  observaciones: z.string().trim().max(2000).optional().nullable(),
});

export const tramoUpdateSchema = z.object({
  geometria: lineStringSchema.optional(),
  estadoId: idSchema.optional(),
  observaciones: z.string().trim().max(2000).optional().nullable(),
});

export const dividirTramoSchema = z.object({
  kmCorte: z.number().positive('El km de corte debe ser mayor a 0.'),
});

export const fusionarTramoSchema = z.object({ tramoAdyacenteId: idSchema });

export const mantenimientoCreateSchema = z.object({
  tipo: z.enum(TIPOS_MANTENIMIENTO),
  descripcion: z.string().trim().max(2000).optional().nullable(),
  fecha: z.coerce.date(),
  costo: z.number().min(0).optional().nullable(),
});

export const fotoCreateSchema = z.object({
  url: z.string().url('La URL de la foto no es válida.'),
  descripcion: z.string().trim().max(500).optional().nullable(),
  caminoId: idSchema,
  tramoId: idSchema.optional().nullable(),
  mantenimientoId: idSchema.optional().nullable(),
});

export const infraestructuraCreateSchema = z.object({
  tipo: z.enum(TIPOS_INFRAESTRUCTURA),
  geom: pointSchema,
  caminoId: idSchema.optional().nullable(),
  descripcion: z.string().trim().max(500).optional().nullable(),
});

export const infraestructuraUpdateSchema = infraestructuraCreateSchema.partial();

export const sugerenciaCreateSchema = z.object({
  texto: z.string().trim().min(5, 'La sugerencia es demasiado corta.').max(2000),
  contacto: z.string().trim().max(200).optional().nullable(),
  caminoId: idSchema.optional().nullable(),
  tramoId: idSchema.optional().nullable(),
});

export const sugerenciaUpdateSchema = z.object({ estado: z.enum(ESTADOS_SUGERENCIA) });

export const tipoViaCreateSchema = z.object({
  nombre: z.string().trim().min(2),
  descripcion: z.string().trim().max(500).optional().nullable(),
  orden: z.number().int().min(0).optional(),
});

export const tipoViaUpdateSchema = tipoViaCreateSchema.partial().extend({
  activo: z.boolean().optional(),
});

export const estadoTramoCreateSchema = z.object({
  nombre: z.string().trim().min(2),
  colorHex: colorHexSchema,
  orden: z.number().int().min(0).optional(),
});

export const estadoTramoUpdateSchema = estadoTramoCreateSchema.partial().extend({
  activo: z.boolean().optional(),
});

export const departamentoCreateSchema = z.object({
  nombre: z.string().trim().min(2),
  codigoIndec: z.string().trim().optional().nullable(),
  geom: geometrySchema.optional().nullable(),
});

export const capaCreateSchema = z.object({
  clave: z.string().trim().min(2).regex(/^[A-Z0-9_]+$/),
  nombre: z.string().trim().min(2),
  organismo: z.string().trim().min(2),
  activa: z.boolean().optional(),
});

export const capaUpdateSchema = capaCreateSchema.partial().omit({ clave: true });
export const departamentoUpdateSchema = departamentoCreateSchema.partial();

export const permisoCapaSchema = z.object({
  rol: z.enum(ROLES),
  capaId: idSchema,
  puedeVer: z.boolean().default(true),
  puedeCrear: z.boolean().default(false),
  puedeEditar: z.boolean().default(false),
  puedeBorrar: z.boolean().default(false),
});


export const importarFeatureSchema = z.object({
  nombre: z.string().trim().min(2, 'El nombre es obligatorio.'),
  localidad: z.string().trim().min(1, 'La localidad es obligatoria.'),
  tipoViaId: idSchema,
  departamentoId: idSchema.optional().nullable(),
  estadoId: idSchema.optional(),
  observaciones: z.string().trim().max(2000).optional().nullable(),
  caminoId: idSchema.optional().nullable(),
  geometria: lineStringSchema,
});

export const importarConfirmarSchema = z.object({
  features: z.array(importarFeatureSchema).min(1, 'Seleccioná al menos una geometría.').max(500),
});

export const operacionSyncSchema = z.object({
  id: z.string().min(8, 'Cada operación necesita un id de idempotencia.'),
  tipo: z.enum([
    'CREAR_CAMINO',
    'CREAR_TRAMO',
    'EDITAR_TRAMO',
    'DIVIDIR_TRAMO',
    'FUSIONAR_TRAMO',
    'CREAR_MANTENIMIENTO',
    'CREAR_PUNTO_INTERES',
    'SUBIR_FOTO',
  ]),
  payload: z.record(z.unknown()),
});

export const syncBatchSchema = z.object({
  operaciones: z.array(operacionSyncSchema).min(1).max(500),
});

export const auditoriaQuerySchema = z.object({
  accion: z.enum(ACCIONES_AUDITORIA).optional(),
  entidad: z.string().optional(),
  usuarioId: idSchema.optional(),
  desde: z.coerce.date().optional(),
  hasta: z.coerce.date().optional(),
  limite: z.coerce.number().int().min(1).max(500).default(100),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CaminoCreateInput = z.infer<typeof caminoCreateSchema>;
export type CaminoUpdateInput = z.infer<typeof caminoUpdateSchema>;
export type TramoCreateInput = z.infer<typeof tramoCreateSchema>;
export type TramoUpdateInput = z.infer<typeof tramoUpdateSchema>;
export type MantenimientoCreateInput = z.infer<typeof mantenimientoCreateSchema>;
export type FotoCreateInput = z.infer<typeof fotoCreateSchema>;
export type InfraestructuraCreateInput = z.infer<typeof infraestructuraCreateSchema>;
export type SugerenciaCreateInput = z.infer<typeof sugerenciaCreateSchema>;
export type OperacionSync = z.infer<typeof operacionSyncSchema>;
export type ImportarFeatureInput = z.infer<typeof importarFeatureSchema>;
export type ImportarConfirmarInput = z.infer<typeof importarConfirmarSchema>;
