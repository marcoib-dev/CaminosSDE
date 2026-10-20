import { Router } from 'express';
import { sugerenciaCreateSchema, sugerenciaUpdateSchema } from '@sde/shared';
import { autenticar } from '../middleware/auth.js';
import { requierePermiso } from '../middleware/permiso.js';
import { validarBody, validarQuery } from '../middleware/validate.js';
import { limiteSugerencias } from '../middleware/rateLimit.js';
import * as controller from '../modules/sugerencias.controller.js';
import { z } from 'zod';

const router = Router();
router.post('/', limiteSugerencias, validarBody(sugerenciaCreateSchema), controller.crear);
const sugerenciasQuery = z.object({
  estado: z.enum(['PENDIENTE', 'REVISADA', 'DESCARTADA']).optional(),
  caminoId: z.string().min(1).optional(),
});

router.get('/', autenticar, requierePermiso('SUGERENCIAS', 'ver'), validarQuery(sugerenciasQuery), controller.listar);
router.patch('/:id', autenticar, requierePermiso('SUGERENCIAS', 'editar'), validarBody(sugerenciaUpdateSchema), controller.actualizar);

export default router;
