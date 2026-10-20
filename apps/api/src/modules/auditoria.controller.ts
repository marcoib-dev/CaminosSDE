import { prisma } from '../config/prisma.js';
import { asyncHandler } from '../core/asyncHandler.js';
import { consulta } from '../core/context.js';
import { ok } from '../core/http.js';

export const listar = asyncHandler(async (req, res) => {
  const filtros = consulta<{
    accion?: string;
    entidad?: string;
    usuarioId?: string;
    desde?: Date;
    hasta?: Date;
    limite: number;
  }>(req);

  const where = {
    accion: filtros.accion as never,
    entidad: filtros.entidad,
    usuarioId: filtros.usuarioId,
    fecha: filtros.desde || filtros.hasta ? { gte: filtros.desde, lte: filtros.hasta } : undefined,
  };

  const [datos, total] = await prisma.$transaction([
    prisma.auditoria.findMany({
      where,
      include: { usuario: { select: { id: true, nombre: true, email: true } } },
      orderBy: { fecha: 'desc' },
      take: filtros.limite,
    }),
    prisma.auditoria.count({ where }),
  ]);

  res.json({ datos, total });
});
