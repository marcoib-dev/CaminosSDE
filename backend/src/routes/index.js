import { Router } from 'express';
import auditoriaRoutes from './auditoria.routes.js';
import authRoutes from './auth.routes.js';
import caminosRoutes from './caminos.routes.js';
import categoriasPuntosRoutes from './categoriasPuntos.routes.js';
import fotosRoutes from './fotos.routes.js';
import healthRoutes from './health.routes.js';
import puntosInteresRoutes from './puntosInteres.routes.js';
import sugerenciasRoutes from './sugerencias.routes.js';
import tramosRoutes from './tramos.routes.js';
import usuariosRoutes from './usuarios.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/caminos', caminosRoutes);
router.use('/fotos', fotosRoutes);
router.use('/tramos', tramosRoutes);
router.use('/puntos-interes', puntosInteresRoutes);
router.use('/categorias-puntos', categoriasPuntosRoutes);
router.use('/sugerencias', sugerenciasRoutes);
router.use('/usuarios', usuariosRoutes);
router.use('/auditoria', auditoriaRoutes);

export default router;
