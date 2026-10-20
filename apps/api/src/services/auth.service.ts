import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { ApiError } from '../core/ApiError.js';

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export function firmarAccessToken(usuario: { id: string; rol: string }) {
  return jwt.sign({ sub: usuario.id, rol: usuario.rol }, env.JWT_SHARED_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verificarAccessToken(token: string) {
  return jwt.verify(token, env.JWT_SHARED_SECRET, { algorithms: ['HS256'] }) as jwt.JwtPayload;
}

export async function emitirRefreshToken(usuarioId: string) {
  const token = randomBytes(48).toString('hex');
  const expiraEn = new Date(Date.now() + env.REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: { tokenHash: hashToken(token), usuarioId, expiraEn },
  });
  return token;
}

export async function login(email: string, password: string, ip?: string) {
  const usuario = await prisma.usuario.findUnique({ where: { email: email.toLowerCase() } });
  if (!usuario || !usuario.activo) {
    throw new ApiError(401, 'Email o contraseña incorrectos.');
  }
  const valida = await bcrypt.compare(password, usuario.passwordHash);
  if (!valida) {
    throw new ApiError(401, 'Email o contraseña incorrectos.');
  }

  const token = firmarAccessToken(usuario);
  const refreshToken = await emitirRefreshToken(usuario.id);

  await prisma.auditoria.create({
    data: { usuarioId: usuario.id, accion: 'LOGIN', entidad: 'Usuario', entidadId: usuario.id, ip: ip ?? null },
  });

  const { passwordHash: _omitido, ...publico } = usuario;
  return { token, refreshToken, usuario: publico };
}

export async function refrescar(refreshToken: string) {
  const almacenado = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refreshToken) },
    include: { usuario: true },
  });

  if (!almacenado || almacenado.revocado || almacenado.expiraEn < new Date() || !almacenado.usuario.activo) {
    throw new ApiError(401, 'Refresh token inválido o expirado.');
  }

  await prisma.refreshToken.update({ where: { id: almacenado.id }, data: { revocado: true } });

  return {
    token: firmarAccessToken(almacenado.usuario),
    refreshToken: await emitirRefreshToken(almacenado.usuario.id),
    usuario: {
      id: almacenado.usuario.id,
      nombre: almacenado.usuario.nombre,
      email: almacenado.usuario.email,
      rol: almacenado.usuario.rol,
      activo: almacenado.usuario.activo,
      creadoEn: almacenado.usuario.creadoEn,
      actualizadoEn: almacenado.usuario.actualizadoEn,
    },
  };
}

export async function cambiarPassword(usuarioId: string, actual: string, nueva: string) {
  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } });
  const valida = await bcrypt.compare(actual, usuario.passwordHash);
  if (!valida) throw new ApiError(400, 'La contraseña actual no es correcta.');

  await prisma.$transaction([
    prisma.usuario.update({ where: { id: usuarioId }, data: { passwordHash: await bcrypt.hash(nueva, 10) } }),
    prisma.refreshToken.updateMany({ where: { usuarioId }, data: { revocado: true } }),
  ]);
}
