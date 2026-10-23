import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { manejarErrores, rutaNoEncontrada } from './middleware/errorHandler.js';
import { limitadorGeneral } from './middleware/rateLimiter.js';
import rutas from './routes/index.js';
import { ApiError } from './utils/ApiError.js';

const app = express();

if (env.nodeEnv === 'production') {
  // Un solo proxy delante (Nginx). Nginx sobrescribe X-Forwarded-For con la
  // IP real del cliente, tomada de CF-Connecting-IP cuando llega por el túnel.
  app.set('trust proxy', 1);
}

app.disable('x-powered-by');

// Cabeceras de endurecimiento. La CSP se define en Nginx, que es el único
// origen que sirve el frontend. HSTS queda para cuando el dominio funcione
// por HTTPS a través de Cloudflare Tunnel. Las cabeceras que también agrega
// Nginx (X-Content-Type-Options, X-Frame-Options, Referrer-Policy) se
// desactivan acá para no enviarlas duplicadas en las respuestas proxied.
app.use(
  helmet({
    contentSecurityPolicy: false,
    hsts: false,
    xContentTypeOptions: false,
    xFrameOptions: false,
    referrerPolicy: false,
  })
);

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

// Límite global por IP. Va antes de parsear el body para cortar el abuso temprano.
app.use('/api', limitadorGeneral);

// Confirmación de importación: geometrías en GeoJSON, hasta 10 MB. Se monta
// antes del parser global para que el límite de 1 MB no la rechace.
app.use('/api/caminos/importar/confirmar', express.json({ limit: '10mb' }));

// Resto de la API: 1 MB es suficiente para cualquier body normal.
app.use(express.json({ limit: '1mb' }));

app.use('/api', rutas);

app.use(rutaNoEncontrada);
app.use(manejarErrores);

export default app;
