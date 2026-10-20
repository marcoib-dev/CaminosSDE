import { prisma } from '../config/prisma.js';

/**
 * Registra una acción sobre una entidad. Acepta una transacción de Prisma.
 */
export async function registrarAuditoria(
  { usuarioId = null, accion, entidad, entidadId = null, detalle = undefined, ip = null },
  cliente = prisma
) {
  return cliente.auditoria.create({
    data: {
      usuarioId,
      accion,
      entidad,
      entidadId,
      detalle,
      ip,
    },
  });
}
