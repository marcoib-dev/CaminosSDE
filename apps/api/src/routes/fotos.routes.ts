import { Router } from 'express';
import { fotoCreateSchema } from '@sde/shared';
import { autenticar } from '../middleware/auth.js';
import { requierePermiso } from '../middleware/permiso.js';
import { validarBody } from '../middleware/validate.js';
import * as controller from '../modules/fotos.controller.js';

const router = Router();
router.post('/upload-url', autenticar, requierePermiso('FOTOS', 'crear'), controller.firmar);
router.post('/', autenticar, requierePermiso('FOTOS', 'crear'), validarBody(fotoCreateSchema), controller.crear);
router.delete('/:id', autenticar, requierePermiso('FOTOS', 'borrar'), controller.eliminar);

export default router;
