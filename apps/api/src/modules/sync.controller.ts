import { asyncHandler } from '../core/asyncHandler.js';
import { ok } from '../core/http.js';
import { usuarioActual } from '../middleware/auth.js';
import * as sync from '../services/sync.service.js';

export const batch = asyncHandler(async (req, res) => {
  const usuario = usuarioActual(req);
  const resultados = await sync.procesarBatch(req.body.operaciones, {
    usuarioId: usuario.id,
    ip: req.ip ?? null,
    rol: usuario.rol,
  });
  ok(res, { resultados });
});
