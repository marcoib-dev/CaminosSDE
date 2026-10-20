import { Router } from 'express';
import { validarQuery } from '../middleware/validate.js';
import * as controller from '../modules/reportes.controller.js';
import { reportesQuery } from './schemas.js';

const router = Router();
router.get('/resumen', controller.resumen);
router.get('/km-por-estado', validarQuery(reportesQuery), controller.kmPorEstado);
router.get('/km-por-departamento', controller.kmPorDepartamento);
router.get('/mantenimientos-anuales', validarQuery(reportesQuery), controller.mantenimientosAnuales);

export default router;
