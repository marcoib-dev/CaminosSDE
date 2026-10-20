import { asyncHandler } from '../core/asyncHandler.js';
import { created, ok } from '../core/http.js';
import { contexto } from '../core/context.js';
import * as fotos from '../services/fotos.service.js';

export const firmar = asyncHandler(async (_req, res) => ok(res, fotos.firmarSubida()));
export const crear = asyncHandler(async (req, res) => {
  created(res, await fotos.crear(req.body, contexto(req)), 'Foto registrada.');
});
export const eliminar = asyncHandler(async (req, res) => {
  await fotos.eliminar(req.params.id, contexto(req));
  res.json({ mensaje: 'Foto eliminada.' });
});
