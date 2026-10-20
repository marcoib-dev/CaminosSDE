import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { registrarAuditoria } from '../services/auditoria.service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const CARPETA_FOTOS = 'caminos-rurales-sde';

function verificarConfiguracion() {
  const { cloudName, apiKey, apiSecret } = env.cloudinary;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new ApiError(
      503,
      'La carga de fotos no está configurada. Completá CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET.'
    );
  }

  return { cloudName, apiKey, apiSecret };
}

/**
 * Firma una subida directa a Cloudinary. El frontend envía el archivo a
 * Cloudinary y luego registra en la base únicamente la URL resultante.
 */
export const firmarSubida = asyncHandler(async (req, res) => {
  const { cloudName, apiKey, apiSecret } = verificarConfiguracion();

  const timestamp = Math.floor(Date.now() / 1000);
  const parametros = `folder=${CARPETA_FOTOS}&timestamp=${timestamp}`;
  const firma = crypto.createHash('sha1').update(parametros + apiSecret).digest('hex');

  res.json({
    datos: {
      cloudName,
      apiKey,
      timestamp,
      folder: CARPETA_FOTOS,
      firma,
      urlSubida: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    },
  });
});

export const crear = asyncHandler(async (req, res) => {
  const { url, descripcion, caminoId, tramoId } = req.body;

  const camino = await prisma.camino.findUnique({
    where: { id: caminoId },
    select: { id: true },
  });

  if (!camino) {
    throw new ApiError(404, 'El camino indicado no existe.');
  }

  if (tramoId) {
    const tramo = await prisma.tramo.findUnique({
      where: { id: tramoId },
      select: { id: true, caminoId: true },
    });

    if (!tramo) {
      throw new ApiError(404, 'El tramo indicado no existe.');
    }

    if (tramo.caminoId !== caminoId) {
      throw new ApiError(400, 'El tramo no pertenece al camino indicado.');
    }
  }

  const foto = await prisma.foto.create({
    data: {
      url,
      descripcion: descripcion ?? null,
      caminoId,
      tramoId: tramoId ?? null,
    },
  });

  await registrarAuditoria({
    usuarioId: req.usuario.id,
    accion: 'CREAR',
    entidad: 'Foto',
    entidadId: foto.id,
    detalle: { caminoId, tramoId: tramoId ?? null, url },
    ip: req.ip,
  });

  res.status(201).json({ datos: foto, mensaje: 'Foto registrada correctamente.' });
});

export const eliminar = asyncHandler(async (req, res) => {
  const foto = await prisma.foto.findUnique({
    where: { id: req.params.id },
    select: { id: true, caminoId: true, tramoId: true, url: true },
  });

  if (!foto) {
    throw new ApiError(404, 'Foto no encontrada.');
  }

  await prisma.foto.delete({ where: { id: foto.id } });

  await registrarAuditoria({
    usuarioId: req.usuario.id,
    accion: 'BORRAR',
    entidad: 'Foto',
    entidadId: foto.id,
    detalle: { caminoId: foto.caminoId, tramoId: foto.tramoId, url: foto.url },
    ip: req.ip,
  });

  res.json({ mensaje: 'Foto eliminada correctamente.' });
});
