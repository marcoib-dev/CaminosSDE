import { Router } from 'express';
import { listar } from '../controllers/auditoria.controller.js';
import { autenticar, autorizar } from '../middleware/auth.js';
import { validar } from '../middleware/validar.js';
import { listarAuditoriaQuerySchema } from '../validators/auditoria.validator.js';

const router = Router();

router.get(
  '/',
  autenticar,
  autorizar('ADMIN'),
  validar({ query: listarAuditoriaQuerySchema }),
  listar
);

export default router;
