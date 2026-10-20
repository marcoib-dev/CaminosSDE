import rateLimit from 'express-rate-limit';

const saltarEnTest = () => process.env.NODE_ENV === 'test';

export const limiteEscritura = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: saltarEnTest,
  message: { mensaje: 'Demasiadas operaciones. Esperá unos minutos.' },
});

export const limiteSugerencias = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: saltarEnTest,
  message: { mensaje: 'Enviaste demasiadas sugerencias. Probá más tarde.' },
});

export const limiteSync = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: saltarEnTest,
  message: { mensaje: 'Demasiadas sincronizaciones. Esperá unos minutos.' },
});
