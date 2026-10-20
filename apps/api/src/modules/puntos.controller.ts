import { asyncHandler } from '../core/asyncHandler.js';
import { consulta, contexto } from '../core/context.js';
import { created, ok } from '../core/http.js';
import * as puntos from '../services/puntos.service.js';

export const listar = asyncHandler(async (req, res) => ok(res, await puntos.listar(consulta(req))));
export const crear = asyncHandler(async (req, res) => created(res, await puntos.crear(req.body, contexto(req)), 'Punto de interés creado.'));
export const actualizar = asyncHandler(async (req, res) => ok(res, await puntos.actualizar(req.params.id, req.body, contexto(req))));
export const eliminar = asyncHandler(async (req, res) => {
  await puntos.eliminar(req.params.id, contexto(req));
  res.json({ mensaje: 'Punto de interés eliminado.' });
});

export const categorias = asyncHandler(async (_req, res) => ok(res, await puntos.listarCategorias()));
export const crearCategoria = asyncHandler(async (req, res) => created(res, await puntos.crearCategoria(req.body, contexto(req)), 'Categoría creada.'));
export const eliminarCategoria = asyncHandler(async (req, res) => {
  await puntos.eliminarCategoria(req.params.id, contexto(req));
  res.json({ mensaje: 'Categoría eliminada.' });
});
