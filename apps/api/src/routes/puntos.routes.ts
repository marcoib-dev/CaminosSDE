import { Router } from 'express';
import { z } from 'zod';
import { autenticar } from '../middleware/auth.js';
import { requierePermiso } from '../middleware/permiso.js';
import { validarBody, validarQuery } from '../middleware/validate.js';
import * as controller from '../modules/puntos.controller.js';
import { puntosQuery } from './schemas.js';

const crearSchema = z.object({
  nombre: z.string().min(1),
  categoria: z.string().min(1),
  latitud: z.number().min(-90).max(90),
  longitud: z.number().min(-180).max(180),
});
const actualizarSchema = crearSchema.partial();
const categoriaSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2)
    .regex(/[\p{L}\p{N}]/u, 'El nombre debe incluir al menos una letra o número.'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  inicial: z.string().max(2).optional(),
  peso: z.number().int().min(0).max(30).optional(),
  orden: z.number().int().min(0).optional(),
});

const router = Router();
router.get('/', validarQuery(puntosQuery), controller.listar);
router.post('/', autenticar, requierePermiso('PUNTOS_INTERES', 'crear'), validarBody(crearSchema), controller.crear);
router.patch('/:id', autenticar, requierePermiso('PUNTOS_INTERES', 'editar'), validarBody(actualizarSchema), controller.actualizar);
router.delete('/:id', autenticar, requierePermiso('PUNTOS_INTERES', 'borrar'), controller.eliminar);

export const categoriasRouter = Router();
categoriasRouter.get('/', controller.categorias);
categoriasRouter.post('/', autenticar, requierePermiso('PUNTOS_INTERES', 'crear'), validarBody(categoriaSchema), controller.crearCategoria);
categoriasRouter.delete('/:id', autenticar, requierePermiso('PUNTOS_INTERES', 'borrar'), controller.eliminarCategoria);

export default router;
