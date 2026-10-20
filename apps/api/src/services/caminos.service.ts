import { prisma } from '../config/prisma.js';
import { ApiError } from '../core/ApiError.js';
import { assertLineaValida } from '../core/geo.js';
import { registrarAuditoria } from '../core/auditoria.js';
import {
  actualizarGeometriaCamino,
  buscarCamino,
  crearCamino,
  departamentoPorGeometria,
  geometriaEsValida,
  listarCaminos,
  recalcularCamino,
} from '../repositories/caminos.repository.js';
import { listarTramosDeCamino } from '../repositories/tramos.repository.js';
import type { FiltrosCaminos } from '../repositories/caminos.repository.js';

export async function listar(filtros: FiltrosCaminos) {
  return listarCaminos(filtros);
}

export async function obtener(id: string) {
  const camino = await buscarCamino(id);
  if (!camino) throw new ApiError(404, 'Camino no encontrado.');
  const [tramos, fotos] = await Promise.all([
    listarTramosDeCamino(id),
    prisma.foto.findMany({ where: { caminoId: id }, orderBy: { creadoEn: 'desc' } }),
  ]);
  return { ...camino, tramos, fotos };
}

export async function crear(
  datos: {
    nombre: string;
    localidad: string;
    tipoViaId: string;
    departamentoId?: string | null;
    descripcion?: string | null;
    activo?: boolean;
    geom: { type: 'LineString'; coordinates: [number, number][] };
  },
  { usuarioId, ip }: { usuarioId?: string | null; ip?: string | null }
) {
  assertLineaValida(datos.geom.coordinates);
  const geojson = JSON.stringify(datos.geom);

  if (!(await geometriaEsValida(geojson, 'LineString'))) {
    throw new ApiError(400, 'La geometría del camino no es válida.');
  }

  const tipoVia = await prisma.tipoVia.findUnique({ where: { id: datos.tipoViaId, activo: true } });
  if (!tipoVia) throw new ApiError(400, 'El tipo de vía indicado no existe.');

  let departamentoId = datos.departamentoId ?? null;
  if (departamentoId) {
    const existe = await prisma.departamento.findUnique({ where: { id: departamentoId } });
    if (!existe) throw new ApiError(400, 'El departamento indicado no existe.');
  } else {
    departamentoId = await departamentoPorGeometria(geojson);
  }

  const id = await crearCamino({
    nombre: datos.nombre,
    localidad: datos.localidad,
    tipoViaId: datos.tipoViaId,
    departamentoId,
    descripcion: datos.descripcion ?? null,
    activo: datos.activo ?? true,
    geojson,
  });

  await registrarAuditoria({
    usuarioId,
    accion: 'CREAR',
    entidad: 'Camino',
    entidadId: id,
    detalle: { nombre: datos.nombre, localidad: datos.localidad, tipoVia: tipoVia.clave },
    ip,
  });

  return obtener(id);
}

export async function actualizar(
  id: string,
  datos: {
    nombre?: string;
    localidad?: string;
    tipoViaId?: string;
    departamentoId?: string | null;
    descripcion?: string | null;
    activo?: boolean;
    geom?: { type: 'LineString'; coordinates: [number, number][] };
  },
  { usuarioId, ip }: { usuarioId?: string | null; ip?: string | null }
) {
  const actual = await buscarCamino(id);
  if (!actual) throw new ApiError(404, 'Camino no encontrado.');

  if (datos.tipoViaId) {
    const tipoVia = await prisma.tipoVia.findUnique({ where: { id: datos.tipoViaId, activo: true } });
    if (!tipoVia) throw new ApiError(400, 'El tipo de vía indicado no existe.');
  }
  if (datos.departamentoId) {
    const departamento = await prisma.departamento.findUnique({ where: { id: datos.departamentoId } });
    if (!departamento) throw new ApiError(400, 'El departamento indicado no existe.');
  }

  if (datos.geom) {
    assertLineaValida(datos.geom.coordinates);
    const geojson = JSON.stringify(datos.geom);
    if (!(await geometriaEsValida(geojson, 'LineString'))) {
      throw new ApiError(400, 'La geometría del camino no es válida.');
    }
    await actualizarGeometriaCamino(id, geojson);
    if (datos.departamentoId === undefined) {
      const detectado = await departamentoPorGeometria(geojson);
      if (detectado) {
        await prisma.camino.update({ where: { id }, data: { departamentoId: detectado } });
      }
    }
  }

  const { geom: _geom, ...metadata } = datos;
  if (Object.keys(metadata).length > 0) {
    await prisma.camino.update({
      where: { id },
      data: { ...metadata, version: { increment: 1 } },
    });
  }

  await registrarAuditoria({
    usuarioId,
    accion: 'EDITAR',
    entidad: 'Camino',
    entidadId: id,
    detalle: { campos: Object.keys(datos) },
    ip,
  });

  return obtener(id);
}

export async function eliminar(id: string, { usuarioId, ip }: { usuarioId?: string | null; ip?: string | null }) {
  const camino = await buscarCamino(id);
  if (!camino) throw new ApiError(404, 'Camino no encontrado.');

  await prisma.camino.delete({ where: { id } });
  await registrarAuditoria({
    usuarioId,
    accion: 'BORRAR',
    entidad: 'Camino',
    entidadId: id,
    detalle: { nombre: camino.nombre },
    ip,
  });
}

export async function recalcular(id: string) {
  await recalcularCamino(id);
}
