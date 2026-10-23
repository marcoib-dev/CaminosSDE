import { prisma } from '../config/prisma.js';
import { registrarAuditoria } from '../services/auditoria.service.js';
import { invalidarPrioridades } from '../services/cachePrioridad.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { opcionesPrisma, respuestaPaginada } from '../utils/paginacion.js';

const caminoConRelaciones = {
  tramos: { orderBy: { creadoEn: 'asc' } },
  fotos: true,
};

/**
 * Payload del mapa: solo caminos activos y sin timestamps. Conserva fotos y
 * descripción porque el popup y el panel de edición los muestran.
 */
const caminoParaMapa = {
  id: true,
  nombre: true,
  localidad: true,
  departamento: true,
  descripcion: true,
  activo: true,
  fotos: { select: { id: true, url: true, descripcion: true } },
  tramos: {
    orderBy: { creadoEn: 'asc' },
    select: {
      id: true,
      caminoId: true,
      geometria: true,
      longitudKm: true,
      estado: true,
      tipo: true,
      observaciones: true,
    },
  },
};

export const listar = asyncHandler(async (req, res) => {
  const { q, departamento, activo } = req.consulta;

  const where = {};
  if (q) where.nombre = { contains: q, mode: 'insensitive' };
  if (departamento) where.departamento = { equals: departamento, mode: 'insensitive' };
  if (activo !== undefined) where.activo = activo;

  const [caminos, total] = await prisma.$transaction([
    prisma.camino.findMany({
      where,
      include: caminoConRelaciones,
      orderBy: { nombre: 'asc' },
      ...opcionesPrisma(req.consulta),
    }),
    prisma.camino.count({ where }),
  ]);

  res.json(respuestaPaginada(caminos, req.consulta, total));
});

export const listarMapa = asyncHandler(async (req, res) => {
  const caminos = await prisma.camino.findMany({
    where: { activo: true },
    select: caminoParaMapa,
    orderBy: { nombre: 'asc' },
  });

  res.json({ datos: caminos });
});

export const obtener = asyncHandler(async (req, res) => {
  const camino = await prisma.camino.findUnique({
    where: { id: req.params.id },
    include: caminoConRelaciones,
  });

  if (!camino) {
    throw new ApiError(404, 'Camino no encontrado.');
  }

  res.json({ datos: camino });
});

export const crear = asyncHandler(async (req, res) => {
  const camino = await prisma.camino.create({ data: req.body });

  await registrarAuditoria({
    usuarioId: req.usuario.id,
    accion: 'CREAR',
    entidad: 'Camino',
    entidadId: camino.id,
    detalle: {
      nombre: camino.nombre,
      localidad: camino.localidad,
      departamento: camino.departamento,
    },
    ip: req.ip,
  });

  res.status(201).json({ datos: camino, mensaje: 'Camino creado correctamente.' });
});

export const actualizar = asyncHandler(async (req, res) => {
  const existente = await prisma.camino.findUnique({
    where: { id: req.params.id },
    select: { id: true },
  });

  if (!existente) {
    throw new ApiError(404, 'Camino no encontrado.');
  }

  const camino = await prisma.camino.update({
    where: { id: req.params.id },
    data: req.body,
  });

  await registrarAuditoria({
    usuarioId: req.usuario.id,
    accion: 'EDITAR',
    entidad: 'Camino',
    entidadId: camino.id,
    detalle: { campos: Object.keys(req.body) },
    ip: req.ip,
  });

  res.json({ datos: camino, mensaje: 'Camino actualizado correctamente.' });
});

export const eliminar = asyncHandler(async (req, res) => {
  const camino = await prisma.camino.findUnique({
    where: { id: req.params.id },
    select: { id: true, nombre: true, departamento: true },
  });

  if (!camino) {
    throw new ApiError(404, 'Camino no encontrado.');
  }

  await prisma.camino.delete({ where: { id: req.params.id } });

  await registrarAuditoria({
    usuarioId: req.usuario.id,
    accion: 'BORRAR',
    entidad: 'Camino',
    entidadId: camino.id,
    detalle: { nombre: camino.nombre, departamento: camino.departamento },
    ip: req.ip,
  });

  // La baja elimina en cascada sus tramos.
  invalidarPrioridades();
  res.json({ mensaje: 'Camino eliminado correctamente.' });
});
