import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { manejarErrores, rutaNoEncontrada } from './middleware/errorHandler.js';
import rutas from './routes/index.js';
import { ApiError } from './utils/ApiError.js';

const app = express();

if (env.nodeEnv === 'production') {
  // Render (y otros proxies) envían X-Forwarded-For.
  app.set('trust proxy', 1);
}

app.disable('x-powered-by');

const origenesPermitidos = env.frontendUrl
  .split(',')
  .map((origen) => origen.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origen, callback) {
      if (!origen) return callback(null, true);
      if (origenesPermitidos.includes('*') || origenesPermitidos.includes(origen)) {
        return callback(null, true);
      }
      if (env.nodeEnv !== 'production' && /^http:\/\/localhost:\d+$/.test(origen)) {
        return callback(null, true);
      }
      return callback(new ApiError(403, 'Origen no permitido por CORS.'));
    },
  })
);

// Límite amplio para la confirmación de importaciones (geometrías en GeoJSON).
app.use(express.json({ limit: '10mb' }));

app.use('/api', rutas);

app.use(rutaNoEncontrada);
app.use(manejarErrores);

export default app;
