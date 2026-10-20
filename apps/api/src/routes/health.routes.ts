import { Router } from 'express';
import { health } from '../modules/health.controller.js';

const router = Router();
router.get('/', health);
export default router;
