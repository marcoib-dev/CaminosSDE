import { prisma } from '../config/prisma.js';

const clave = (nombre: string) =>
  nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

export const tiposVia = () => prisma.tipoVia.findMany({ orderBy: { orden: 'asc' } });
export const estadosTramo = () => prisma.estadoTramo.findMany({ orderBy: { orden: 'asc' } });

export const crearTipoVia = (datos: { nombre: string; descripcion?: string | null; orden?: number }) =>
  prisma.tipoVia.create({
    data: {
      clave: clave(datos.nombre),
      nombre: datos.nombre,
      descripcion: datos.descripcion ?? null,
      orden: datos.orden ?? 100,
    },
  });

export const crearEstadoTramo = (datos: { nombre: string; colorHex: string; orden?: number }) =>
  prisma.estadoTramo.create({
    data: {
      clave: clave(datos.nombre),
      nombre: datos.nombre,
      colorHex: datos.colorHex,
      orden: datos.orden ?? 100,
    },
  });

export const actualizarTipoVia = (
  id: string,
  datos: { nombre?: string; descripcion?: string | null; orden?: number; activo?: boolean }
) => prisma.tipoVia.update({ where: { id }, data: datos });

export const actualizarEstadoTramo = (
  id: string,
  datos: { nombre?: string; colorHex?: string; orden?: number; activo?: boolean }
) => prisma.estadoTramo.update({ where: { id }, data: datos });
