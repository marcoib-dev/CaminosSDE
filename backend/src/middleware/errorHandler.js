import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError.js';
import { apiErrorDesdeZod } from '../utils/zod.js';

export function rutaNoEncontrada(req, res) {
  // La ruta pedida queda solo en el log del servidor: devolverla al cliente
  // expone el mapeo interno de la API ante un escaneo.
  console.warn('Ruta no encontrada:', req.method, req.originalUrl);
  res.status(404).json({ mensaje: 'Ruta no encontrada.' });
}

export function manejarErrores(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof ApiError) {
    return res.status(error.status).json({
      mensaje: error.mensaje,
      ...(error.detalles ? { detalles: error.detalles } : {}),
    });
  }

  if (error instanceof ZodError) {
    const apiError = apiErrorDesdeZod(error);
    return res.status(apiError.status).json({
      mensaje: apiError.mensaje,
      detalles: apiError.detalles,
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025') {
      return res.status(404).json({ mensaje: 'Registro no encontrado.' });
    }

    if (error.code === 'P2002') {
      const campos = Array.isArray(error.meta?.target)
        ? error.meta.target.join(', ')
        : String(error.meta?.target ?? '');
      const mensaje = campos.includes('email')
        ? 'Ya existe un usuario con ese email.'
        : 'Ya existe un registro con esos datos.';
      return res.status(409).json({ mensaje });
    }

    if (error.code === 'P2003' || error.code === 'P2014') {
      return res.status(400).json({
        mensaje: 'El registro relacionado no existe o está en uso.',
      });
    }
  }

  if (error?.type === 'entity.parse.failed') {
    return res.status(400).json({ mensaje: 'El cuerpo de la solicitud no es un JSON válido.' });
  }

  if (error?.type === 'entity.too.large' || error?.status === 413) {
    return res.status(413).json({ mensaje: 'El cuerpo de la solicitud es demasiado grande.' });
  }

  console.error('Error no controlado:', error);
  return res.status(500).json({ mensaje: 'Error interno del servidor.' });
}
