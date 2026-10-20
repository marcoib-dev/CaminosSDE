import bcrypt from 'bcrypt';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../core/ApiError.js';
import { asyncHandler } from '../core/asyncHandler.js';
import { created, ok } from '../core/http.js';
import { registrarAuditoria } from '../core/auditoria.js';
import { contexto } from '../core/context.js';
import { usuarioActual } from '../middleware/auth.js';

const select = {
  id: true,
  nombre: true,
  email: true,
  rol: true,
  activo: true,
  creadoEn: true,
  actualizadoEn: true,
} as const;

export const listar = asyncHandler(async (_req, res) => {
  ok(res, await prisma.usuario.findMany({ select, orderBy: { creadoEn: 'asc' } }));
});

export const crear = asyncHandler(async (req, res) => {
  const existente = await prisma.usuario.findUnique({ where: { email: req.body.email.toLowerCase() } });
  if (existente) throw new ApiError(409, 'Ya existe un usuario con ese email.');

  const usuario = await prisma.usuario.create({
    data: {
      nombre: req.body.nombre,
      email: req.body.email.toLowerCase(),
      passwordHash: await bcrypt.hash(req.body.password, 10),
      rol: 'EDITOR',
    },
    select,
  });

  await registrarAuditoria({
    ...contexto(req),
    accion: 'CREAR',
    entidad: 'Usuario',
    entidadId: usuario.id,
    detalle: { email: usuario.email },
  });
  created(res, usuario, 'Usuario creado.');
});

export const actualizarEstado = asyncHandler(async (req, res) => {
  const objetivo = await prisma.usuario.findUnique({ where: { id: req.params.id } });
  if (!objetivo) throw new ApiError(404, 'Usuario no encontrado.');
  if (objetivo.rol === 'ADMIN') throw new ApiError(400, 'No se puede desactivar a un administrador.');

  const usuario = await prisma.usuario.update({
    where: { id: req.params.id },
    data: { activo: req.body.activo },
    select,
  });
  await registrarAuditoria({
    ...contexto(req),
    accion: 'EDITAR',
    entidad: 'Usuario',
    entidadId: usuario.id,
    detalle: { activo: usuario.activo },
  });
  ok(res, usuario);
});
