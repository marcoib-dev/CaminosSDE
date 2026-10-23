import { prisma } from '../config/prisma.js';
import { obtenerPrioridades } from '../services/cachePrioridad.js';
import {
  actualizarTramo,
  crearTramo,
  dividirTramo,
  eliminarTramo,
} from '../services/tramo.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { opcionesPrisma, respuestaPaginada } from '../utils/paginacion.js';

export const listar = asyncHandler(async (req, res) => {
  const { caminoId, estado, tipo, departamento } = req.consulta;

  const where = {};
  if (caminoId) where.caminoId = caminoId;
  if (estado) where.estado = estado;
  if (tipo) where.tipo = tipo;
  if (departamento) {
    where.camino = { departamento: { equals: departamento, mode: 'insensitive' } };
  }

  const [tramos, total] = await prisma.$transaction([
    prisma.tramo.findMany({
      where,
      include: {
        camino: { select: { id: true, nombre: true, localidad: true, departamento: true } },
      },
      orderBy: [{ camino: { nombre: 'asc' } }, { creadoEn: 'asc' }],
      ...opcionesPrisma(req.consulta),
    }),
    prisma.tramo.count({ where }),
  ]);

  res.json(respuestaPaginada(tramos, req.consulta, total));
});

/**
 * Devuelve todos los tramos ordenados de mayor a menor prioridad.
 * El cálculo se cachea 60 s y se invalida al editar tramos o puntos de interés.
 */
export const listarPrioridades = asyncHandler(async (req, res) => {
  const datos = await obtenerPrioridades();

  res.set('Cache-Control', 'public, max-age=30');
  res.json({ datos });
});

export const crear = asyncHandler(async (req, res) => {
  const tramo = await crearTramo(req.body, {
    usuarioId: req.usuario.id,
    ip: req.ip,
  });

  res.status(201).json({ datos: tramo, mensaje: 'Tramo creado correctamente.' });
});

export const actualizar = asyncHandler(async (req, res) => {
  const tramo = await actualizarTramo(req.params.id, req.body, {
    usuarioId: req.usuario.id,
    ip: req.ip,
  });

  res.json({ datos: tramo, mensaje: 'Tramo actualizado correctamente.' });
});

export const eliminar = asyncHandler(async (req, res) => {
  await eliminarTramo(req.params.id, {
    usuarioId: req.usuario.id,
    ip: req.ip,
  });

  res.json({ mensaje: 'Tramo eliminado correctamente.' });
});

export const dividir = asyncHandler(async (req, res) => {
  const tramos = await dividirTramo(req.params.id, req.body, {
    usuarioId: req.usuario.id,
    ip: req.ip,
  });

  res.json({ datos: tramos, mensaje: 'Tramo dividido correctamente.' });
});

export const historial = asyncHandler(async (req, res) => {
  const tramo = await prisma.tramo.findUnique({
    where: { id: req.params.id },
    select: { id: true },
  });

  if (!tramo) {
    throw new ApiError(404, 'Tramo no encontrado.');
  }

  const datos = await prisma.historialTramo.findMany({
    where: { tramoId: tramo.id },
    include: { usuario: { select: { id: true, nombre: true, email: true } } },
    orderBy: { fecha: 'desc' },
  });

  res.json({ datos });
});
