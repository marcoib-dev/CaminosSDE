import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';

export interface FiltrosPuntos {
  bbox?: [number, number, number, number];
  categoria?: string;
}

export async function listarPuntos(filtros: FiltrosPuntos) {
  const condiciones: Prisma.Sql[] = [Prisma.sql`p.geom IS NOT NULL`];
  if (filtros.bbox) {
    const [minX, minY, maxX, maxY] = filtros.bbox;
    condiciones.push(Prisma.sql`p.geom && ST_MakeEnvelope(${minX}, ${minY}, ${maxX}, ${maxY}, 4326)`);
  }
  if (filtros.categoria) condiciones.push(Prisma.sql`p.categoria = ${filtros.categoria}`);
  const where = Prisma.join(condiciones, ' AND ');

  return prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
    SELECT p.id, p.nombre, p.categoria, p.latitud, p.longitud,
           p."creadoEn", p."actualizadoEn",
           cp.id AS "catId", cp.clave AS "catClave", cp.nombre AS "catNombre",
           cp.color AS "catColor", cp.inicial AS "catInicial", cp.peso AS "catPeso",
           cp.orden AS "catOrden", cp.protegida AS "catProtegida"
    FROM core."PuntoInteres" p
    JOIN core."CategoriaPunto" cp ON cp.clave = p.categoria
    WHERE ${where}
    ORDER BY cp.orden, p.nombre
  `);
}

export async function crearPunto(datos: {
  nombre: string;
  categoria: string;
  latitud: number;
  longitud: number;
}) {
  return prisma.$transaction(async (tx) => {
    const punto = await tx.puntoInteres.create({
      data: {
        nombre: datos.nombre,
        categoria: datos.categoria,
        latitud: datos.latitud,
        longitud: datos.longitud,
      },
    });
    await tx.$executeRaw`
      UPDATE core."PuntoInteres"
      SET geom = ST_SetSRID(ST_MakePoint(${datos.longitud}, ${datos.latitud}), 4326)
      WHERE id = ${punto.id}
    `;
    return punto;
  });
}

export async function actualizarPunto(
  id: string,
  datos: { nombre?: string; categoria?: string; latitud?: number; longitud?: number }
) {
  return prisma.$transaction(async (tx) => {
    const punto = await tx.puntoInteres.update({ where: { id }, data: datos });
    if (datos.latitud !== undefined || datos.longitud !== undefined) {
      await tx.$executeRaw`
        UPDATE core."PuntoInteres"
        SET geom = ST_SetSRID(ST_MakePoint(longitud, latitud), 4326)
        WHERE id = ${id}
      `;
    }
    return punto;
  });
}

export async function eliminarPunto(id: string) {
  return prisma.puntoInteres.delete({ where: { id } });
}

export async function listarCategorias() {
  const categorias = await prisma.categoriaPunto.findMany({
    orderBy: { orden: 'asc' },
    include: { _count: { select: { puntos: true } } },
  });
  return categorias.map(({ _count, ...categoria }) => ({ ...categoria, totalPuntos: _count.puntos }));
}

export async function crearCategoria(datos: {
  nombre: string;
  color?: string;
  inicial?: string;
  peso?: number;
  orden?: number;
}) {
  const clave = datos.nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

  const inicial = datos.inicial?.slice(0, 1).toUpperCase() ?? datos.nombre.slice(0, 1).toUpperCase();
  return prisma.categoriaPunto.create({
    data: {
      clave,
      nombre: datos.nombre,
      color: datos.color ?? '#0e7490',
      inicial,
      peso: datos.peso ?? 10,
      orden: datos.orden ?? 100,
    },
  });
}

export async function eliminarCategoria(id: string) {
  const categoria = await prisma.categoriaPunto.findUnique({
    where: { id },
    include: { _count: { select: { puntos: true } } },
  });
  if (!categoria) return { estado: 'no-existe' as const };
  if (categoria.protegida) return { estado: 'protegida' as const };
  if (categoria._count.puntos > 0) return { estado: 'con-puntos' as const };
  await prisma.categoriaPunto.delete({ where: { id } });
  return { estado: 'ok' as const };
}
