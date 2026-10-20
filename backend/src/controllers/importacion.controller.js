import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { confirmarImportacion, previsualizarImportacion } from '../services/importacion.service.js';
import { mapeoImportacionSchema } from '../validators/importacion.validator.js';

/**
 * El mapeo llega como campo de texto del formulario multipart. Es opcional.
 */
function parsearMapeo(valor) {
  if (valor === undefined || valor === null || valor === '') return undefined;

  let json;
  try {
    json = JSON.parse(valor);
  } catch {
    throw new ApiError(400, 'El mapeo enviado no es un JSON válido.');
  }

  const resultado = mapeoImportacionSchema.safeParse(json);

  if (!resultado.success) {
    throw new ApiError(400, 'El mapeo enviado no es válido.', resultado.error.issues.map((issue) => ({
      campo: issue.path.join('.') || 'mapeo',
      mensaje: issue.message,
    })));
  }

  return resultado.data;
}

export const previsualizar = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'Adjuntá el archivo en el campo "archivo".');
  }

  const datos = await previsualizarImportacion({
    buffer: req.file.buffer,
    nombreArchivo: req.file.originalname,
    mapeo: parsearMapeo(req.body?.mapeo),
  });

  res.json({ datos });
});

export const confirmar = asyncHandler(async (req, res) => {
  const datos = await confirmarImportacion(req.body, {
    usuarioId: req.usuario.id,
    ip: req.ip,
  });

  res.status(201).json({
    datos,
    mensaje: `Se importaron ${datos.resumen.tramosCreados} tramo(s) en ${datos.resumen.caminosCreados} camino(s).`,
  });
});
