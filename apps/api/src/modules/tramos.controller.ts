import { asyncHandler } from '../core/asyncHandler.js';
import { featureCollection } from '../core/features.js';
import { consulta, contexto } from '../core/context.js';
import { ok } from '../core/http.js';
import * as tramos from '../services/tramos.service.js';
import * as prioridad from '../services/prioridad.service.js';
import type { FiltrosTramos } from '../repositories/tramos.repository.js';

export const listar = asyncHandler(async (req, res) => {
  const datos = await tramos.listar(consulta<FiltrosTramos>(req));
  ok(
    res,
    featureCollection(datos, ({ geometria: _geometria, camino, ...resto }) => ({
      ...resto,
      camino,
    }))
  );
});

export const ranking = asyncHandler(async (req, res) => {
  const { limite = 200 } = consulta<{ limite?: number }>(req);
  ok(res, await prioridad.rankingPrioridad(limite));
});

export const actualizar = asyncHandler(async (req, res) => {
  ok(res, await tramos.actualizar(req.params.id, req.body, contexto(req)));
});

export const dividir = asyncHandler(async (req, res) => {
  ok(res, await tramos.dividir(req.params.id, req.body.kmCorte, contexto(req)));
});

export const fusionar = asyncHandler(async (req, res) => {
  ok(res, await tramos.fusionar(req.params.id, req.body.tramoAdyacenteId, contexto(req)));
});

export const historial = asyncHandler(async (req, res) => {
  ok(res, await tramos.historial(req.params.id));
});

export const eliminar = asyncHandler(async (req, res) => {
  await tramos.eliminar(req.params.id, contexto(req));
  res.json({ mensaje: 'Tramo eliminado.' });
});
