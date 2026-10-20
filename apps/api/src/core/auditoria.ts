import type { AccionAuditoria, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';

type Cliente = Pick<typeof prisma, 'auditoria'>;

export async function registrarAuditoria(
  datos: {
    usuarioId?: string | null;
    accion: AccionAuditoria;
    entidad: string;
    entidadId?: string | null;
    detalle?: Prisma.InputJsonValue | null;
    ip?: string | null;
  },
  cliente: Cliente = prisma
) {
  // El campo detalle es JSON: normalizamos Date y otros valores antes de guardarlo.
  const detalle =
    datos.detalle == null
      ? undefined
      : (JSON.parse(JSON.stringify(datos.detalle)) as Prisma.InputJsonValue);
  try {
    await cliente.auditoria.create({
      data: {
        usuarioId: datos.usuarioId ?? null,
        accion: datos.accion,
        entidad: datos.entidad,
        entidadId: datos.entidadId ?? null,
        detalle,
        ip: datos.ip ?? null,
      },
    });
  } catch (error) {
    console.error('No se pudo registrar la auditoría:', error);
  }
}
