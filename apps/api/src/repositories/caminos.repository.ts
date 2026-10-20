import { Prisma, type PrismaClient } from '@prisma/client';
import { prisma } from '../config/prisma.js';

type Db = Prisma.TransactionClient;

export interface FiltrosCaminos {
  bbox?: [number, number, number, number];
  departamentoId?: string;
  tipoViaId?: string;
  q?: string;
  activo?: boolean;
  zoom?: number;
}

interface FilaCamino {
  id: string;
  nombre: string;
  localidad: string;
  tipoViaId: string;
  departamentoId: string | null;
  descripcion: string | null;
  activo: boolean;
  longitudKm: number;
  version: number;
  creadoEn: Date;
  actualizadoEn: Date;
  geometria: { type: string; coordinates: unknown } | null;
  tipoViaClave: string;
  tipoViaNombre: string;
  tipoViaDescripcion: string | null;
  tipoViaOrden: number;
  departamentoNombre: string | null;
}

// La simplificación depende del zoom; se arma aparte para no duplicar SQL.
function seleccionConZoom(zoom: number) {
  return Prisma.sql`
    c.id, c.nombre, c.localidad, c."tipoViaId", c."departamentoId", c.descripcion, c.activo,
    c."longitudKm", c.version, c."creadoEn", c."actualizadoEn",
    ST_AsGeoJSON(
      CASE
        WHEN ${zoom} < 10 THEN ST_SimplifyPreserveTopology(c.geom, 0.01)
        WHEN ${zoom} < 12 THEN ST_SimplifyPreserveTopology(c.geom, 0.001)
        ELSE c.geom
      END
    )::json AS geometria,
    tv.clave AS "tipoViaClave", tv.nombre AS "tipoViaNombre",
    tv.descripcion AS "tipoViaDescripcion", tv.orden AS "tipoViaOrden",
    d.nombre AS "departamentoNombre"
  `;
}

function mapCamino(fila: FilaCamino) {
  return {
    id: fila.id,
    nombre: fila.nombre,
    localidad: fila.localidad,
    tipoViaId: fila.tipoViaId,
    tipoVia: {
      id: fila.tipoViaId,
      clave: fila.tipoViaClave,
      nombre: fila.tipoViaNombre,
      descripcion: fila.tipoViaDescripcion,
      orden: fila.tipoViaOrden,
      activo: true,
    },
    departamentoId: fila.departamentoId,
    departamento: fila.departamentoId
      ? { id: fila.departamentoId, nombre: fila.departamentoNombre ?? '', codigoIndec: null, creadoEn: '', actualizadoEn: '' }
      : null,
    descripcion: fila.descripcion,
    activo: fila.activo,
    geom: fila.geometria as never,
    longitudKm: fila.longitudKm,
    version: fila.version,
    creadoEn: fila.creadoEn,
    actualizadoEn: fila.actualizadoEn,
  };
}

export async function listarCaminos(filtros: FiltrosCaminos) {
  // Un camino puede no tener geometría maestra si sus tramos están desconectados.
  const condiciones: Prisma.Sql[] = [
    Prisma.sql`(
      c.geom IS NOT NULL
      OR EXISTS (SELECT 1 FROM vialidad."Tramo" t WHERE t."caminoId" = c.id AND t.geom IS NOT NULL)
    )`,
  ];
  if (filtros.bbox) {
    const [minX, minY, maxX, maxY] = filtros.bbox;
    condiciones.push(Prisma.sql`(
      c.geom && ST_MakeEnvelope(${minX}, ${minY}, ${maxX}, ${maxY}, 4326)
      OR EXISTS (
        SELECT 1 FROM vialidad."Tramo" t
        WHERE t."caminoId" = c.id
          AND t.geom && ST_MakeEnvelope(${minX}, ${minY}, ${maxX}, ${maxY}, 4326)
      )
    )`);
  }
  if (filtros.departamentoId) condiciones.push(Prisma.sql`c."departamentoId" = ${filtros.departamentoId}`);
  if (filtros.tipoViaId) condiciones.push(Prisma.sql`c."tipoViaId" = ${filtros.tipoViaId}`);
  if (filtros.q) condiciones.push(Prisma.sql`c.nombre ILIKE ${`%${filtros.q}%`}`);
  if (filtros.activo !== undefined) condiciones.push(Prisma.sql`c.activo = ${filtros.activo}`);

  const where = Prisma.join(condiciones, ' AND ');
  const filas = await prisma.$queryRaw<FilaCamino[]>(Prisma.sql`
    SELECT ${seleccionConZoom(filtros.zoom ?? 14)}
    FROM vialidad."Camino" c
    JOIN vialidad."TipoVia" tv ON tv.id = c."tipoViaId"
    LEFT JOIN core."Departamento" d ON d.id = c."departamentoId"
    WHERE ${where}
    ORDER BY c.nombre
  `);
  return filas.map(mapCamino);
}

export async function buscarCamino(id: string) {
  const filas = await prisma.$queryRaw<FilaCamino[]>(Prisma.sql`
    SELECT ${seleccionConZoom(14)}
    FROM vialidad."Camino" c
    JOIN vialidad."TipoVia" tv ON tv.id = c."tipoViaId"
    LEFT JOIN core."Departamento" d ON d.id = c."departamentoId"
    WHERE c.id = ${id}
    LIMIT 1
  `);
  return filas[0] ? mapCamino(filas[0]) : null;
}

export async function crearCamino(datos: {
  nombre: string;
  localidad: string;
  tipoViaId: string;
  departamentoId: string | null;
  descripcion: string | null;
  activo: boolean;
  geojson: string;
}) {
  const filas = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    INSERT INTO vialidad."Camino"
      (id, nombre, localidad, "tipoViaId", "departamentoId", descripcion, activo, geom, "longitudKm", version, "creadoEn", "actualizadoEn")
    VALUES
      (gen_random_uuid()::text, ${datos.nombre}, ${datos.localidad}, ${datos.tipoViaId}, ${datos.departamentoId},
       ${datos.descripcion}, ${datos.activo},
       ST_SetSRID(ST_GeomFromGeoJSON(${datos.geojson}), 4326),
       ST_Length(ST_SetSRID(ST_GeomFromGeoJSON(${datos.geojson}), 4326)::geography) / 1000,
       1, now(), now())
    RETURNING id
  `);
  return filas[0]!.id;
}

export async function actualizarGeometriaCamino(id: string, geojson: string) {
  await prisma.$executeRaw`
    UPDATE vialidad."Camino"
    SET geom = ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326),
        "longitudKm" = ST_Length(ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326)::geography) / 1000,
        "actualizadoEn" = now(),
        version = version + 1
    WHERE id = ${id}
  `;
}

export async function departamentoPorGeometria(geojson: string) {
  const filas = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT d.id
    FROM core."Departamento" d
    WHERE d.geom IS NOT NULL
      AND ST_Intersects(d.geom, ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326))
    ORDER BY ST_Length(
      ST_CollectionExtract(
        ST_Intersection(d.geom, ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326)),
        2
      )::geography
    ) DESC
    LIMIT 1
  `);
  return filas[0]?.id ?? null;
}

export async function geometriaEsValida(geojson: string, tipo: 'LineString' | 'Point') {
  const filas = await prisma.$queryRaw<{ valida: boolean; tipo: string }[]>(Prisma.sql`
    SELECT ST_IsValid(g) AS valida, GeometryType(g) AS tipo
    FROM (SELECT ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326) AS g) s
  `);
  const fila = filas[0];
  // GeometryType devuelve LINESTRING/POINT en mayúsculas.
  return Boolean(fila?.valida && fila.tipo.toLowerCase() === tipo.toLowerCase());
}

export async function recalcularCamino(caminoId: string, db: Db = prisma as unknown as Db) {
  // La geometría maestra solo puede ser LineString. Si los tramos quedan
  // desconectados, se conserva la longitud total pero la geometría se anula.
  await db.$executeRaw`
    UPDATE vialidad."Camino" c
    SET geom = CASE
          WHEN ST_GeometryType(sub.geom) = 'ST_LineString' THEN sub.geom
          ELSE NULL
        END,
        "longitudKm" = sub.km,
        "actualizadoEn" = now(),
        version = c.version + 1
    FROM (
      SELECT ST_LineMerge(ST_Collect(geom)) AS geom,
             COALESCE(SUM("longitudKm"), 0) AS km
      FROM vialidad."Tramo"
      WHERE "caminoId" = ${caminoId} AND geom IS NOT NULL
      HAVING COUNT(*) > 0
    ) sub
    WHERE c.id = ${caminoId}
  `;

  // Un camino sin tramos no debe conservar una geometría vieja.
  await db.$executeRaw`
    UPDATE vialidad."Camino" c
    SET geom = NULL,
        "longitudKm" = 0,
        "actualizadoEn" = now(),
        version = c.version + 1
    WHERE c.id = ${caminoId}
      AND NOT EXISTS (
        SELECT 1 FROM vialidad."Tramo" t WHERE t."caminoId" = ${caminoId}
      )
  `;
}
