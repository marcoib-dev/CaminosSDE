import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';

export async function rankingPrioridad(limite = 200) {
  const umbralMetros = env.PRIORIDAD_UMBRAL_KM * 1000;
  return prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
    WITH base AS (
      SELECT t.id, t."caminoId", t."longitudKm", t."estadoId", t.observaciones, t.geom,
             t."creadoEn", t."actualizadoEn",
             e.clave AS estado, e.nombre AS "estadoNombre", e."colorHex" AS "estadoColor",
             c.nombre AS "caminoNombre", c.localidad, tv.clave AS "tipoVia",
             ST_AsGeoJSON(t.geom)::json AS geometria
      FROM vialidad."Tramo" t
      JOIN vialidad."EstadoTramo" e ON e.id = t."estadoId"
      JOIN vialidad."Camino" c ON c.id = t."caminoId"
      JOIN vialidad."TipoVia" tv ON tv.id = c."tipoViaId"
    ),
    puntajes AS (
      SELECT b.*,
        CASE b.estado WHEN 'INTRANSITABLE' THEN 50 WHEN 'REGULAR' THEN 25 WHEN 'EN_OBRA' THEN 10 ELSE 0 END AS p_estado,
        CASE b."tipoVia" WHEN 'CAMINO_RURAL' THEN 20 WHEN 'CALLE' THEN 10 ELSE 0 END AS p_tipo,
        LEAST(30, COALESCE((
          SELECT SUM(cp.peso)
          FROM core."PuntoInteres" p
          JOIN core."CategoriaPunto" cp ON cp.clave = p.categoria
          WHERE p.geom IS NOT NULL
            AND ST_DWithin(p.geom::geography, b.geom::geography, ${umbralMetros})
        ), 0)) AS p_cercania
      FROM base b
      WHERE b.geom IS NOT NULL
    )
    SELECT id, "caminoId", "longitudKm", "estadoId", observaciones, "creadoEn", "actualizadoEn",
           estado, "estadoNombre", "estadoColor", "caminoNombre", localidad, "tipoVia", geometria,
           p_estado::float AS "puntajeEstado",
           p_tipo::float AS "puntajeTipo",
           p_cercania::float AS "puntajeCercania",
           LEAST(100, p_estado + p_tipo + p_cercania)::float AS puntaje
    FROM puntajes
    ORDER BY puntaje DESC, "caminoNombre"
    LIMIT ${limite}
  `);
}
