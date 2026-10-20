import { Router } from 'express';
import { syncBatchSchema } from '@sde/shared';
import { autenticar } from '../middleware/auth.js';
import { validarBody } from '../middleware/validate.js';
import { limiteSync } from '../middleware/rateLimit.js';
import * as controller from '../modules/sync.controller.js';

const router = Router();
router.post('/batch', autenticar, limiteSync, validarBody(syncBatchSchema), controller.batch);

export default router;
