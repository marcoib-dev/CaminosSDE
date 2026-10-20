import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import multer from 'multer';
import { ApiError } from '../core/ApiError.js';

export function rutaNoEncontrada(_req: Request, res: Response) {
  res.status(404).json({ mensaje: 'Ruta no encontrada.' });
}

export function manejarErrores(error: unknown, req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      mensaje: 'Datos inválidos.',
      detalles: error.issues.map((issue) => ({
        campo: issue.path.join('.'),
        mensaje: issue.message,
      })),
    });
  }

  if (error instanceof ApiError) {
    return res.status(error.status).json({ mensaje: error.message, detalles: error.detalles });
  }

  if (error instanceof multer.MulterError) {
    const mensaje =
      error.code === 'LIMIT_FILE_SIZE'
        ? 'El archivo supera el límite de 30 MB.'
        : 'No se pudo procesar el archivo adjunto.';
    return res.status(400).json({ mensaje });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return res.status(409).json({ mensaje: 'Ya existe un registro con esos datos.' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ mensaje: 'El registro no existe.' });
    }
  }

  console.error('Error no controlado', { ruta: req.originalUrl, error });
  return res.status(500).json({ mensaje: 'Ocurrió un error interno.' });
}
