import { asyncHandler } from '../core/asyncHandler.js';
import { consulta, contexto } from '../core/context.js';
import { created, ok } from '../core/http.js';
import * as mantenimientos from '../services/mantenimientos.service.js';

export const crear = asyncHandler(async (req, res) => {
  created(res, await mantenimientos.crear(req.params.id, req.body, contexto(req)), 'Mantenimiento registrado.');
});

export const listar = asyncHandler(async (req, res) => {
  ok(res, await mantenimientos.listar(consulta(req)));
});

export const eliminar = asyncHandler(async (req, res) => {
  await mantenimientos.eliminar(req.params.id, contexto(req));
  res.json({ mensaje: 'Mantenimiento eliminado.' });
});
