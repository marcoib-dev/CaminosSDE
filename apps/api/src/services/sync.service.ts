import {
  caminoCreateSchema,
  fotoCreateSchema,
  lineStringSchema,
  mantenimientoCreateSchema,
  tramoUpdateSchema,
  type OperacionSync,
} from '@sde/shared';
import { z } from 'zod';
import type { Rol } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../core/ApiError.js';
import * as caminos from './caminos.service.js';
import * as tramos from './tramos.service.js';
import * as mantenimientos from './mantenimientos.service.js';
import * as puntos from './puntos.service.js';
import * as fotos from './fotos.service.js';

const crearTramoSchema = z.object({
  caminoId: z.string().min(1),
  geometria: z.object({
    type: z.literal('LineString'),
    coordinates: z.array(z.tuple([z.number(), z.number()])).min(2),
  }),
  estadoId: z.string().optional(),
  observaciones: z.string().optional().nullable(),
});

const editarTramoSchema = tramoUpdateSchema.extend({ tramoId: z.string().min(1) });
const caminoConTramoSchema = caminoCreateSchema.extend({
  tramo: z
    .object({
      geometria: lineStringSchema,
      estadoId: z.string().optional(),
      observaciones: z.string().optional().nullable(),
    })
    .optional(),
});
const fusionarSchema = z.object({ tramoId: z.string().min(1), tramoAdyacenteId: z.string().min(1) });
const dividirSchema = z.object({ tramoId: z.string().min(1), kmCorte: z.number().positive() });
const mantenimientoSchema = mantenimientoCreateSchema.extend({ tramoId: z.string().min(1) });
const puntoSchema = z.object({
  nombre: z.string().min(1),
  categoria: z.string().min(1),
  latitud: z.number(),
  longitud: z.number(),
});

export interface ResultadoOperacion {
  id: string;
  ok: boolean;
  error?: string;
  conflicto?: boolean;
  datos?: unknown;
}

// Prisma exige un JSON puro: convertimos Date y otros valores a su forma serializable.
const aJson = (valor: unknown) => JSON.parse(JSON.stringify(valor)) as never;

async function ejecutar(
  operacion: OperacionSync,
  usuarioId: string | null,
  ip: string | null
): Promise<unknown> {
  switch (operacion.tipo) {
    case 'CREAR_CAMINO': {
      const { tramo, ...datos } = caminoConTramoSchema.parse(operacion.payload);
      const camino = await caminos.crear(datos, { usuarioId, ip });
      if (tramo) {
        try {
          await tramos.crear(camino.id, tramo, { usuarioId, ip });
        } catch (error) {
          // Si falla el tramo inicial, no dejamos un camino vacío ni duplicamos en el reintento.
          await prisma.camino.delete({ where: { id: camino.id } }).catch(() => undefined);
          throw error;
        }
      }
      return camino;
    }
    case 'CREAR_TRAMO': {
      const datos = crearTramoSchema.parse(operacion.payload);
      return tramos.crear(datos.caminoId, datos, { usuarioId, ip });
    }
    case 'EDITAR_TRAMO': {
      const { tramoId, ...datos } = editarTramoSchema.parse(operacion.payload);
      return tramos.actualizar(tramoId, datos, { usuarioId, ip });
    }
    case 'DIVIDIR_TRAMO': {
      const datos = dividirSchema.parse(operacion.payload);
      return tramos.dividir(datos.tramoId, datos.kmCorte, { usuarioId, ip });
    }
    case 'FUSIONAR_TRAMO': {
      const datos = fusionarSchema.parse(operacion.payload);
      return tramos.fusionar(datos.tramoId, datos.tramoAdyacenteId, { usuarioId, ip });
    }
    case 'CREAR_MANTENIMIENTO': {
      const { tramoId, ...datos } = mantenimientoSchema.parse(operacion.payload);
      return mantenimientos.crear(tramoId, datos, { usuarioId, ip });
    }
    case 'CREAR_PUNTO_INTERES':
      return puntos.crear(puntoSchema.parse(operacion.payload), { usuarioId, ip });
    case 'SUBIR_FOTO':
      return fotos.crear(fotoCreateSchema.parse(operacion.payload), { usuarioId, ip });
    default:
      throw new ApiError(400, `Tipo de operación desconocido: ${operacion.tipo}`);
  }
}

type AccionPermiso = 'crear' | 'editar';

const permisoPorTipo: Record<
  OperacionSync['tipo'],
  { capa: string; accion: AccionPermiso }
> = {
  CREAR_CAMINO: { capa: 'CAMINOS', accion: 'crear' },
  CREAR_TRAMO: { capa: 'TRAMOS', accion: 'crear' },
  EDITAR_TRAMO: { capa: 'TRAMOS', accion: 'editar' },
  DIVIDIR_TRAMO: { capa: 'TRAMOS', accion: 'editar' },
  FUSIONAR_TRAMO: { capa: 'TRAMOS', accion: 'editar' },
  CREAR_MANTENIMIENTO: { capa: 'MANTENIMIENTOS', accion: 'crear' },
  CREAR_PUNTO_INTERES: { capa: 'PUNTOS_INTERES', accion: 'crear' },
  SUBIR_FOTO: { capa: 'FOTOS', accion: 'crear' },
};

async function tienePermiso(rol: Rol, capa: string, accion: AccionPermiso) {
  if (rol === 'ADMIN') return true;
  const permiso = await prisma.permisoCapa.findFirst({
    where: { rol, capa: { clave: capa, activa: true } },
  });
  return Boolean(accion === 'crear' ? permiso?.puedeCrear : permiso?.puedeEditar);
}

export async function procesarBatch(
  operaciones: OperacionSync[],
  { usuarioId, ip, rol }: { usuarioId: string | null; ip: string | null; rol: Rol }
): Promise<ResultadoOperacion[]> {
  const resultados: ResultadoOperacion[] = [];

  for (const operacion of operaciones) {
    const existente = await prisma.operacionSync.findUnique({ where: { operacionId: operacion.id } });
    if (existente) {
      const guardado = existente.resultado as { ok: boolean; datos?: unknown; error?: string } | null;
      resultados.push({
        id: operacion.id,
        ok: guardado?.ok ?? true,
        datos: guardado?.datos,
        error: guardado?.error,
      });
      continue;
    }

    try {
      const requerido = permisoPorTipo[operacion.tipo];
      if (!(await tienePermiso(rol, requerido.capa, requerido.accion))) {
        throw new ApiError(403, `Sin permiso para ${operacion.tipo}.`);
      }
      // Crear un camino con su tramo inicial requiere permiso en ambas capas.
      if (operacion.tipo === 'CREAR_CAMINO') {
        const { tramo } = caminoConTramoSchema.parse(operacion.payload);
        if (tramo && !(await tienePermiso(rol, 'TRAMOS', 'crear'))) {
          throw new ApiError(403, 'Sin permiso para crear tramos.');
        }
      }
      const datos = await ejecutar(operacion, usuarioId, ip);
      await prisma.operacionSync.create({
        data: {
          operacionId: operacion.id,
          usuarioId,
          tipo: operacion.tipo,
          resultado: aJson({ ok: true, datos }),
        },
      });
      resultados.push({ id: operacion.id, ok: true, datos });
    } catch (error) {
      const apiError = error instanceof ApiError ? error : null;
      const conflicto = apiError ? [404, 409].includes(apiError.status) : false;
      const mensaje = apiError?.message ?? (error instanceof Error ? error.message : 'Error desconocido.');

      if (conflicto) {
        await prisma.operacionSync.create({
          data: {
            operacionId: operacion.id,
            usuarioId,
            tipo: operacion.tipo,
            resultado: aJson({ ok: false, error: mensaje }),
          },
        });
      }

      resultados.push({ id: operacion.id, ok: false, error: mensaje, conflicto });
    }
  }

  return resultados;
}
