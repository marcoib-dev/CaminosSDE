import { prisma } from '../config/prisma.js';
import { ApiError } from '../core/ApiError.js';
import { asyncHandler } from '../core/asyncHandler.js';
import { contexto } from '../core/context.js';
import { created, ok } from '../core/http.js';
import { registrarAuditoria } from '../core/auditoria.js';
import { usuarioActual } from '../middleware/auth.js';

export const crear = asyncHandler(async (req, res) => {
  if (req.body.caminoId) {
    const camino = await prisma.camino.findUnique({ where: { id: req.body.caminoId } });
    if (!camino) throw new ApiError(404, 'Camino no encontrado.');
  }
  if (req.body.tramoId) {
    const tramo = await prisma.tramo.findUnique({ where: { id: req.body.tramoId }, select: { caminoId: true } });
    if (!tramo) throw new ApiError(404, 'Tramo no encontrado.');
    if (req.body.caminoId && tramo.caminoId !== req.body.caminoId) {
      throw new ApiError(400, 'El tramo indicado no pertenece al camino.');
    }
  }

  const sugerencia = await prisma.sugerencia.create({
    data: {
      texto: req.body.texto,
      contacto: req.body.contacto ?? null,
      caminoId: req.body.caminoId ?? null,
      tramoId: req.body.tramoId ?? null,
    },
  });
  await registrarAuditoria({
    usuarioId: null,
    ip: req.ip ?? null,
    accion: 'CREAR',
    entidad: 'Sugerencia',
    entidadId: sugerencia.id,
    detalle: { caminoId: sugerencia.caminoId, tramoId: sugerencia.tramoId },
  });
  created(res, sugerencia, 'Sugerencia enviada.');
});

export const listar = asyncHandler(async (req, res) => {
  const { estado, caminoId } = req.query as { estado?: string; caminoId?: string };
  ok(
    res,
    await prisma.sugerencia.findMany({
      where: { estado: estado as never, caminoId },
      include: { camino: { select: { id: true, nombre: true } }, tramo: { select: { id: true } } },
      orderBy: { creadoEn: 'desc' },
    })
  );
});

export const actualizar = asyncHandler(async (req, res) => {
  const sugerencia = await prisma.sugerencia.update({
    where: { id: req.params.id },
    data: {
      estado: req.body.estado,
      revisadoPorId: usuarioActual(req).id,
      revisadoEn: new Date(),
    },
  });
  await registrarAuditoria({ ...contexto(req), accion: 'EDITAR', entidad: 'Sugerencia', entidadId: sugerencia.id, detalle: { estado: sugerencia.estado } });
  ok(res, sugerencia);
});
