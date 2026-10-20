import { ZodError } from 'zod';
import { ApiError } from './ApiError.js';

const nombreCampo = (path) => (path.length > 0 ? path.join('.') : 'cuerpo');

/**
 * Convierte los errores de zod en una lista legible en español.
 */
export function formatearErroresZod(error) {
  if (!(error instanceof ZodError)) return [];

  return error.issues.map((issue) => {
    const campo = nombreCampo(issue.path);
    if (issue.code === 'invalid_type' && /^Invalid input/i.test(issue.message)) {
      return { campo, mensaje: `El campo ${campo} tiene un tipo inválido.` };
    }

    return { campo, mensaje: issue.message };
  });
}

/**
 * Crea el error HTTP 400 a partir de un ZodError.
 */
export function apiErrorDesdeZod(error) {
  return new ApiError(400, 'Datos inválidos.', formatearErroresZod(error));
}
