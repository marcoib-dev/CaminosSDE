import { prisma } from '../config/prisma.js';
import { asyncHandler } from '../core/asyncHandler.js';

export const health = asyncHandler(async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ estado: 'ok', fecha: new Date().toISOString() });
  } catch {
    res.status(503).json({ estado: 'error', mensaje: 'Base de datos no disponible.' });
  }
});
