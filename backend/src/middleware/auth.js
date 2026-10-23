import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const usuarioPublicoSelect = {
  id: true,
  nombre: true,
  email: true,
  rol: true,
  activo: true,
  creadoEn: true,
  actualizadoEn: true,
};

/**
 * Verifica el token JWT y carga el usuario actual desde la base.
 */
export const autenticar = asyncHandler(async (req, res, next) => {
  const encabezado = req.headers.authorization;

  if (!encabezado || !encabezado.startsWith('Bearer ')) {
    throw new ApiError(401, 'Token no proporcionado.');
  }

  const token = encabezado.slice('Bearer '.length).trim();

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
  } catch {
    throw new ApiError(401, 'Token inválido o expirado.');
  }

  if (!payload || typeof payload !== 'object' || typeof payload.sub !== 'string') {
    throw new ApiError(401, 'Token inválido o expirado.');
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: payload.sub },
    select: { ...usuarioPublicoSelect, tokenVersion: true },
  });

  if (!usuario || !usuario.activo) {
    throw new ApiError(401, 'El usuario no existe o está desactivado.');
  }

  // Los tokens emitidos antes de un cambio de contraseña o de una baja
  // conservan una versión anterior y dejan de ser válidos.
  if (Number(payload.tv ?? 0) !== usuario.tokenVersion) {
    throw new ApiError(401, 'La sesión fue invalidada. Iniciá sesión nuevamente.');
  }

  const { tokenVersion, ...usuarioPublico } = usuario;
  req.usuario = usuarioPublico;
  next();
});

/**
 * Restringe el acceso a los roles indicados.
 */
export const autorizar = (...roles) => (req, res, next) => {
  if (!req.usuario) {
    return next(new ApiError(401, 'No autenticado.'));
  }

  if (!roles.includes(req.usuario.rol)) {
    return next(new ApiError(403, 'No tenés permisos para realizar esta acción.'));
  }

  next();
};
