import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import {
  HASH_DUMMY,
  RONDAS_BCRYPT,
  mensajePasswordDebil,
} from '../config/seguridad.js';
import { usuarioPublicoSelect } from '../middleware/auth.js';
import { registrarAuditoria } from '../services/auditoria.service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

function firmarToken(usuario) {
  return jwt.sign(
    {
      sub: usuario.id,
      rol: usuario.rol,
      tv: usuario.tokenVersion ?? 0,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn, algorithm: 'HS256' }
  );
}

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const usuario = await prisma.usuario.findUnique({
    where: { email },
    select: { ...usuarioPublicoSelect, passwordHash: true, tokenVersion: true },
  });

  // Si el email no existe se compara igual contra un hash dummy para que el
  // tiempo de respuesta no permita enumerar usuarios.
  const passwordValida = await bcrypt.compare(password, usuario?.passwordHash ?? HASH_DUMMY);

  if (!usuario || !passwordValida || !usuario.activo) {
    throw new ApiError(401, 'Email o contraseña incorrectos.');
  }

  // Los usuarios creados con el costo anterior (10 rondas) se actualizan
  // de forma transparente en el primer login exitoso.
  if (bcrypt.getRounds(usuario.passwordHash) < RONDAS_BCRYPT) {
    try {
      const passwordHash = await bcrypt.hash(password, RONDAS_BCRYPT);
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { passwordHash },
      });
    } catch (error) {
      // No bloquea el login si falla la actualización del hash.
      console.error('No se pudo actualizar el costo de bcrypt:', error);
    }
  }

  const { passwordHash, tokenVersion, ...usuarioPublico } = usuario;

  res.json({
    datos: {
      token: firmarToken(usuario),
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
    select: {
      id: true,
      email: true,
      rol: true,
      passwordHash: true,
      tokenVersion: true,
    },
  });

  if (!usuario) {
    throw new ApiError(404, 'Usuario no encontrado.');
  }

  const passwordValida = await bcrypt.compare(passwordActual, usuario.passwordHash);
  if (!passwordValida) {
    throw new ApiError(400, 'La contraseña actual no es correcta.');
  }

  const esLaMismaPassword = await bcrypt.compare(passwordNueva, usuario.passwordHash);
  if (esLaMismaPassword) {
    throw new ApiError(400, 'La nueva contraseña no puede ser igual a la actual.');
  }

  const passwordDebil = mensajePasswordDebil(passwordNueva, { email: usuario.email });
  if (passwordDebil) {
    throw new ApiError(400, passwordDebil);
  }

  const passwordHash = await bcrypt.hash(passwordNueva, RONDAS_BCRYPT);
  const actualizado = await prisma.usuario.update({
    where: { id: usuario.id },
    data: {
      passwordHash,
      // Invalida los tokens emitidos antes del cambio.
      tokenVersion: { increment: 1 },
    },
    select: { tokenVersion: true },
  });

  await registrarAuditoria({
    usuarioId: req.usuario.id,
    accion: 'EDITAR',
    entidad: 'Usuario',
    entidadId: usuario.id,
    detalle: { cambioPassword: true, sesionesRevocadas: true },
    ip: req.ip,
  });

  res.json({
    datos: {
      // La sesión actual sigue viva con un token nuevo.
      token: firmarToken({ ...usuario, tokenVersion: actualizado.tokenVersion }),
    },
    mensaje: 'Contraseña actualizada correctamente.',
  });
});
