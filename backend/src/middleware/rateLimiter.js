import { rateLimit } from 'express-rate-limit';

/**
 * Límite para el envío público de sugerencias: 5 por IP cada 15 minutos.
 */
export const limitadorSugerencias = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    mensaje: 'Recibimos demasiadas sugerencias desde esta dirección. Probá nuevamente en unos minutos.',
  },
});
