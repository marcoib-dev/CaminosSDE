import { Router } from 'express';
import {
  actualizarEstado,
  crear,
  listar,
} from '../controllers/usuarios.controller.js';
import { autenticar, autorizar } from '../middleware/auth.js';
import { validar } from '../middleware/validar.js';
import { idParamSchema } from '../validators/comun.js';
import {
  actualizarEstadoUsuarioSchema,
  crearUsuarioSchema,
} from '../validators/usuarios.validator.js';

const router = Router();
const soloAdmin = [autenticar, autorizar('ADMIN')];

router.get('/', ...soloAdmin, listar);

router.post('/', ...soloAdmin, validar({ body: crearUsuarioSchema }), crear);

router.patch(
  '/:id/estado',
  ...soloAdmin,
  validar({ params: idParamSchema, body: actualizarEstadoUsuarioSchema }),
  actualizarEstado
);

export default router;
