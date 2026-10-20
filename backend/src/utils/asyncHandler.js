/**
 * Envuelve un handler async para que sus errores lleguen al middleware de errores.
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
