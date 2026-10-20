import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pino from 'pino';
import pinoHttp from 'pino-http';
import * as Sentry from '@sentry/node';
import { env, origenesPermitidos } from './config/env.js';
import { ApiError } from './core/ApiError.js';
import { manejarErrores, rutaNoEncontrada } from './middleware/errorHandler.js';
import rutas from './routes/index.js';

if (env.SENTRY_DSN) {
  Sentry.init({ dsn: env.SENTRY_DSN, environment: env.NODE_ENV, tracesSampleRate: 0.1 });
}

export const logger = pino({ level: env.NODE_ENV === 'development' ? 'debug' : 'info' });

export const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors({
    origin(origen, callback) {
      if (!origen) return callback(null, true);
      if (origenesPermitidos.includes('*') || origenesPermitidos.includes(origen)) {
        return callback(null, true);
      }
      if (env.NODE_ENV !== 'production' && /^http:\/\/localhost:\d+$/.test(origen)) {
        return callback(null, true);
      }
      return callback(new ApiError(403, 'Origen no permitido por CORS.'));
    },
    credentials: true,
  })
);
app.use(pinoHttp({ logger }));
// La confirmación de importación puede incluir geometrías de hasta 30 MB.
app.use(express.json({ limit: '32mb' }));

app.use('/api', rutas);

app.use(rutaNoEncontrada);
if (env.SENTRY_DSN) Sentry.setupExpressErrorHandler(app);
app.use(manejarErrores);
