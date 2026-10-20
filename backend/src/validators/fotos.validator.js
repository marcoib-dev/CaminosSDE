import { z } from 'zod';

export const crearFotoSchema = z.object({
  url: z
    .string({ error: 'La URL de la foto es obligatoria.' })
    .trim()
    .url({ error: 'La URL de la foto no es válida.' })
    .max(2000, { error: 'La URL no puede superar los 2000 caracteres.' }),
  descripcion: z
    .string({ error: 'La descripción debe ser texto.' })
    .trim()
    .max(300, { error: 'La descripción no puede superar los 300 caracteres.' })
    .nullish(),
  caminoId: z
    .string({ error: 'El camino es obligatorio.' })
    .trim()
    .min(1, { error: 'El camino es obligatorio.' }),
  tramoId: z
    .string({ error: 'El tramo debe ser texto.' })
    .trim()
    .min(1, { error: 'El id del tramo no puede estar vacío.' })
    .nullish(),
});
