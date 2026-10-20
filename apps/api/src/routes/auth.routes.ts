import { Router } from 'express';
import { changePasswordSchema, loginSchema } from '@sde/shared';
import { validarBody } from '../middleware/validate.js';
import { autenticar } from '../middleware/auth.js';
import { limiteEscritura } from '../middleware/rateLimit.js';
import * as controller from '../modules/auth.controller.js';

const router = Router();

router.post('/login', limiteEscritura, validarBody(loginSchema), controller.login);
router.post('/refresh', controller.refresh);
router.get('/me', autenticar, controller.me);
router.post('/change-password', autenticar, validarBody(changePasswordSchema), controller.cambiarPassword);

export default router;
