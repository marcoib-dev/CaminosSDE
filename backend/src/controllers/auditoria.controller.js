import { prisma } from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listar = asyncHandler(async (req, res) => {
  const { accion, entidad, usuarioId, desde, hasta, limite } = req.consulta;

  const where = {};
  if (accion) where.accion = accion;
  if (entidad) where.entidad = { equals: entidad, mode: 'insensitive' };
  if (usuarioId) where.usuarioId = usuarioId;
  if (desde || hasta) {
    where.fecha = {};
    if (desde) where.fecha.gte = desde;
    if (hasta) where.fecha.lte = hasta;
  }

  const [datos, total] = await prisma.$transaction([
    prisma.auditoria.findMany({
      where,
      include: { usuario: { select: { id: true, nombre: true, email: true } } },
      orderBy: { fecha: 'desc' },
      take: limite,
    }),
    prisma.auditoria.count({ where }),
  ]);

  res.json({ datos, total });
});
