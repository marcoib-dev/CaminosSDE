import app from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';

const servidor = app.listen(env.port, () => {
  console.log(`API de Caminos Rurales SDE escuchando en http://localhost:${env.port}/api`);
});

async function cerrar(senal) {
  console.log(`\nRecibida señal ${senal}. Cerrando servidor...`);

  const temporizador = setTimeout(() => {
    process.exit(1);
  }, 10000);
  temporizador.unref();

  servidor.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => cerrar('SIGINT'));
process.on('SIGTERM', () => cerrar('SIGTERM'));
