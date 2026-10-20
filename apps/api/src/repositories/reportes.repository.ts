import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';

export async function kmPorEstado(departamentoId?: string) {
  const filtro = departamentoId
    ? Prisma.sql`WHERE c."departamentoId" = ${departamentoId}`
    : Prisma.empty;

  return prisma.$queryRaw<
    { clave: string; nombre: string; colorHex: string; km: number; tramos: number }[]
  >(Prisma.sql`
    WITH tramos_filtrados AS (
      SELECT t.id, t."estadoId", t."longitudKm"
      FROM vialidad."Tramo" t
      JOIN vialidad."Camino" c ON c.id = t."caminoId"
      ${filtro}
    )
    SELECT e.clave, e.nombre, e."colorHex",
           COALESCE(SUM(t."longitudKm"), 0)::float AS km,
           COUNT(t.id)::int AS tramos
    FROM vialidad."EstadoTramo" e
    LEFT JOIN tramos_filtrados t ON t."estadoId" = e.id
    GROUP BY e.id, e.clave, e.nombre, e."colorHex", e.orden
    ORDER BY e.orden
  `);
}

export async function kmPorDepartamento() {
  return prisma.$queryRaw<
    { id: string | null; nombre: string; km: number; tramos: number; caminos: number }[]
  >(Prisma.sql`
    SELECT d.id, COALESCE(d.nombre, 'Sin departamento') AS nombre,
           COALESCE(SUM(t."longitudKm"), 0)::float AS km,
           COUNT(t.id)::int AS tramos,
           COUNT(DISTINCT c.id)::int AS caminos
    FROM vialidad."Camino" c
    LEFT JOIN core."Departamento" d ON d.id = c."departamentoId"
    LEFT JOIN vialidad."Tramo" t ON t."caminoId" = c.id
    GROUP BY d.id, d.nombre
    ORDER BY km DESC
  `);
}

export async function mantenimientosAnuales(anio: number) {
  return prisma.$queryRaw<
    { mes: number; tipo: string; cantidad: number; costo: number }[]
  >(Prisma.sql`
    SELECT EXTRACT(MONTH FROM m.fecha)::int AS mes,
           m.tipo::text AS tipo,
           COUNT(*)::int AS cantidad,
           COALESCE(SUM(m.costo), 0)::float AS costo
    FROM vialidad."Mantenimiento" m
    WHERE EXTRACT(YEAR FROM m.fecha) = ${anio}
    GROUP BY mes, m.tipo
    ORDER BY mes, m.tipo
  `);
}

export async function resumenGeneral() {
  const filas = await prisma.$queryRaw<
    { caminos: number; tramos: number; km: number; puntos: number; mantenimientos: number }[]
  >(Prisma.sql`
    SELECT
      (SELECT COUNT(*)::int FROM vialidad."Camino") AS caminos,
      (SELECT COUNT(*)::int FROM vialidad."Tramo") AS tramos,
      (SELECT COALESCE(SUM("longitudKm"), 0)::float FROM vialidad."Tramo") AS km,
      (SELECT COUNT(*)::int FROM core."PuntoInteres") AS puntos,
      (SELECT COUNT(*)::int FROM vialidad."Mantenimiento") AS mantenimientos
  `);
  return filas[0];
}
