import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import type { TipoInfraestructura } from '@prisma/client';

export interface FiltrosInfraestructura {
  bbox?: [number, number, number, number];
  tipo?: TipoInfraestructura;
  caminoId?: string;
}

export async function listarInfraestructura(filtros: FiltrosInfraestructura) {
  const condiciones: Prisma.Sql[] = [Prisma.sql`i.geom IS NOT NULL`];
  if (filtros.bbox) {
    const [minX, minY, maxX, maxY] = filtros.bbox;
    condiciones.push(Prisma.sql`i.geom && ST_MakeEnvelope(${minX}, ${minY}, ${maxX}, ${maxY}, 4326)`);
  }
  if (filtros.tipo) condiciones.push(Prisma.sql`i.tipo = ${filtros.tipo}::vialidad."TipoInfraestructura"`);
  if (filtros.caminoId) condiciones.push(Prisma.sql`i."caminoId" = ${filtros.caminoId}`);
  const where = Prisma.join(condiciones, ' AND ');

  const filas = await prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
    SELECT i.id, i.tipo, i.descripcion, i."caminoId", i."creadoEn",
           ST_AsGeoJSON(i.geom)::json AS geom
    FROM vialidad."Infraestructura" i
    WHERE ${where}
    ORDER BY i."creadoEn"
  `);
  return filas;
}

export async function crearInfraestructura(datos: {
  tipo: TipoInfraestructura;
  lng: number;
  lat: number;
  descripcion: string | null;
  caminoId: string | null;
}) {
  const filas = await prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
    INSERT INTO vialidad."Infraestructura" (id, tipo, geom, descripcion, "caminoId", "creadoEn")
    VALUES (gen_random_uuid()::text, ${datos.tipo}::vialidad."TipoInfraestructura",
            ST_SetSRID(ST_MakePoint(${datos.lng}, ${datos.lat}), 4326),
            ${datos.descripcion}, ${datos.caminoId}, now())
    RETURNING id, tipo, descripcion, "caminoId", "creadoEn",
              ST_AsGeoJSON(geom)::json AS geom
  `);
  return filas[0];
}

export async function actualizarInfraestructura(
  id: string,
  datos: { tipo?: TipoInfraestructura; lng?: number; lat?: number; descripcion?: string | null; caminoId?: string | null }
) {
  const actual = await prisma.infraestructura.findUnique({ where: { id } });
  if (!actual) return null;

  await prisma.infraestructura.update({
    where: { id },
    data: {
      tipo: datos.tipo,
      descripcion: datos.descripcion,
      caminoId: datos.caminoId,
    },
  });
  if (datos.lng !== undefined && datos.lat !== undefined) {
    await prisma.$executeRaw`
      UPDATE vialidad."Infraestructura"
      SET geom = ST_SetSRID(ST_MakePoint(${datos.lng}, ${datos.lat}), 4326)
      WHERE id = ${id}
    `;
  }
  return actual;
}

export async function eliminarInfraestructura(id: string) {
  return prisma.infraestructura.delete({ where: { id } });
}
