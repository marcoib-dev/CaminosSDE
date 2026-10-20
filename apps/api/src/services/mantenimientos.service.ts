import { prisma } from '../config/prisma.js';
import { ApiError } from '../core/ApiError.js';
import { registrarAuditoria } from '../core/auditoria.js';
import type { MantenimientoCreateInput } from '@sde/shared';

export async function crear(
  tramoId: string,
  datos: MantenimientoCreateInput,
  { usuarioId, ip }: { usuarioId?: string | null; ip?: string | null }
) {
  const tramo = await prisma.tramo.findUnique({ where: { id: tramoId }, include: { camino: true } });
  if (!tramo) throw new ApiError(404, 'Tramo no encontrado.');

  const mantenimiento = await prisma.mantenimiento.create({
    data: {
      tramoId,
      tipo: datos.tipo,
      descripcion: datos.descripcion ?? null,
      fecha: datos.fecha,
      costo: datos.costo ?? null,
      usuarioId: usuarioId ?? null,
    },
    include: { usuario: { select: { id: true, nombre: true, email: true } } },
  });

  await registrarAuditoria({
    usuarioId,
    accion: 'CREAR',
    entidad: 'Mantenimiento',
    entidadId: mantenimiento.id,
    detalle: { tramoId, tipo: datos.tipo, fecha: datos.fecha, costo: datos.costo ?? null },
    ip,
  });

  return mantenimiento;
}

export async function listar(filtros: {
  desde?: Date;
  hasta?: Date;
  departamentoId?: string;
  tramoId?: string;
  anio?: number;
}) {
  return prisma.mantenimiento.findMany({
    where: {
      tramoId: filtros.tramoId,
      fecha:
        filtros.desde || filtros.hasta
          ? { gte: filtros.desde, lte: filtros.hasta }
          : filtros.anio
            ? {
                gte: new Date(Date.UTC(filtros.anio, 0, 1)),
                lt: new Date(Date.UTC(filtros.anio + 1, 0, 1)),
              }
            : undefined,
      tramo: filtros.departamentoId
        ? { camino: { departamentoId: filtros.departamentoId } }
        : undefined,
    },
    include: {
      usuario: { select: { id: true, nombre: true, email: true } },
      tramo: { include: { camino: { select: { id: true, nombre: true, localidad: true } } } },
    },
    orderBy: { fecha: 'desc' },
  });
}

export async function eliminar(id: string, { usuarioId, ip }: { usuarioId?: string | null; ip?: string | null }) {
  const mantenimiento = await prisma.mantenimiento.findUnique({ where: { id } });
  if (!mantenimiento) throw new ApiError(404, 'Mantenimiento no encontrado.');
  await prisma.mantenimiento.delete({ where: { id } });
  await registrarAuditoria({
    usuarioId,
    accion: 'BORRAR',
    entidad: 'Mantenimiento',
    entidadId: id,
    detalle: { tramoId: mantenimiento.tramoId },
    ip,
  });
}
