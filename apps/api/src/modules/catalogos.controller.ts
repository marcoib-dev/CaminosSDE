import { asyncHandler } from '../core/asyncHandler.js';
import { created, ok } from '../core/http.js';
import { contexto } from '../core/context.js';
import { registrarAuditoria } from '../core/auditoria.js';
import * as catalogos from '../services/catalogos.service.js';

export const tiposVia = asyncHandler(async (_req, res) => ok(res, await catalogos.tiposVia()));
export const estadosTramo = asyncHandler(async (_req, res) => ok(res, await catalogos.estadosTramo()));

export const crearTipoVia = asyncHandler(async (req, res) => {
  const tipo = await catalogos.crearTipoVia(req.body);
  await registrarAuditoria({ ...contexto(req), accion: 'CREAR', entidad: 'TipoVia', entidadId: tipo.id });
  created(res, tipo, 'Tipo de vía creado.');
});

export const crearEstadoTramo = asyncHandler(async (req, res) => {
  const estado = await catalogos.crearEstadoTramo(req.body);
  await registrarAuditoria({ ...contexto(req), accion: 'CREAR', entidad: 'EstadoTramo', entidadId: estado.id });
  created(res, estado, 'Estado de tramo creado.');
});

export const actualizarTipoVia = asyncHandler(async (req, res) => {
  const tipo = await catalogos.actualizarTipoVia(req.params.id, req.body);
  await registrarAuditoria({ ...contexto(req), accion: 'EDITAR', entidad: 'TipoVia', entidadId: tipo.id });
  ok(res, tipo);
});

export const actualizarEstadoTramo = asyncHandler(async (req, res) => {
  const estado = await catalogos.actualizarEstadoTramo(req.params.id, req.body);
  await registrarAuditoria({ ...contexto(req), accion: 'EDITAR', entidad: 'EstadoTramo', entidadId: estado.id });
  ok(res, estado);
});
