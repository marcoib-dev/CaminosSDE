import { Router } from 'express';
import { cambiarEstadoUsuarioSchema, crearUsuarioSchema } from '@sde/shared';
import { autenticar, autorizar } from '../middleware/auth.js';
import { validarBody } from '../middleware/validate.js';
import * as controller from '../modules/usuarios.controller.js';

const router = Router();
router.use(autenticar, autorizar('ADMIN'));
router.get('/', controller.listar);
router.post('/', validarBody(crearUsuarioSchema), controller.crear);
router.patch('/:id/estado', validarBody(cambiarEstadoUsuarioSchema), controller.actualizarEstado);

export default router;
