import { Router } from 'express';
import { infraestructuraCreateSchema, infraestructuraUpdateSchema } from '@sde/shared';
import { autenticar } from '../middleware/auth.js';
import { requierePermiso } from '../middleware/permiso.js';
import { validarBody, validarQuery } from '../middleware/validate.js';
import * as controller from '../modules/infraestructura.controller.js';
import { infraestructuraQuery } from './schemas.js';

const router = Router();
router.get('/', validarQuery(infraestructuraQuery), controller.listar);
router.post(
  '/',
  autenticar,
  requierePermiso('INFRAESTRUCTURA', 'crear'),
  validarBody(infraestructuraCreateSchema),
  controller.crear
);
router.patch(
  '/:id',
  autenticar,
  requierePermiso('INFRAESTRUCTURA', 'editar'),
  validarBody(infraestructuraUpdateSchema),
  controller.actualizar
);
router.delete('/:id', autenticar, requierePermiso('INFRAESTRUCTURA', 'borrar'), controller.eliminar);

export default router;
