import { asyncHandler } from '../core/asyncHandler.js';
import { ok } from '../core/http.js';
import * as reportes from '../services/reportes.service.js';

export const kmPorEstado = asyncHandler(async (req, res) => {
  const { departamentoId } = req.query as { departamentoId?: string };
  ok(res, await reportes.kmPorEstado(departamentoId));
});

export const kmPorDepartamento = asyncHandler(async (_req, res) => {
  ok(res, await reportes.kmPorDepartamento());
});

export const mantenimientosAnuales = asyncHandler(async (req, res) => {
  const anio = Number((req.query as { anio?: string }).anio ?? new Date().getFullYear());
  ok(res, await reportes.mantenimientosAnuales(anio));
});

export const resumen = asyncHandler(async (_req, res) => {
  ok(res, await reportes.resumenGeneral());
});
