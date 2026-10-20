import { prisma } from '../config/prisma.js';
import { calcularPrioridad } from '../services/prioridad.js';
import {
  actualizarTramo,
  crearTramo,
  dividirTramo,
  eliminarTramo,
} from '../services/tramo.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

export const listar = asyncHandler(async (req, res) => {
  const { caminoId, estado, tipo, departamento } = req.consulta;

  const where = {};
  if (caminoId) where.caminoId = caminoId;
  if (estado) where.estado = estado;
  if (tipo) where.tipo = tipo;
  if (departamento) {
    where.camino = { departamento: { equals: departamento, mode: 'insensitive' } };
  }

  const tramos = await prisma.tramo.findMany({
    where,
    include: {
      camino: { select: { id: true, nombre: true, localidad: true, departamento: true } },
    },
    orderBy: [{ camino: { nombre: 'asc' } }, { creadoEn: 'asc' }],
  });

  res.json({ datos: tramos });
});

/**
 * Devuelve todos los tramos ordenados de mayor a menor prioridad.
 * El puntaje se calcula al vuelo a partir de los pesos de services/prioridad.js.
 */
export const listarPrioridades = asyncHandler(async (req, res) => {
  const [tramos, puntosInteres, categorias] = await Promise.all([
    prisma.tramo.findMany({
      include: {
        camino: { select: { id: true, nombre: true, localidad: true, departamento: true } },
      },
    }),
    prisma.puntoInteres.findMany({
      select: { id: true, nombre: true, categoria: true, latitud: true, longitud: true },
    }),
    prisma.categoriaPunto.findMany({ select: { clave: true, peso: true } }),
  ]);

  const pesosCategoria = Object.fromEntries(
    categorias.map((categoria) => [categoria.clave, categoria.peso])
  );

  const datos = tramos
    .map((tramo) => ({
      ...tramo,
      prioridad: calcularPrioridad(tramo, puntosInteres, pesosCategoria),
    }))
    .sort(
      (a, b) =>
        b.prioridad.puntaje - a.prioridad.puntaje ||
        a.camino.nombre.localeCompare(b.camino.nombre, 'es')
    );

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
