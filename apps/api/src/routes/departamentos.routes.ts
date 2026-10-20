import { Router } from 'express';
import { departamentoCreateSchema, departamentoUpdateSchema } from '@sde/shared';
import { autenticar, autorizar } from '../middleware/auth.js';
import { validarBody } from '../middleware/validate.js';
import * as controller from '../modules/departamentos.controller.js';

const router = Router();
router.get('/', controller.listar);
router.post('/', autenticar, autorizar('ADMIN'), validarBody(departamentoCreateSchema), controller.crear);
router.patch(
  '/:id',
  autenticar,
  autorizar('ADMIN'),
  validarBody(departamentoUpdateSchema),
  controller.actualizar
);

export default router;
