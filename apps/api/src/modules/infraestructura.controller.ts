import { prisma } from '../config/prisma.js';
import { ApiError } from '../core/ApiError.js';
import { asyncHandler } from '../core/asyncHandler.js';
import { consulta, contexto } from '../core/context.js';
import { created, ok } from '../core/http.js';
import { registrarAuditoria } from '../core/auditoria.js';
import { assertDentroDeProvincia } from '../core/geo.js';
import * as repo from '../repositories/infraestructura.repository.js';

export const listar = asyncHandler(async (req, res) => {
  ok(res, await repo.listarInfraestructura(consulta(req)));
});

export const crear = asyncHandler(async (req, res) => {
  const [lng, lat] = req.body.geom.coordinates;
  assertDentroDeProvincia([[lng, lat]]);
  if (req.body.caminoId) {
    const camino = await prisma.camino.findUnique({ where: { id: req.body.caminoId }, select: { id: true } });
    if (!camino) throw new ApiError(400, 'El camino indicado no existe.');
  }
  const infra = await repo.crearInfraestructura({
    tipo: req.body.tipo,
    lng,
    lat,
    descripcion: req.body.descripcion ?? null,
    caminoId: req.body.caminoId ?? null,
  });
  await registrarAuditoria({ ...contexto(req), accion: 'CREAR', entidad: 'Infraestructura', entidadId: String(infra?.id) });
  created(res, infra, 'Infraestructura creada.');
});

export const actualizar = asyncHandler(async (req, res) => {
  const [lng, lat] = req.body.geom?.coordinates ?? [];
  if (lng !== undefined && lat !== undefined) assertDentroDeProvincia([[lng, lat]]);
  if (req.body.caminoId) {
    const camino = await prisma.camino.findUnique({ where: { id: req.body.caminoId }, select: { id: true } });
    if (!camino) throw new ApiError(400, 'El camino indicado no existe.');
  }
  const infra = await repo.actualizarInfraestructura(req.params.id, {
    tipo: req.body.tipo,
    descripcion: req.body.descripcion,
    caminoId: req.body.caminoId,
    lng,
    lat,
  });
  if (!infra) throw new ApiError(404, 'Infraestructura no encontrada.');
  const actualizada = await prisma.$queryRaw<
    Record<string, unknown>[]
  >`SELECT i.id, i.tipo, i.descripcion, i."caminoId", i."creadoEn", ST_AsGeoJSON(i.geom)::json AS geom
    FROM vialidad."Infraestructura" i WHERE i.id = ${req.params.id}`;
  await registrarAuditoria({ ...contexto(req), accion: 'EDITAR', entidad: 'Infraestructura', entidadId: req.params.id });
  ok(res, actualizada[0]);
});

export const eliminar = asyncHandler(async (req, res) => {
  await repo.eliminarInfraestructura(req.params.id);
  await registrarAuditoria({ ...contexto(req), accion: 'BORRAR', entidad: 'Infraestructura', entidadId: req.params.id });
  res.json({ mensaje: 'Infraestructura eliminada.' });
});
