import { prisma } from '../config/prisma.js';
import { registrarAuditoria } from '../services/auditoria.service.js';
import { invalidarPrioridades } from '../services/cachePrioridad.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const PALETA = [
  '#7c3aed',
  '#0891b2',
  '#65a30d',
  '#db2777',
  '#ea580c',
  '#0d9488',
  '#4f46e5',
  '#b45309',
];

export function normalizarClave(nombre) {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export const listar = asyncHandler(async (req, res) => {
  const categorias = await prisma.categoriaPunto.findMany({
    orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
    include: { _count: { select: { puntos: true } } },
  });

  res.json({
    datos: categorias.map(({ _count, ...categoria }) => ({
      ...categoria,
      totalPuntos: _count.puntos,
    })),
  });
});

export const crear = asyncHandler(async (req, res) => {
  const { nombre, color, inicial, peso } = req.body;
  const nombreLimpio = nombre.trim();
  const clave = normalizarClave(nombreLimpio);

  if (!clave) {
    throw new ApiError(400, 'El nombre debe incluir al menos una letra o un número.');
  }

  const existente = await prisma.categoriaPunto.findUnique({
    where: { clave },
    select: { id: true },
  });

  if (existente) {
    throw new ApiError(409, 'Ya existe una categoría con ese nombre.');
  }

  const total = await prisma.categoriaPunto.count();
  const categoria = await prisma.categoriaPunto.create({
    data: {
      clave,
      nombre: nombreLimpio,
      color: color ?? PALETA[total % PALETA.length],
      inicial: (inicial?.trim() || nombreLimpio.charAt(0)).toUpperCase(),
      peso: peso ?? 10,
      orden: 100,
    },
  });

  await registrarAuditoria({
    usuarioId: req.usuario.id,
    accion: 'CREAR',
    entidad: 'CategoriaPunto',
    entidadId: categoria.id,
    detalle: { clave: categoria.clave, nombre: categoria.nombre },
    ip: req.ip,
  });

  invalidarPrioridades();
  res.status(201).json({
    datos: { ...categoria, totalPuntos: 0 },
    mensaje: 'Categoría creada correctamente.',
  });
});

export const eliminar = asyncHandler(async (req, res) => {
  const categoria = await prisma.categoriaPunto.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { puntos: true } } },
  });

  if (!categoria) {
    throw new ApiError(404, 'Categoría no encontrada.');
  }

  if (categoria.protegida) {
    throw new ApiError(400, 'Las categorías Hospital, Escuela y UPA no se pueden eliminar.');
  }

  if (categoria._count.puntos > 0) {
    throw new ApiError(
      409,
      `No se puede eliminar la categoría porque tiene ${categoria._count.puntos} punto(s) asociado(s). Eliminá o cambiá esos puntos primero.`
    );
  }

  await prisma.categoriaPunto.delete({ where: { id: categoria.id } });

  await registrarAuditoria({
    usuarioId: req.usuario.id,
    accion: 'BORRAR',
    entidad: 'CategoriaPunto',
    entidadId: categoria.id,
    detalle: { clave: categoria.clave, nombre: categoria.nombre },
    ip: req.ip,
  });

  invalidarPrioridades();
  res.json({ mensaje: 'Categoría eliminada correctamente.' });
});
