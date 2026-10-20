import { Router } from 'express';
import { crear, eliminar, firmarSubida } from '../controllers/fotos.controller.js';
import { autenticar, autorizar } from '../middleware/auth.js';
import { validar } from '../middleware/validar.js';
import { idParamSchema } from '../validators/comun.js';
import { crearFotoSchema } from '../validators/fotos.validator.js';

const router = Router();
const soloEditores = [autenticar, autorizar('EDITOR', 'ADMIN')];

router.post('/firma', ...soloEditores, firmarSubida);
router.post('/', ...soloEditores, validar({ body: crearFotoSchema }), crear);
router.delete('/:id', ...soloEditores, validar({ params: idParamSchema }), eliminar);

export default router;
