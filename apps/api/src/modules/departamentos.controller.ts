import { asyncHandler } from '../core/asyncHandler.js';
import { created, ok } from '../core/http.js';
import { contexto } from '../core/context.js';
import { registrarAuditoria } from '../core/auditoria.js';
import * as departamentos from '../services/departamentos.service.js';

export const listar = asyncHandler(async (_req, res) => ok(res, await departamentos.listar()));
export const crear = asyncHandler(async (req, res) => {
  const depto = await departamentos.crear(req.body);
  await registrarAuditoria({ ...contexto(req), accion: 'CREAR', entidad: 'Departamento', entidadId: depto?.id });
  created(res, depto, 'Departamento creado.');
});

export const actualizar = asyncHandler(async (req, res) => {
  const depto = await departamentos.actualizar(req.params.id, req.body);
  await registrarAuditoria({ ...contexto(req), accion: 'EDITAR', entidad: 'Departamento', entidadId: depto?.id });
  ok(res, depto);
});
