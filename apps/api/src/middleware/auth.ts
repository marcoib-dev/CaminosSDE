import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../core/ApiError.js';
import { asyncHandler } from '../core/asyncHandler.js';
import { verificarAccessToken } from '../services/auth.service.js';
import type { Rol } from '@prisma/client';

const usuarioPublico = {
  id: true,
  nombre: true,
  email: true,
  rol: true,
  activo: true,
  creadoEn: true,
  actualizadoEn: true,
} as const;

export const autenticar = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const encabezado = req.headers.authorization;
  if (!encabezado?.startsWith('Bearer ')) {
    throw new ApiError(401, 'Token no proporcionado.');
  }

  let payload;
  try {
    payload = verificarAccessToken(encabezado.slice(7).trim());
  } catch {
    throw new ApiError(401, 'Token inválido o expirado.');
  }

  if (typeof payload.sub !== 'string') throw new ApiError(401, 'Token inválido.');

  const usuario = await prisma.usuario.findUnique({ where: { id: payload.sub }, select: usuarioPublico });
  if (!usuario?.activo) throw new ApiError(401, 'El usuario no existe o está desactivado.');

  req.usuario = usuario;
  next();
});

export const autorizar = (...roles: Rol[]) => (req: Request, _res: Response, next: NextFunction) => {
  if (!req.usuario) return next(new ApiError(401, 'No autenticado.'));
  if (!roles.includes(req.usuario.rol)) {
    return next(new ApiError(403, 'No tenés permisos para realizar esta acción.'));
  }
  next();
};

export const usuarioActual = (req: Request) => {
  if (!req.usuario) throw new ApiError(401, 'No autenticado.');
  return req.usuario;
};

declare global {
  namespace Express {
    interface Request {
      usuario?: {
        id: string;
        nombre: string;
        email: string;
        rol: Rol;
        activo: boolean;
        creadoEn: Date;
        actualizadoEn: Date;
      };
      consulta?: unknown;
    }
  }
}
