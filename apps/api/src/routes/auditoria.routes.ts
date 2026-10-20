import { Router } from 'express';
import { auditoriaQuerySchema } from '@sde/shared';
import { autenticar, autorizar } from '../middleware/auth.js';
import { validarQuery } from '../middleware/validate.js';
import * as controller from '../modules/auditoria.controller.js';

const router = Router();
router.get('/', autenticar, autorizar('ADMIN'), validarQuery(auditoriaQuerySchema), controller.listar);

export default router;
