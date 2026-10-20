import { Router } from 'express';
import { caminoCreateSchema, caminoUpdateSchema, importarConfirmarSchema, tramoCreateSchema } from '@sde/shared';
import multer from 'multer';
import { autenticar } from '../middleware/auth.js';
import { requierePermiso } from '../middleware/permiso.js';
import { validarBody, validarQuery } from '../middleware/validate.js';
import { limiteEscritura } from '../middleware/rateLimit.js';
import * as controller from '../modules/caminos.controller.js';
import { caminosQuery } from './schemas.js';

const router = Router();

const subida = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024, files: 1 },
});

router.get('/', validarQuery(caminosQuery), controller.listar);
router.get('/:id', controller.obtener);
router.get('/:caminoId/tramos', controller.listarTramos);

router.post(
  '/',
  autenticar,
  limiteEscritura,
  requierePermiso('CAMINOS', 'crear'),
  validarBody(caminoCreateSchema),
  controller.crear
);
router.patch(
  '/:id',
  autenticar,
  limiteEscritura,
  requierePermiso('CAMINOS', 'editar'),
  validarBody(caminoUpdateSchema),
  controller.actualizar
);
router.delete('/:id', autenticar, requierePermiso('CAMINOS', 'borrar'), controller.eliminar);
router.post(
  '/importar',
  autenticar,
  limiteEscritura,
  requierePermiso('CAMINOS', 'crear'),
  subida.single('archivo'),
  controller.previsualizarImportacion
);
router.post(
  '/importar/confirmar',
  autenticar,
  limiteEscritura,
  requierePermiso('CAMINOS', 'crear'),
  requierePermiso('TRAMOS', 'crear'),
  validarBody(importarConfirmarSchema),
  controller.confirmarImportacion
);
router.post(
  '/:caminoId/tramos',
  autenticar,
  limiteEscritura,
  requierePermiso('TRAMOS', 'crear'),
  validarBody(tramoCreateSchema),
  controller.crearTramo
);

export default router;
