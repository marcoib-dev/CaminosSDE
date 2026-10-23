import { Router } from 'express';
import {
  actualizar,
  crear,
  eliminar,
  listar,
  listarMapa,
  obtener,
} from '../controllers/caminos.controller.js';
import {
  confirmar as confirmarImportacion,
  previsualizar as previsualizarImportacion,
} from '../controllers/importacion.controller.js';
import { autenticar, autorizar } from '../middleware/auth.js';
import { subirArchivoDeImportacion } from '../middleware/subirArchivo.js';
import { validar } from '../middleware/validar.js';
import { idParamSchema } from '../validators/comun.js';
import {
  actualizarCaminoSchema,
  crearCaminoSchema,
  listarCaminosQuerySchema,
} from '../validators/caminos.validator.js';
import { confirmarImportacionSchema } from '../validators/importacion.validator.js';

const router = Router();
const soloEditores = [autenticar, autorizar('EDITOR', 'ADMIN')];

router.get('/', validar({ query: listarCaminosQuerySchema }), listar);
router.get('/mapa', listarMapa);
router.get('/:id', validar({ params: idParamSchema }), obtener);

router.post('/', ...soloEditores, validar({ body: crearCaminoSchema }), crear);

router.post(
  '/importar',
  ...soloEditores,
  subirArchivoDeImportacion,
  previsualizarImportacion
);

router.post(
  '/importar/confirmar',
  ...soloEditores,
  validar({ body: confirmarImportacionSchema }),
  confirmarImportacion
);

router.patch(
  '/:id',
  ...soloEditores,
  validar({ params: idParamSchema, body: actualizarCaminoSchema }),
  actualizar
);

router.delete('/:id', ...soloEditores, validar({ params: idParamSchema }), eliminar);

export default router;
