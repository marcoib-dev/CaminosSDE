import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { usuarioPublicoSelect } from '../middleware/auth.js';
import { registrarAuditoria } from '../services/auditoria.service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const RONDAS_BCRYPT = 10;

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const usuario = await prisma.usuario.findUnique({
    where: { email },
    select: { ...usuarioPublicoSelect, passwordHash: true },
  });

  if (!usuario) {
    throw new ApiError(401, 'Email o contraseña incorrectos.');
  }

  const passwordValida = await bcrypt.compare(password, usuario.passwordHash);
  if (!passwordValida || !usuario.activo) {
    throw new ApiError(401, 'Email o contraseña incorrectos.');
  }

  const { passwordHash, ...usuarioPublico } = usuario;

  const token = jwt.sign(
    { sub: usuario.id, rol: usuario.rol },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn, algorithm: 'HS256' }
  );

  res.json({
    datos: {
      token,
      usuario: usuarioPublico,
    },
  });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ datos: req.usuario });
});

export const cambiarPassword = asyncHandler(async (req, res) => {
  const { passwordActual, passwordNueva } = req.body;

  const usuario = await prisma.usuario.findUnique({
    where: { id: req.usuario.id },
    select: { id: true, passwordHash: true },
  });

  if (!usuario) {
    throw new ApiError(404, 'Usuario no encontrado.');
  }

  const passwordValida = await bcrypt.compare(passwordActual, usuario.passwordHash);
  if (!passwordValida) {
    throw new ApiError(400, 'La contraseña actual no es correcta.');
  }

  const passwordHash = await bcrypt.hash(passwordNueva, RONDAS_BCRYPT);
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { passwordHash },
  });

  await registrarAuditoria({
    usuarioId: req.usuario.id,
    accion: 'EDITAR',
    entidad: 'Usuario',
    entidadId: usuario.id,
    detalle: { cambioPassword: true },
    ip: req.ip,
  });

  res.json({ mensaje: 'Contraseña actualizada correctamente.' });
});
