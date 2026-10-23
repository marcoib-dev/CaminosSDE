import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { calcularLongitudKm, dividirGeometria } from '../utils/geojson.js';
import { registrarAuditoria } from './auditoria.service.js';
import { invalidarPrioridades } from './cachePrioridad.js';

const geometriasIguales = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Guarda en HistorialTramo solo si cambió el estado, el tipo o la geometría.
 */
async function guardarHistorial(tx, anterior, nuevo, usuarioId) {
  const cambioEstado = anterior.estado !== nuevo.estado;
  const cambioTipo = anterior.tipo !== nuevo.tipo;
  const cambioGeometria = !geometriasIguales(anterior.geometria, nuevo.geometria);

  if (!cambioEstado && !cambioTipo && !cambioGeometria) return;

  await tx.historialTramo.create({
    data: {
      tramoId: anterior.id,
      usuarioId,
      estadoAnterior: anterior.estado,
      tipoAnterior: anterior.tipo,
      geometriaAnterior: anterior.geometria,
      estadoNuevo: nuevo.estado,
      tipoNuevo: nuevo.tipo,
      geometriaNuevo: nuevo.geometria,
    },
  });
}

async function verificarCamino(tx, caminoId) {
  const camino = await tx.camino.findUnique({ where: { id: caminoId }, select: { id: true } });
  if (!camino) {
    throw new ApiError(404, 'El camino indicado no existe.');
  }
}

export async function crearTramo(datos, { usuarioId = null, ip = null } = {}) {
  await verificarCamino(prisma, datos.caminoId);

  const longitudKm = calcularLongitudKm(datos.geometria);
  const tramo = await prisma.tramo.create({
    data: { ...datos, longitudKm },
  });

  await registrarAuditoria({
    usuarioId,
    accion: 'CREAR',
    entidad: 'Tramo',
    entidadId: tramo.id,
    detalle: {
      caminoId: tramo.caminoId,
      estado: tramo.estado,
      tipo: tramo.tipo,
      longitudKm: tramo.longitudKm,
    },
    ip,
  });

  invalidarPrioridades();
  return tramo;
}

export async function actualizarTramo(id, datos, { usuarioId = null, ip = null } = {}) {
  return prisma.$transaction(async (tx) => {
    const anterior = await tx.tramo.findUnique({ where: { id } });
    if (!anterior) {
      throw new ApiError(404, 'Tramo no encontrado.');
    }

    if (datos.caminoId && datos.caminoId !== anterior.caminoId) {
      await verificarCamino(tx, datos.caminoId);
    }

    const longitudKm = datos.geometria
      ? calcularLongitudKm(datos.geometria)
      : anterior.longitudKm;

    const actualizado = await tx.tramo.update({
      where: { id },
      data: { ...datos, longitudKm },
    });

    await guardarHistorial(tx, anterior, actualizado, usuarioId);

    await registrarAuditoria(
      {
        usuarioId,
        accion: 'EDITAR',
        entidad: 'Tramo',
        entidadId: id,
        detalle: {
          campos: Object.keys(datos),
          caminoAnterior: anterior.caminoId,
          caminoNuevo: actualizado.caminoId,
        },
        ip,
      },
      tx
    );

    invalidarPrioridades();
    return actualizado;
  });
}

export async function eliminarTramo(id, { usuarioId = null, ip = null } = {}) {
  return prisma.$transaction(async (tx) => {
    const tramo = await tx.tramo.findUnique({ where: { id } });
    if (!tramo) {
      throw new ApiError(404, 'Tramo no encontrado.');
    }

    await tx.tramo.delete({ where: { id } });

    await registrarAuditoria(
      {
        usuarioId,
        accion: 'BORRAR',
        entidad: 'Tramo',
        entidadId: id,
        detalle: {
          caminoId: tramo.caminoId,
          estado: tramo.estado,
          tipo: tramo.tipo,
          longitudKm: tramo.longitudKm,
        },
        ip,
      },
      tx
    );

    invalidarPrioridades();
  });
}

/**
 * Divide un tramo en hasta tres segmentos. El estado y el tipo nuevos
 * se aplican únicamente al segmento central; los extremos conservan
 * los valores originales.
 */
export async function dividirTramo(id, datos, { usuarioId = null, ip = null } = {}) {
  return prisma.$transaction(async (tx) => {
    const original = await tx.tramo.findUnique({ where: { id } });
    if (!original) {
      throw new ApiError(404, 'Tramo no encontrado.');
    }

    const { primero, medio, ultimo } = dividirGeometria(
      original.geometria,
      datos.desde,
      datos.hasta
    );

    const estadoMedio = datos.estado ?? original.estado;
    const tipoMedio = datos.tipo ?? original.tipo;
    const observacionesMedio =
      datos.observaciones !== undefined ? datos.observaciones : original.observaciones;

    const segmentos = [];

    if (primero) {
      const inicial = await tx.tramo.update({
        where: { id },
        data: {
          geometria: primero,
          longitudKm: calcularLongitudKm(primero),
        },
      });
      await guardarHistorial(tx, original, inicial, usuarioId);
      segmentos.push(inicial);

      const central = await tx.tramo.create({
        data: {
          caminoId: original.caminoId,
          geometria: medio,
          longitudKm: calcularLongitudKm(medio),
          estado: estadoMedio,
          tipo: tipoMedio,
          observaciones: observacionesMedio,
        },
      });
      segmentos.push(central);
      await registrarAuditoria(
        {
          usuarioId,
          accion: 'CREAR',
          entidad: 'Tramo',
          entidadId: central.id,
          detalle: { divisionDe: original.id, segmento: 'central' },
          ip,
        },
        tx
      );

      if (ultimo) {
        const final = await tx.tramo.create({
          data: {
            caminoId: original.caminoId,
            geometria: ultimo,
            longitudKm: calcularLongitudKm(ultimo),
            estado: original.estado,
            tipo: original.tipo,
            observaciones: original.observaciones,
          },
        });
        segmentos.push(final);
        await registrarAuditoria(
          {
            usuarioId,
            accion: 'CREAR',
            entidad: 'Tramo',
            entidadId: final.id,
            detalle: { divisionDe: original.id, segmento: 'final' },
            ip,
          },
          tx
        );
      }
    } else {
      // El punto de inicio coincide con el comienzo: el tramo original pasa a ser el central.
      const central = await tx.tramo.update({
        where: { id },
        data: {
          geometria: medio,
          longitudKm: calcularLongitudKm(medio),
          estado: estadoMedio,
          tipo: tipoMedio,
          observaciones: observacionesMedio,
        },
      });
      await guardarHistorial(tx, original, central, usuarioId);
      segmentos.push(central);

      if (ultimo) {
        const final = await tx.tramo.create({
          data: {
            caminoId: original.caminoId,
            geometria: ultimo,
            longitudKm: calcularLongitudKm(ultimo),
            estado: original.estado,
            tipo: original.tipo,
            observaciones: original.observaciones,
          },
        });
        segmentos.push(final);
        await registrarAuditoria(
          {
            usuarioId,
            accion: 'CREAR',
            entidad: 'Tramo',
            entidadId: final.id,
            detalle: { divisionDe: original.id, segmento: 'final' },
            ip,
          },
          tx
        );
      }
    }

    await registrarAuditoria(
      {
        usuarioId,
        accion: 'EDITAR',
        entidad: 'Tramo',
        entidadId: original.id,
        detalle: {
          division: true,
          desde: datos.desde,
          hasta: datos.hasta,
          cantidadSegmentos: segmentos.length,
        },
        ip,
      },
      tx
    );

    invalidarPrioridades();
    return segmentos;
  });
}
