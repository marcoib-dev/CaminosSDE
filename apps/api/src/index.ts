import { app, logger } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';

const servidor = app.listen(env.PORT, () => {
  logger.info(`API escuchando en http://localhost:${env.PORT}/api`);
});

async function cerrar(senal: string) {
  logger.info(`Recibida ${senal}, cerrando...`);
  servidor.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => void cerrar('SIGINT'));
process.on('SIGTERM', () => void cerrar('SIGTERM'));
