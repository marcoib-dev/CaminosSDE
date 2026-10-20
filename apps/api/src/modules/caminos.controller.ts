import { asyncHandler } from '../core/asyncHandler.js';
import { created, ok } from '../core/http.js';
import { featureCollection } from '../core/features.js';
import { consulta, contexto } from '../core/context.js';
import * as caminos from '../services/caminos.service.js';
import * as tramos from '../services/tramos.service.js';
import type { FiltrosCaminos } from '../repositories/caminos.repository.js';
import { ApiError } from '../core/ApiError.js';
import * as importar from '../services/importar.service.js';

export const listar = asyncHandler(async (req, res) => {
  const datos = await caminos.listar(consulta<FiltrosCaminos>(req));
  ok(
    res,
    featureCollection(datos, ({ geom: _geom, ...propiedades }) => propiedades as Record<string, unknown>)
  );
});

export const obtener = asyncHandler(async (req, res) => {
  ok(res, await caminos.obtener(req.params.id));
});

export const crear = asyncHandler(async (req, res) => {
  created(res, await caminos.crear(req.body, contexto(req)), 'Camino creado.');
});

export const actualizar = asyncHandler(async (req, res) => {
  ok(res, await caminos.actualizar(req.params.id, req.body, contexto(req)));
});

export const eliminar = asyncHandler(async (req, res) => {
  await caminos.eliminar(req.params.id, contexto(req));
  res.json({ mensaje: 'Camino eliminado.' });
});

export const listarTramos = asyncHandler(async (req, res) => {
  const datos = await tramos.listarDeCamino(req.params.caminoId);
  ok(
    res,
    featureCollection(datos, ({ geometria: _geometria, camino, ...resto }) => ({
      ...resto,
      camino,
    }))
  );
});

export const crearTramo = asyncHandler(async (req, res) => {
  created(res, await tramos.crear(req.params.caminoId, req.body, contexto(req)), 'Tramo creado.');
});


export const previsualizarImportacion = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'Adjuntá un archivo .gpkg, .kml o .geojson en el campo "archivo".');
  }
  ok(res, await importar.previsualizar(req.file));
});

export const confirmarImportacion = asyncHandler(async (req, res) => {
  ok(res, await importar.confirmar(req.body, contexto(req)));
});
