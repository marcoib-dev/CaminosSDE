import { Router } from 'express';
import {
  estadoTramoCreateSchema,
  estadoTramoUpdateSchema,
  tipoViaCreateSchema,
  tipoViaUpdateSchema,
} from '@sde/shared';
import { autenticar, autorizar } from '../middleware/auth.js';
import { validarBody } from '../middleware/validate.js';
import * as controller from '../modules/catalogos.controller.js';

const router = Router();
router.get('/tipos-via', controller.tiposVia);
router.get('/estados-tramo', controller.estadosTramo);
router.post('/tipos-via', autenticar, autorizar('ADMIN'), validarBody(tipoViaCreateSchema), controller.crearTipoVia);
router.post('/estados-tramo', autenticar, autorizar('ADMIN'), validarBody(estadoTramoCreateSchema), controller.crearEstadoTramo);
router.patch('/tipos-via/:id', autenticar, autorizar('ADMIN'), validarBody(tipoViaUpdateSchema), controller.actualizarTipoVia);
router.patch('/estados-tramo/:id', autenticar, autorizar('ADMIN'), validarBody(estadoTramoUpdateSchema), controller.actualizarEstadoTramo);

export default router;
