import { prisma } from '../config/prisma.js';
import { registrarAuditoria } from '../services/auditoria.service.js';
import { invalidarPrioridades } from '../services/cachePrioridad.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { opcionesPrisma, respuestaPaginada } from '../utils/paginacion.js';

async function verificarCategoria(clave) {
  const categoria = await prisma.categoriaPunto.findUnique({
    where: { clave },
    select: { id: true },
  });

  if (!categoria) {
    throw new ApiError(400, `La categoría "${clave}" no existe.`);
  }
}

export const listar = asyncHandler(async (req, res) => {
  const { categoria } = req.consulta;
  const where = categoria ? { categoria } : {};

  const [puntos, total] = await prisma.$transaction([
    prisma.puntoInteres.findMany({
      where,
      orderBy: { nombre: 'asc' },
      ...opcionesPrisma(req.consulta),
    }),
    prisma.puntoInteres.count({ where }),
  ]);

  res.json(respuestaPaginada(puntos, req.consulta, total));
});

export const crear = asyncHandler(async (req, res) => {
  await verificarCategoria(req.body.categoria);

  const punto = await prisma.puntoInteres.create({ data: req.body });

  await registrarAuditoria({
    usuarioId: req.usuario.id,
    accion: 'CREAR',
    entidad: 'PuntoInteres',
    entidadId: punto.id,
    detalle: { nombre: punto.nombre, categoria: punto.categoria },
    ip: req.ip,
  });

  invalidarPrioridades();
  res.status(201).json({ datos: punto, mensaje: 'Punto de interés creado correctamente.' });
});

export const actualizar = asyncHandler(async (req, res) => {
  const existente = await prisma.puntoInteres.findUnique({
    where: { id: req.params.id },
    select: { id: true },
  });

  if (!existente) {
    throw new ApiError(404, 'Punto de interés no encontrado.');
  }

  if (req.body.categoria) {
    await verificarCategoria(req.body.categoria);
  }

  const punto = await prisma.puntoInteres.update({
    where: { id: req.params.id },
    data: req.body,
  });

  await registrarAuditoria({
    usuarioId: req.usuario.id,
    accion: 'EDITAR',
    entidad: 'PuntoInteres',
    entidadId: punto.id,
    detalle: { campos: Object.keys(req.body) },
    ip: req.ip,
  });

  invalidarPrioridades();
  res.json({ datos: punto, mensaje: 'Punto de interés actualizado correctamente.' });
});

export const eliminar = asyncHandler(async (req, res) => {
  const punto = await prisma.puntoInteres.findUnique({
    where: { id: req.params.id },
    select: { id: true, nombre: true },
  });

  if (!punto) {
    throw new ApiError(404, 'Punto de interés no encontrado.');
  }

  await prisma.puntoInteres.delete({ where: { id: req.params.id } });

  await registrarAuditoria({
    usuarioId: req.usuario.id,
    accion: 'BORRAR',
    entidad: 'PuntoInteres',
    entidadId: punto.id,
    detalle: { nombre: punto.nombre },
    ip: req.ip,
  });

  invalidarPrioridades();
  res.json({ mensaje: 'Punto de interés eliminado correctamente.' });
});
