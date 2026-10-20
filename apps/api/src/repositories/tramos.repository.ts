import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
export interface FiltrosTramos {
  bbox?: [number, number, number, number];
  caminoId?: string;
  estadoId?: string;
  tipoViaId?: string;
  departamentoId?: string;
  q?: string;
  zoom?: number;
}

type Db = Prisma.TransactionClient;

interface FilaTramo {
  id: string;
  caminoId: string;
  longitudKm: number;
  estadoId: string;
  observaciones: string | null;
  version: number;
  creadoEn: Date;
  actualizadoEn: Date;
  geometria: { type: string; coordinates: unknown };
  estadoClave: string;
  estadoNombre: string;
  estadoColor: string;
  estadoOrden: number;
  caminoNombre: string;
  localidad: string;
  departamentoId: string | null;
  departamentoNombre: string | null;
  tipoViaId: string;
}

function seleccion(zoom: number) {
  return Prisma.sql`
    t.id, t."caminoId", t."longitudKm", t."estadoId", t.observaciones, t.version,
    t."creadoEn", t."actualizadoEn",
    ST_AsGeoJSON(
      CASE
        WHEN ${zoom} < 10 THEN ST_SimplifyPreserveTopology(t.geom, 0.01)
        WHEN ${zoom} < 12 THEN ST_SimplifyPreserveTopology(t.geom, 0.001)
        ELSE t.geom
      END
    )::json AS geometria,
    e.clave AS "estadoClave", e.nombre AS "estadoNombre",
    e."colorHex" AS "estadoColor", e.orden AS "estadoOrden",
    c.nombre AS "caminoNombre", c.localidad, c."departamentoId", c."tipoViaId",
    d.nombre AS "departamentoNombre"
  `;
}

export function mapTramo(fila: FilaTramo) {
  return {
    id: fila.id,
    caminoId: fila.caminoId,
    geometria: fila.geometria,
    longitudKm: fila.longitudKm,
    estadoId: fila.estadoId,
    estado: {
      id: fila.estadoId,
      clave: fila.estadoClave,
      nombre: fila.estadoNombre,
      colorHex: fila.estadoColor,
      orden: fila.estadoOrden,
      activo: true,
    },
    observaciones: fila.observaciones,
    version: fila.version,
    creadoEn: fila.creadoEn,
    actualizadoEn: fila.actualizadoEn,
    camino: {
      id: fila.caminoId,
      nombre: fila.caminoNombre,
      localidad: fila.localidad,
      departamentoId: fila.departamentoId,
      departamento: fila.departamentoNombre
        ? { id: fila.departamentoId, nombre: fila.departamentoNombre }
        : null,
      tipoViaId: fila.tipoViaId,
    },
  };
}

export async function listarTramos(filtros: FiltrosTramos) {
  const condiciones: Prisma.Sql[] = [Prisma.sql`t.geom IS NOT NULL`];
  if (filtros.bbox) {
    const [minX, minY, maxX, maxY] = filtros.bbox;
    condiciones.push(Prisma.sql`t.geom && ST_MakeEnvelope(${minX}, ${minY}, ${maxX}, ${maxY}, 4326)`);
  }
  if (filtros.caminoId) condiciones.push(Prisma.sql`t."caminoId" = ${filtros.caminoId}`);
  if (filtros.estadoId) condiciones.push(Prisma.sql`t."estadoId" = ${filtros.estadoId}`);
  if (filtros.tipoViaId) condiciones.push(Prisma.sql`c."tipoViaId" = ${filtros.tipoViaId}`);
  if (filtros.departamentoId) condiciones.push(Prisma.sql`c."departamentoId" = ${filtros.departamentoId}`);
  if (filtros.q) condiciones.push(Prisma.sql`c.nombre ILIKE ${`%${filtros.q}%`}`);

  const where = Prisma.join(condiciones, ' AND ');
  const filas = await prisma.$queryRaw<FilaTramo[]>(Prisma.sql`
    SELECT ${seleccion(filtros.zoom ?? 14)}
    FROM vialidad."Tramo" t
    JOIN vialidad."EstadoTramo" e ON e.id = t."estadoId"
    JOIN vialidad."Camino" c ON c.id = t."caminoId"
    LEFT JOIN core."Departamento" d ON d.id = c."departamentoId"
    WHERE ${where}
    ORDER BY c.nombre, t."creadoEn"
  `);
  return filas.map(mapTramo);
}

export async function listarTramosDeCamino(caminoId: string) {
  return listarTramos({ caminoId, zoom: 14 });
}

export async function buscarTramo(id: string) {
  const filas = await prisma.$queryRaw<FilaTramo[]>(Prisma.sql`
    SELECT ${seleccion(14)}
    FROM vialidad."Tramo" t
    JOIN vialidad."EstadoTramo" e ON e.id = t."estadoId"
    JOIN vialidad."Camino" c ON c.id = t."caminoId"
    LEFT JOIN core."Departamento" d ON d.id = c."departamentoId"
    WHERE t.id = ${id}
    LIMIT 1
  `);
  return filas[0] ? mapTramo(filas[0]) : null;
}

export async function crearTramo(
  db: Db,
  datos: { id?: string; caminoId: string; geojson: string; estadoId: string; observaciones: string | null }
) {
  const filas = await db.$queryRaw<{ id: string }[]>(Prisma.sql`
    INSERT INTO vialidad."Tramo"
      (id, "caminoId", geom, "longitudKm", "estadoId", observaciones, version, "creadoEn", "actualizadoEn")
    VALUES
      (${datos.id ?? randomUUID()}, ${datos.caminoId},
       ST_SetSRID(ST_GeomFromGeoJSON(${datos.geojson}), 4326),
       ST_Length(ST_SetSRID(ST_GeomFromGeoJSON(${datos.geojson}), 4326)::geography) / 1000,
       ${datos.estadoId}, ${datos.observaciones}, 1, now(), now())
    RETURNING id
  `);
  return filas[0]!.id;
}

export async function actualizarTramo(
  db: Db,
  id: string,
  datos: { geojson?: string; estadoId?: string; observaciones?: string | null }
) {
  if (datos.geojson) {
    await db.$executeRaw`
      UPDATE vialidad."Tramo"
      SET geom = ST_SetSRID(ST_GeomFromGeoJSON(${datos.geojson}), 4326),
          "longitudKm" = ST_Length(ST_SetSRID(ST_GeomFromGeoJSON(${datos.geojson}), 4326)::geography) / 1000,
          "estadoId" = COALESCE(${datos.estadoId ?? null}, "estadoId"),
          observaciones = CASE WHEN ${datos.observaciones === undefined} THEN observaciones ELSE ${datos.observaciones ?? null} END,
          "actualizadoEn" = now(),
          version = version + 1
      WHERE id = ${id}
    `;
  } else {
    await db.$executeRaw`
      UPDATE vialidad."Tramo"
      SET "estadoId" = COALESCE(${datos.estadoId ?? null}, "estadoId"),
          observaciones = CASE WHEN ${datos.observaciones === undefined} THEN observaciones ELSE ${datos.observaciones ?? null} END,
          "actualizadoEn" = now(),
          version = version + 1
      WHERE id = ${id}
    `;
  }
}

export async function geometriaDeTramo(db: Db, id: string) {
  const filas = await db.$queryRaw<{ geometria: unknown; longitudKm: number }[]>(Prisma.sql`
    SELECT ST_AsGeoJSON(geom)::json AS geometria, "longitudKm"
    FROM vialidad."Tramo" WHERE id = ${id} LIMIT 1
  `);
  return filas[0] ?? null;
}

export async function dividirTramo(db: Db, id: string, fraccion: number, nuevoId: string) {
  const origen = await db.$queryRaw<
    { caminoId: string; estadoId: string; observaciones: string | null }[]
  >(Prisma.sql`
    SELECT "caminoId", "estadoId", observaciones
    FROM vialidad."Tramo" WHERE id = ${id} LIMIT 1
  `);
  if (!origen[0]) throw new Error('Tramo inexistente');

  await db.$executeRaw`
    INSERT INTO vialidad."Tramo"
      (id, "caminoId", geom, "longitudKm", "estadoId", observaciones, version, "creadoEn", "actualizadoEn")
    SELECT ${nuevoId}, "caminoId", ST_LineSubstring(geom, ${fraccion}, 1),
           ST_Length(ST_LineSubstring(geom, ${fraccion}, 1)::geography) / 1000,
           "estadoId", observaciones, 1, now(), now()
    FROM vialidad."Tramo" WHERE id = ${id}
  `;

  await db.$executeRaw`
    UPDATE vialidad."Tramo"
    SET geom = ST_LineSubstring(geom, 0, ${fraccion}),
        "longitudKm" = ST_Length(ST_LineSubstring(geom, 0, ${fraccion})::geography) / 1000,
        "actualizadoEn" = now(),
        version = version + 1
    WHERE id = ${id}
  `;

  return { caminoId: origen[0].caminoId, estadoId: origen[0].estadoId };
}

export async function fusionarTramos(db: Db, idA: string, idB: string) {
  const filas = await db.$queryRaw<
    { estadoA: string; estadoB: string; contiguos: boolean; caminoA: string; caminoB: string }[]
  >(Prisma.sql`
    SELECT a."estadoId" AS "estadoA", b."estadoId" AS "estadoB",
           a."caminoId" AS "caminoA", b."caminoId" AS "caminoB",
           (ST_Equals(ST_StartPoint(a.geom), ST_StartPoint(b.geom))
            OR ST_Equals(ST_StartPoint(a.geom), ST_EndPoint(b.geom))
            OR ST_Equals(ST_EndPoint(a.geom), ST_StartPoint(b.geom))
            OR ST_Equals(ST_EndPoint(a.geom), ST_EndPoint(b.geom))) AS contiguos
    FROM vialidad."Tramo" a, vialidad."Tramo" b
    WHERE a.id = ${idA} AND b.id = ${idB}
  `);
  const fila = filas[0];
  if (!fila) throw new Error('Tramo inexistente');
  if (fila.caminoA !== fila.caminoB) throw new Error('Los tramos pertenecen a caminos distintos.');
  if (fila.estadoA !== fila.estadoB) throw new Error('Solo se pueden fusionar tramos con el mismo estado.');
  if (!fila.contiguos) throw new Error('Los tramos no son contiguos.');

  // Se orientan las líneas antes de unirlas para que compartan extremos.
  const actualizados = await db.$executeRaw`
    UPDATE vialidad."Tramo" a
    SET geom = m.geom,
        "longitudKm" = ST_Length(m.geom::geography) / 1000,
        "actualizadoEn" = now(),
        version = a.version + 1
    FROM (
      SELECT ST_LineMerge(
        ST_Collect(
          CASE
            WHEN ST_Equals(ST_StartPoint(a.geom), ST_StartPoint(b.geom)) THEN ST_Reverse(a.geom)
            WHEN ST_Equals(ST_StartPoint(a.geom), ST_EndPoint(b.geom)) THEN ST_Reverse(a.geom)
            ELSE a.geom
          END,
          CASE
            WHEN NOT ST_Equals(ST_EndPoint(a.geom), ST_StartPoint(b.geom))
              AND ST_Equals(ST_EndPoint(a.geom), ST_EndPoint(b.geom)) THEN ST_Reverse(b.geom)
            WHEN ST_Equals(ST_StartPoint(a.geom), ST_EndPoint(b.geom)) THEN ST_Reverse(b.geom)
            ELSE b.geom
          END
        )
      ) AS geom
      FROM vialidad."Tramo" a, vialidad."Tramo" b
      WHERE a.id = ${idA} AND b.id = ${idB}
    ) m
    WHERE a.id = ${idA}
      AND ST_GeometryType(m.geom) = 'ST_LineString'
  `;
  if (actualizados === 0) {
    throw new Error('Los tramos no se pueden fusionar en una sola línea.');
  }

  // Se conservan los registros asociados al tramo que desaparece.
  await db.$executeRaw`UPDATE vialidad."HistorialTramo" SET "tramoId" = ${idA} WHERE "tramoId" = ${idB}`;
  await db.$executeRaw`UPDATE vialidad."Mantenimiento" SET "tramoId" = ${idA} WHERE "tramoId" = ${idB}`;
  await db.$executeRaw`UPDATE vialidad."Foto" SET "tramoId" = ${idA} WHERE "tramoId" = ${idB}`;
  await db.$executeRaw`UPDATE vialidad."Sugerencia" SET "tramoId" = ${idA} WHERE "tramoId" = ${idB}`;

  await db.$executeRaw`DELETE FROM vialidad."Tramo" WHERE id = ${idB}`;
  return { caminoId: fila.caminoA };
}

export async function historialTramo(id: string) {
  return prisma.historialTramo.findMany({
    where: { tramoId: id },
    include: {
      usuario: { select: { id: true, nombre: true, email: true } },
      estadoAnterior: true,
      estadoNuevo: true,
    },
    orderBy: { fecha: 'desc' },
  });
}
