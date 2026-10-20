import { Router } from 'express';
import { cambiarPassword, login, me } from '../controllers/auth.controller.js';
import { autenticar } from '../middleware/auth.js';
import { validar } from '../middleware/validar.js';
import { cambioPasswordSchema, loginSchema } from '../validators/auth.validator.js';

const router = Router();

router.post('/login', validar({ body: loginSchema }), login);
router.get('/me', autenticar, me);
router.post(
  '/change-password',
  autenticar,
  validar({ body: cambioPasswordSchema }),
  cambiarPassword
);

export default router;
