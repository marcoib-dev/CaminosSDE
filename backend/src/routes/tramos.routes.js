import { Router } from 'express';
import {
  actualizar,
  crear,
  dividir,
  eliminar,
  historial,
  listar,
  listarPrioridades,
} from '../controllers/tramos.controller.js';
import { autenticar, autorizar } from '../middleware/auth.js';
import { limitadorPrioridad } from '../middleware/rateLimiter.js';
import { validar } from '../middleware/validar.js';
import { idParamSchema } from '../validators/comun.js';
import {
  actualizarTramoSchema,
  crearTramoSchema,
  dividirTramoSchema,
  listarTramosQuerySchema,
} from '../validators/tramos.validator.js';

const router = Router();
const soloEditores = [autenticar, autorizar('EDITOR', 'ADMIN')];

router.get('/', validar({ query: listarTramosQuerySchema }), listar);
router.get('/prioridad', limitadorPrioridad, listarPrioridades);
router.get('/:id/historial', ...soloEditores, validar({ params: idParamSchema }), historial);

router.post('/', ...soloEditores, validar({ body: crearTramoSchema }), crear);

router.patch(
  '/:id/dividir',
  ...soloEditores,
  validar({ params: idParamSchema, body: dividirTramoSchema }),
  dividir
);

router.patch(
  '/:id',
  ...soloEditores,
  validar({ params: idParamSchema, body: actualizarTramoSchema }),
  actualizar
);

router.delete('/:id', ...soloEditores, validar({ params: idParamSchema }), eliminar);

export default router;
