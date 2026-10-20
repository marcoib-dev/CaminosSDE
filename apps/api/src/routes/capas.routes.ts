import { Router } from 'express';
import { capaCreateSchema, capaUpdateSchema } from '@sde/shared';
import { autenticar, autorizar } from '../middleware/auth.js';
import { validarBody } from '../middleware/validate.js';
import * as controller from '../modules/capas.controller.js';

const router = Router();
router.get('/', controller.listar);
router.get('/permitidas', autenticar, controller.permitidas);
router.post('/', autenticar, autorizar('ADMIN'), validarBody(capaCreateSchema), controller.crear);
router.patch('/:id', autenticar, autorizar('ADMIN'), validarBody(capaUpdateSchema), controller.actualizar);

export default router;
