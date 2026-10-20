import { ZodError } from 'zod';
import { apiErrorDesdeZod } from '../utils/zod.js';

/**
 * Valida body, params y query con zod.
 * El query validado queda disponible en req.consulta.
 */
export function validar({ body, params, query } = {}) {
  return (req, res, next) => {
    try {
      if (body) req.body = body.parse(req.body);
      if (params) req.params = params.parse(req.params);
      if (query) req.consulta = query.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(apiErrorDesdeZod(error));
      }
      next(error);
    }
  };
}
