import { Router } from 'express';
import {
  actualizar,
  crear,
  eliminar,
  listar,
} from '../controllers/puntosInteres.controller.js';
import { autenticar, autorizar } from '../middleware/auth.js';
import { validar } from '../middleware/validar.js';
import { idParamSchema } from '../validators/comun.js';
import {
  actualizarPuntoInteresSchema,
  crearPuntoInteresSchema,
  listarPuntosQuerySchema,
} from '../validators/puntosInteres.validator.js';

const router = Router();
const soloEditores = [autenticar, autorizar('EDITOR', 'ADMIN')];

router.get('/', validar({ query: listarPuntosQuerySchema }), listar);

router.post('/', ...soloEditores, validar({ body: crearPuntoInteresSchema }), crear);

router.patch(
  '/:id',
  ...soloEditores,
  validar({ params: idParamSchema, body: actualizarPuntoInteresSchema }),
  actualizar
);

router.delete('/:id', ...soloEditores, validar({ params: idParamSchema }), eliminar);

export default router;
