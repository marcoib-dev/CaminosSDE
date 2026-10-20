import { Router } from 'express';
import {
  actualizar,
  crear,
  listar,
} from '../controllers/sugerencias.controller.js';
import { autenticar, autorizar } from '../middleware/auth.js';
import { limitadorSugerencias } from '../middleware/rateLimiter.js';
import { validar } from '../middleware/validar.js';
import { idParamSchema } from '../validators/comun.js';
import {
  actualizarSugerenciaSchema,
  crearSugerenciaSchema,
  listarSugerenciasQuerySchema,
} from '../validators/sugerencias.validator.js';

const router = Router();
const soloEditores = [autenticar, autorizar('EDITOR', 'ADMIN')];

router.post(
  '/',
  limitadorSugerencias,
  validar({ body: crearSugerenciaSchema }),
  crear
);

router.get('/', ...soloEditores, validar({ query: listarSugerenciasQuerySchema }), listar);

router.patch(
  '/:id',
  ...soloEditores,
  validar({ params: idParamSchema, body: actualizarSugerenciaSchema }),
  actualizar
);

export default router;
