import bcrypt from 'bcrypt';
import { prisma } from '../config/prisma.js';
import { RONDAS_BCRYPT } from '../config/seguridad.js';
import { usuarioPublicoSelect } from '../middleware/auth.js';
import { registrarAuditoria } from '../services/auditoria.service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listar = asyncHandler(async (req, res) => {
  const usuarios = await prisma.usuario.findMany({
    select: usuarioPublicoSelect,
    orderBy: { creadoEn: 'asc' },
  });

  res.json({ datos: usuarios });
});

export const crear = asyncHandler(async (req, res) => {
  const { nombre, email, password } = req.body;
  const passwordHash = await bcrypt.hash(password, RONDAS_BCRYPT);

  const usuario = await prisma.usuario.create({
    data: {
      nombre,
      email,
      passwordHash,
      rol: 'EDITOR',
    },
    select: usuarioPublicoSelect,
  });

  await registrarAuditoria({
    usuarioId: req.usuario.id,
    accion: 'CREAR',
    entidad: 'Usuario',
    entidadId: usuario.id,
    detalle: { email: usuario.email, rol: usuario.rol },
    ip: req.ip,
  });

  res.status(201).json({ datos: usuario, mensaje: 'Usuario editor creado correctamente.' });
});

export const actualizarEstado = asyncHandler(async (req, res) => {
  const { activo } = req.body;

  const usuario = await prisma.usuario.findUnique({
    where: { id: req.params.id },
    select: { id: true, rol: true, activo: true },
  });

  if (!usuario) {
    throw new ApiError(404, 'Usuario no encontrado.');
  }

  if (usuario.rol === 'ADMIN') {
    throw new ApiError(400, 'Este endpoint solo permite activar o desactivar usuarios editores.');
  }

  const actualizado = await prisma.usuario.update({
    where: { id: usuario.id },
    data: {
      activo,
      // Al desactivar, invalida de inmediato los tokens vigentes.
      ...(activo ? {} : { tokenVersion: { increment: 1 } }),
    },
    select: usuarioPublicoSelect,
  });

  await registrarAuditoria({
    usuarioId: req.usuario.id,
    accion: 'EDITAR',
    entidad: 'Usuario',
    entidadId: usuario.id,
    detalle: { activoAnterior: usuario.activo, activoNuevo: activo },
    ip: req.ip,
  });

  res.json({
    datos: actualizado,
    mensaje: activo ? 'Usuario activado correctamente.' : 'Usuario desactivado correctamente.',
  });
});
