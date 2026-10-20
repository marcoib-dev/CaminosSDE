import { asyncHandler } from '../core/asyncHandler.js';
import { created, ok } from '../core/http.js';
import { contexto } from '../core/context.js';
import { registrarAuditoria } from '../core/auditoria.js';
import { usuarioActual } from '../middleware/auth.js';
import * as capas from '../services/capas.service.js';

export const listar = asyncHandler(async (_req, res) => ok(res, await capas.listar()));
export const permitidas = asyncHandler(async (req, res) => ok(res, await capas.permitidas(usuarioActual(req).rol)));
export const crear = asyncHandler(async (req, res) => {
  const capa = await capas.crear(req.body);
  await registrarAuditoria({ ...contexto(req), accion: 'CREAR', entidad: 'Capa', entidadId: capa.id });
  created(res, capa, 'Capa creada.');
});

export const actualizar = asyncHandler(async (req, res) => {
  const capa = await capas.actualizar(req.params.id, req.body);
  await registrarAuditoria({ ...contexto(req), accion: 'EDITAR', entidad: 'Capa', entidadId: capa.id });
  ok(res, capa);
});
