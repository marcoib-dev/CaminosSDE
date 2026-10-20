import { Router } from 'express';
import { crear, eliminar, listar } from '../controllers/categoriasPuntos.controller.js';
import { autenticar, autorizar } from '../middleware/auth.js';
import { validar } from '../middleware/validar.js';
import { idParamSchema } from '../validators/comun.js';
import { crearCategoriaPuntoSchema } from '../validators/categoriasPuntos.validator.js';

const router = Router();
const soloEditores = [autenticar, autorizar('EDITOR', 'ADMIN')];

router.get('/', listar);

router.post('/', ...soloEditores, validar({ body: crearCategoriaPuntoSchema }), crear);

router.delete('/:id', ...soloEditores, validar({ params: idParamSchema }), eliminar);

export default router;
