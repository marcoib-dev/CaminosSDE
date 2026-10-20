import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../core/ApiError.js';
import { asyncHandler } from '../core/asyncHandler.js';
import type { AccionPermiso } from '@sde/shared';

const columna: Record<AccionPermiso, 'puedeVer' | 'puedeCrear' | 'puedeEditar' | 'puedeBorrar'> = {
  ver: 'puedeVer',
  crear: 'puedeCrear',
  editar: 'puedeEditar',
  borrar: 'puedeBorrar',
};

export const requierePermiso = (capaClave: string, accion: AccionPermiso) =>
  asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.usuario) throw new ApiError(401, 'No autenticado.');
    if (req.usuario.rol === 'ADMIN') return next();

    const permiso = await prisma.permisoCapa.findFirst({
      where: { rol: req.usuario.rol, capa: { clave: capaClave, activa: true } },
    });

    if (!permiso || !permiso[columna[accion]]) {
      throw new ApiError(403, `No tenés permiso para ${accion} en ${capaClave}.`);
    }
    next();
  });
