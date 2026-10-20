import { prisma } from '../config/prisma.js';
import { registrarAuditoria } from '../services/auditoria.service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const crear = asyncHandler(async (req, res) => {
  const { texto, contacto, caminoId, tramoId } = req.body;

  let caminoFinal = caminoId ?? null;

  if (tramoId) {
    const tramo = await prisma.tramo.findUnique({
      where: { id: tramoId },
      select: { id: true, caminoId: true },
    });

    if (!tramo) {
      throw new ApiError(404, 'El tramo indicado no existe.');
    }

    if (caminoFinal && caminoFinal !== tramo.caminoId) {
      throw new ApiError(400, 'El tramo no pertenece al camino indicado.');
    }

    caminoFinal = tramo.caminoId;
  } else if (caminoFinal) {
    const camino = await prisma.camino.findUnique({
      where: { id: caminoFinal },
      select: { id: true },
    });

    if (!camino) {
      throw new ApiError(404, 'El camino indicado no existe.');
    }
  }

  const sugerencia = await prisma.sugerencia.create({
    data: {
      texto,
      contacto: contacto ?? null,
      caminoId: caminoFinal,
      tramoId: tramoId ?? null,
    },
    select: { id: true, estado: true, creadoEn: true },
  });

  await registrarAuditoria({
    usuarioId: null,
    accion: 'CREAR',
    entidad: 'Sugerencia',
    entidadId: sugerencia.id,
    detalle: { caminoId: caminoFinal, tramoId: tramoId ?? null, origen: 'público' },
    ip: req.ip,
  });

  res.status(201).json({
    datos: sugerencia,
    mensaje: 'Sugerencia recibida. Gracias por colaborar.',
  });
});

export const listar = asyncHandler(async (req, res) => {
  const { estado, caminoId } = req.consulta;

  const where = {};
  if (estado) where.estado = estado;
  if (caminoId) where.caminoId = caminoId;

  const sugerencias = await prisma.sugerencia.findMany({
    where,
    include: {
      camino: { select: { id: true, nombre: true } },
      tramo: { select: { id: true, estado: true, tipo: true } },
      revisadoPor: { select: { id: true, nombre: true } },
    },
    orderBy: { creadoEn: 'desc' },
  });

  res.json({ datos: sugerencias });
});

export const actualizar = asyncHandler(async (req, res) => {
  const { estado } = req.body;

  const anterior = await prisma.sugerencia.findUnique({
    where: { id: req.params.id },
    select: { id: true, estado: true },
  });

  if (!anterior) {
    throw new ApiError(404, 'Sugerencia no encontrada.');
  }

  const sugerencia = await prisma.sugerencia.update({
    where: { id: req.params.id },
    data: {
      estado,
      revisadoPorId: estado === 'PENDIENTE' ? null : req.usuario.id,
      revisadoEn: estado === 'PENDIENTE' ? null : new Date(),
    },
  });

  await registrarAuditoria({
    usuarioId: req.usuario.id,
    accion: 'EDITAR',
    entidad: 'Sugerencia',
    entidadId: sugerencia.id,
    detalle: { estadoAnterior: anterior.estado, estadoNuevo: sugerencia.estado },
    ip: req.ip,
  });

  res.json({ datos: sugerencia, mensaje: 'Sugerencia actualizada correctamente.' });
});
