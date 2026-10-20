import { z } from 'zod';
import { asyncHandler } from '../core/asyncHandler.js';
import { ok, mensaje } from '../core/http.js';
import { usuarioActual } from '../middleware/auth.js';
import * as auth from '../services/auth.service.js';

const refreshSchema = z.object({ refreshToken: z.string().min(1) });

export const login = asyncHandler(async (req, res) => {
  const resultado = await auth.login(req.body.email, req.body.password, req.ip);
  ok(res, resultado);
});

export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = refreshSchema.parse(req.body);
  ok(res, await auth.refrescar(refreshToken));
});

export const me = asyncHandler(async (req, res) => {
  ok(res, usuarioActual(req));
});

export const cambiarPassword = asyncHandler(async (req, res) => {
  await auth.cambiarPassword(usuarioActual(req).id, req.body.passwordActual, req.body.passwordNueva);
  mensaje(res, 'Contraseña actualizada.');
});
