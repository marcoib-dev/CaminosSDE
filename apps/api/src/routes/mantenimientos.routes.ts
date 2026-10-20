import { Router } from 'express';
import { autenticar } from '../middleware/auth.js';
import { requierePermiso } from '../middleware/permiso.js';
import { validarQuery } from '../middleware/validate.js';
import * as controller from '../modules/mantenimientos.controller.js';
import { mantenimientosQuery } from './schemas.js';

const router = Router();
router.get('/', autenticar, requierePermiso('MANTENIMIENTOS', 'ver'), validarQuery(mantenimientosQuery), controller.listar);
router.delete('/:id', autenticar, requierePermiso('MANTENIMIENTOS', 'borrar'), controller.eliminar);

export default router;
