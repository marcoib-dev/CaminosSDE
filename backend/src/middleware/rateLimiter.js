import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

const MENSAJE_GENERAL = {
  mensaje: 'Demasiadas solicitudes. Probá de nuevo en unos minutos.',
};

const MENSAJE_LOGIN = {
  mensaje: 'Demasiados intentos de inicio de sesión. Probá nuevamente en unos minutos.',
};

const MENSAJE_PRIORIDAD = {
  mensaje: 'Consultaste las prioridades demasiadas veces. Esperá un minuto.',
};

/**
 * Límite global de la API: 300 requests por IP cada 15 minutos.
 * El healthcheck de Docker queda excluido para que nunca devuelva 429.
 */
export const limitadorGeneral = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: (req) => req.originalUrl.split('?')[0] === '/api/health',
  message: MENSAJE_GENERAL,
});

/**
 * Límite por IP + email: 10 intentos fallidos cada 15 minutos.
 * Los logins correctos no consumen cupo.
 */
export const limitadorLoginPorCuenta = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) =>
    `${ipKeyGenerator(req.ip)}:${String(req.body?.email ?? '').trim().toLowerCase()}`,
  message: MENSAJE_LOGIN,
});

/**
 * Límite por IP: 30 intentos fallidos cada 15 minutos, para que rotar
 * emails no permita evadir el límite por cuenta.
 */
export const limitadorLoginPorIp = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: MENSAJE_LOGIN,
});

/**
 * `GET /api/tramos/prioridad` es público y costoso: 20 consultas por minuto.
 */
export const limitadorPrioridad = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: MENSAJE_PRIORIDAD,
});

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
