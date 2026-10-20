import { createHash } from 'node:crypto';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { ApiError } from '../core/ApiError.js';
import { registrarAuditoria } from '../core/auditoria.js';
import type { FotoCreateInput } from '@sde/shared';

export function firmarSubida() {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw new ApiError(503, 'Cloudinary no está configurado.');
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = 'caminos-sde';
  const firma = createHash('sha1')
    .update(`folder=${folder}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`)
    .digest('hex');

  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    timestamp,
    folder,
    firma,
    urlSubida: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
  };
}

export async function crear(
  datos: FotoCreateInput,
  { usuarioId, ip }: { usuarioId?: string | null; ip?: string | null }
) {
  const camino = await prisma.camino.findUnique({ where: { id: datos.caminoId } });
  if (!camino) throw new ApiError(404, 'Camino no encontrado.');
  if (datos.tramoId) {
    const tramo = await prisma.tramo.findUnique({
      where: { id: datos.tramoId },
      select: { caminoId: true },
    });
    if (!tramo) throw new ApiError(404, 'Tramo no encontrado.');
    if (tramo.caminoId !== datos.caminoId) {
      throw new ApiError(400, 'El tramo indicado no pertenece al camino.');
    }
  }
  if (datos.mantenimientoId) {
    const mantenimiento = await prisma.mantenimiento.findUnique({
      where: { id: datos.mantenimientoId },
      select: { tramoId: true, tramo: { select: { caminoId: true } } },
    });
    if (!mantenimiento) throw new ApiError(404, 'Mantenimiento no encontrado.');
    if (mantenimiento.tramo.caminoId !== datos.caminoId) {
      throw new ApiError(400, 'El mantenimiento indicado no pertenece al camino.');
    }
    if (datos.tramoId && mantenimiento.tramoId !== datos.tramoId) {
      throw new ApiError(400, 'El mantenimiento indicado no pertenece al tramo.');
    }
  }

  const foto = await prisma.foto.create({
    data: {
      url: datos.url,
      descripcion: datos.descripcion ?? null,
      caminoId: datos.caminoId,
      tramoId: datos.tramoId ?? null,
      mantenimientoId: datos.mantenimientoId ?? null,
    },
  });

  await registrarAuditoria({
    usuarioId,
    accion: 'CREAR',
    entidad: 'Foto',
    entidadId: foto.id,
    detalle: { caminoId: foto.caminoId, tramoId: foto.tramoId },
    ip,
  });
  return foto;
}

export async function eliminar(id: string, { usuarioId, ip }: { usuarioId?: string | null; ip?: string | null }) {
  const foto = await prisma.foto.findUnique({ where: { id } });
  if (!foto) throw new ApiError(404, 'Foto no encontrada.');
  await prisma.foto.delete({ where: { id } });
  await registrarAuditoria({
    usuarioId,
    accion: 'BORRAR',
    entidad: 'Foto',
    entidadId: id,
    detalle: { caminoId: foto.caminoId },
    ip,
  });
}
