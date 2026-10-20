import { Router } from 'express';
import { dividirTramoSchema, fusionarTramoSchema, mantenimientoCreateSchema, tramoUpdateSchema } from '@sde/shared';
import { autenticar } from '../middleware/auth.js';
import { requierePermiso } from '../middleware/permiso.js';
import { validarBody, validarQuery } from '../middleware/validate.js';
import { limiteEscritura } from '../middleware/rateLimit.js';
import * as controller from '../modules/tramos.controller.js';
import * as mantenimientos from '../modules/mantenimientos.controller.js';
import { prioridadQuery, tramosQuery } from './schemas.js';

const router = Router();

router.get('/', validarQuery(tramosQuery), controller.listar);
router.get('/prioridad', validarQuery(prioridadQuery), controller.ranking);
router.get('/:id/historial', autenticar, requierePermiso('TRAMOS', 'ver'), controller.historial);

router.patch(
  '/:id',
  autenticar,
  limiteEscritura,
  requierePermiso('TRAMOS', 'editar'),
  validarBody(tramoUpdateSchema),
  controller.actualizar
);
router.post(
  '/:id/dividir',
  autenticar,
  limiteEscritura,
  requierePermiso('TRAMOS', 'editar'),
  validarBody(dividirTramoSchema),
  controller.dividir
);
router.post(
  '/:id/fusionar',
  autenticar,
  limiteEscritura,
  requierePermiso('TRAMOS', 'editar'),
  validarBody(fusionarTramoSchema),
  controller.fusionar
);
router.post(
  '/:id/mantenimientos',
  autenticar,
  limiteEscritura,
  requierePermiso('MANTENIMIENTOS', 'crear'),
  validarBody(mantenimientoCreateSchema),
  mantenimientos.crear
);
router.delete('/:id', autenticar, requierePermiso('TRAMOS', 'borrar'), controller.eliminar);

export default router;
