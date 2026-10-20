import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../core/ApiError.js';
import { assertLineaValida } from '../core/geo.js';
import { registrarAuditoria } from '../core/auditoria.js';
import {
  actualizarTramo,
  buscarTramo,
  crearTramo,
  dividirTramo,
  fusionarTramos,
  geometriaDeTramo,
  historialTramo,
  listarTramos,
  listarTramosDeCamino,
} from '../repositories/tramos.repository.js';
import type { FiltrosTramos } from '../repositories/tramos.repository.js';
import { geometriaEsValida, recalcularCamino } from '../repositories/caminos.repository.js';

async function estadoPorDefecto() {
  const estado = await prisma.estadoTramo.findFirst({ where: { clave: 'TRANSITABLE' } });
  if (!estado) throw new ApiError(500, 'No hay estados de tramo configurados.');
  return estado.id;
}

async function validarEstado(estadoId: string) {
  const estado = await prisma.estadoTramo.findUnique({ where: { id: estadoId, activo: true } });
  if (!estado) throw new ApiError(400, 'El estado indicado no existe.');
}

async function registrarHistorial(
  tx: Prisma.TransactionClient,
  datos: {
    tramoId: string;
    usuarioId?: string | null;
    estadoAnteriorId: string;
    estadoNuevoId: string;
    geometriaAnterior: unknown;
    geometriaNuevo: unknown;
  }
) {
  await tx.historialTramo.create({
    data: {
      tramoId: datos.tramoId,
      usuarioId: datos.usuarioId ?? null,
      estadoAnteriorId: datos.estadoAnteriorId,
      estadoNuevoId: datos.estadoNuevoId,
      geometriaAnterior: datos.geometriaAnterior as never,
      geometriaNuevo: datos.geometriaNuevo as never,
    },
  });
}

export async function listar(filtros: FiltrosTramos) {
  return listarTramos(filtros);
}

export async function listarDeCamino(caminoId: string) {
  return listarTramosDeCamino(caminoId);
}

export async function crear(
  caminoId: string,
  datos: {
    geometria: { type: 'LineString'; coordinates: [number, number][] };
    estadoId?: string;
    observaciones?: string | null;
  },
  { usuarioId, ip }: { usuarioId?: string | null; ip?: string | null }
) {
  const camino = await prisma.camino.findUnique({ where: { id: caminoId } });
  if (!camino) throw new ApiError(404, 'Camino no encontrado.');

  assertLineaValida(datos.geometria.coordinates);
  const estadoId = datos.estadoId ?? (await estadoPorDefecto());
  if (datos.estadoId) await validarEstado(datos.estadoId);

  const geojson = JSON.stringify(datos.geometria);
  if (!(await geometriaEsValida(geojson, 'LineString'))) {
    throw new ApiError(400, 'La geometría del tramo no es válida.');
  }

  const id = await prisma.$transaction(async (tx) => {
    const nuevoId = await crearTramo(tx, {
      caminoId,
      geojson,
      estadoId,
      observaciones: datos.observaciones ?? null,
    });
    await recalcularCamino(caminoId, tx);
    return nuevoId;
  });

  await registrarAuditoria({
    usuarioId,
    accion: 'CREAR',
    entidad: 'Tramo',
    entidadId: id,
    detalle: { caminoId, estadoId },
    ip,
  });

  return buscarTramo(id);
}

export async function actualizar(
  id: string,
  datos: {
    geometria?: { type: 'LineString'; coordinates: [number, number][] };
    estadoId?: string;
    observaciones?: string | null;
  },
  { usuarioId, ip }: { usuarioId?: string | null; ip?: string | null }
) {
  const anterior = await buscarTramo(id);
  if (!anterior) throw new ApiError(404, 'Tramo no encontrado.');
  if (datos.estadoId) await validarEstado(datos.estadoId);
  if (datos.geometria) assertLineaValida(datos.geometria.coordinates);

  const geojson = datos.geometria ? JSON.stringify(datos.geometria) : undefined;
  const cambiaGeometria = Boolean(geojson);
  if (geojson && !(await geometriaEsValida(geojson, 'LineString'))) {
    throw new ApiError(400, 'La geometría del tramo no es válida.');
  }

  await prisma.$transaction(async (tx) => {
    await actualizarTramo(tx, id, { ...datos, geojson });
    await recalcularCamino(anterior.caminoId, tx);

    const estadoNuevoId = datos.estadoId ?? anterior.estadoId;
    const geometriaNuevo = datos.geometria ?? anterior.geometria;
    if (estadoNuevoId !== anterior.estadoId || cambiaGeometria) {
      await registrarHistorial(tx, {
        tramoId: id,
        usuarioId,
        estadoAnteriorId: anterior.estadoId,
        estadoNuevoId,
        geometriaAnterior: anterior.geometria,
        geometriaNuevo,
      });
    }
  });

  await registrarAuditoria({
    usuarioId,
    accion: 'EDITAR',
    entidad: 'Tramo',
    entidadId: id,
    detalle: { campos: Object.keys(datos) },
    ip,
  });

  return buscarTramo(id);
}

export async function dividir(
  id: string,
  kmCorte: number,
  { usuarioId, ip }: { usuarioId?: string | null; ip?: string | null }
) {
  const anterior = await buscarTramo(id);
  if (!anterior) throw new ApiError(404, 'Tramo no encontrado.');
  if (kmCorte <= 0 || kmCorte >= anterior.longitudKm) {
    throw new ApiError(400, `El km de corte debe estar entre 0 y ${anterior.longitudKm.toFixed(3)}.`);
  }

  const fraccion = kmCorte / anterior.longitudKm;
  const nuevoId = randomUUID();

  await prisma.$transaction(async (tx) => {
    await dividirTramo(tx, id, fraccion, nuevoId);
    await registrarHistorial(tx, {
      tramoId: id,
      usuarioId,
      estadoAnteriorId: anterior.estadoId,
      estadoNuevoId: anterior.estadoId,
      geometriaAnterior: anterior.geometria,
      geometriaNuevo: (await geometriaDeTramo(tx, id))?.geometria,
    });
    await recalcularCamino(anterior.caminoId, tx);
  });

  await registrarAuditoria({
    usuarioId,
    accion: 'EDITAR',
    entidad: 'Tramo',
    entidadId: id,
    detalle: { accion: 'DIVIDIR', kmCorte, nuevoTramoId: nuevoId },
    ip,
  });
  await registrarAuditoria({
    usuarioId,
    accion: 'CREAR',
    entidad: 'Tramo',
    entidadId: nuevoId,
    detalle: { accion: 'DIVISION', tramoOrigenId: id },
    ip,
  });

  return [await buscarTramo(id), await buscarTramo(nuevoId)].filter(Boolean);
}

export async function fusionar(
  id: string,
  tramoAdyacenteId: string,
  { usuarioId, ip }: { usuarioId?: string | null; ip?: string | null }
) {
  if (id === tramoAdyacenteId) throw new ApiError(400, 'Elegí otro tramo para fusionar.');
  const anterior = await buscarTramo(id);
  const adyacente = await buscarTramo(tramoAdyacenteId);
  if (!anterior || !adyacente) throw new ApiError(404, 'Tramo no encontrado.');
  if (anterior.caminoId !== adyacente.caminoId) {
    throw new ApiError(400, 'Solo se pueden fusionar tramos del mismo camino.');
  }
  if (anterior.estadoId !== adyacente.estadoId) {
    throw new ApiError(400, 'Solo se pueden fusionar tramos con el mismo estado.');
  }

  try {
    await prisma.$transaction(async (tx) => {
      const { caminoId } = await fusionarTramos(tx, id, tramoAdyacenteId);
      await registrarHistorial(tx, {
        tramoId: id,
        usuarioId,
        estadoAnteriorId: anterior.estadoId,
        estadoNuevoId: anterior.estadoId,
        geometriaAnterior: anterior.geometria,
        geometriaNuevo: (await geometriaDeTramo(tx, id))?.geometria,
      });
      await recalcularCamino(caminoId, tx);
    });
  } catch (error) {
    if (error instanceof Error) throw new ApiError(400, error.message);
    throw error;
  }

  await registrarAuditoria({
    usuarioId,
    accion: 'EDITAR',
    entidad: 'Tramo',
    entidadId: id,
    detalle: { accion: 'FUSIONAR', tramoEliminadoId: tramoAdyacenteId },
    ip,
  });

  return buscarTramo(id);
}

export async function historial(id: string) {
  const tramo = await prisma.tramo.findUnique({ where: { id }, select: { id: true } });
  if (!tramo) throw new ApiError(404, 'Tramo no encontrado.');
  return historialTramo(id);
}

export async function eliminar(id: string, { usuarioId, ip }: { usuarioId?: string | null; ip?: string | null }) {
  const tramo = await buscarTramo(id);
  if (!tramo) throw new ApiError(404, 'Tramo no encontrado.');

  await prisma.$transaction(async (tx) => {
    await tx.tramo.delete({ where: { id } });
    await recalcularCamino(tramo.caminoId, tx);
  });

  await registrarAuditoria({
    usuarioId,
    accion: 'BORRAR',
    entidad: 'Tramo',
    entidadId: id,
    detalle: { caminoId: tramo.caminoId },
    ip,
  });
}
