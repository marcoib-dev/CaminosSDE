import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../core/ApiError.js';

export async function listar() {
  return prisma.$queryRaw<
    { id: string; nombre: string; codigoIndec: string | null; tieneGeom: boolean }[]
  >(Prisma.sql`
    SELECT id, nombre, "codigoIndec", (geom IS NOT NULL) AS "tieneGeom"
    FROM core."Departamento"
    ORDER BY nombre
  `);
}

export async function crear(datos: {
  nombre: string;
  codigoIndec?: string | null;
  geom?: { type: string; coordinates: unknown } | null;
}) {
  if (!datos.geom) {
    return prisma.departamento.create({
      data: { nombre: datos.nombre, codigoIndec: datos.codigoIndec ?? null },
    });
  }

  const filas = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    INSERT INTO core."Departamento" (id, nombre, "codigoIndec", geom, "creadoEn", "actualizadoEn")
    VALUES (gen_random_uuid()::text, ${datos.nombre}, ${datos.codigoIndec ?? null},
            ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(datos.geom)}), 4326), now(), now())
    RETURNING id
  `);
  const id = filas[0]?.id;
  if (!id) throw new ApiError(500, 'No se pudo crear el departamento.');
  return prisma.departamento.findUnique({ where: { id } });
}

export async function actualizar(
  id: string,
  datos: {
    nombre?: string;
    codigoIndec?: string | null;
    geom?: { type: string; coordinates: unknown } | null;
  }
) {
  if (!datos.geom) {
    return prisma.departamento.update({
      where: { id },
      data: {
        ...(datos.nombre !== undefined ? { nombre: datos.nombre } : {}),
        ...(datos.codigoIndec !== undefined ? { codigoIndec: datos.codigoIndec } : {}),
      },
    });
  }

  const actualizados = await prisma.$executeRaw(Prisma.sql`
    UPDATE core."Departamento"
    SET geom = ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(datos.geom)}), 4326),
        "actualizadoEn" = now()
    WHERE id = ${id}
  `);
  if (actualizados === 0) throw new ApiError(404, 'El departamento no existe.');
  if (datos.nombre !== undefined || datos.codigoIndec !== undefined) {
    return prisma.departamento.update({
      where: { id },
      data: {
        ...(datos.nombre !== undefined ? { nombre: datos.nombre } : {}),
        ...(datos.codigoIndec !== undefined ? { codigoIndec: datos.codigoIndec } : {}),
      },
    });
  }
  return prisma.departamento.findUnique({ where: { id } });
}
