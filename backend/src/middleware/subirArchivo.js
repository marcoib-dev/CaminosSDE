import path from 'node:path';
import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

export const TAMANO_MAXIMO_MB = 25;

const EXTENSIONES_PERMITIDAS = new Set(['.kml', '.gpkg']);

const manejador = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANO_MAXIMO_MB * 1024 * 1024, files: 1 },
  fileFilter(req, archivo, callback) {
    const extension = path.extname(archivo.originalname ?? '').toLowerCase();

    if (!EXTENSIONES_PERMITIDAS.has(extension)) {
      return callback(
        new ApiError(400, 'El archivo debe tener extensión .kml o .gpkg.')
      );
    }

    callback(null, true);
  },
});

/**
 * Recibe el archivo de importación en el campo `archivo` y lo deja en
 * `req.file` como buffer en memoria. Traduce los errores de multer a ApiError.
 */
export function subirArchivoDeImportacion(req, res, next) {
  manejador.single('archivo')(req, res, (error) => {
    if (!error) return next();

    if (error.code === 'LIMIT_FILE_SIZE') {
      return next(
        new ApiError(413, `El archivo supera el límite de ${TAMANO_MAXIMO_MB} MB.`)
      );
    }

    if (error instanceof multer.MulterError) {
      return next(new ApiError(400, 'No se pudo leer el archivo enviado.'));
    }

    next(error);
  });
}
