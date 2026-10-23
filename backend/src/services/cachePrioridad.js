import { prisma } from '../config/prisma.js';
import { calcularPrioridad } from './prioridad.js';

const TTL_MS = 60 * 1000;

let cache = null;
let enCurso = null;
let generacion = 0;

/**
 * Invalida el cache. Se llama después de cualquier cambio que pueda alterar
 * el puntaje: tramos, puntos de interés o pesos de categorías.
 */
export function invalidarPrioridades() {
  generacion += 1;
  cache = null;
}

async function calcularTodo() {
  const [tramos, puntosInteres, categorias] = await Promise.all([
    prisma.tramo.findMany({
      include: {
        camino: { select: { id: true, nombre: true, localidad: true, departamento: true } },
      },
    }),
    prisma.puntoInteres.findMany({
      select: { id: true, nombre: true, categoria: true, latitud: true, longitud: true },
    }),
    prisma.categoriaPunto.findMany({ select: { clave: true, peso: true } }),
  ]);

  const pesosCategoria = Object.fromEntries(
    categorias.map((categoria) => [categoria.clave, categoria.peso])
  );

  return tramos
    .map((tramo) => ({
      ...tramo,
      prioridad: calcularPrioridad(tramo, puntosInteres, pesosCategoria),
    }))
    .sort(
      (a, b) =>
        b.prioridad.puntaje - a.prioridad.puntaje ||
        a.camino.nombre.localeCompare(b.camino.nombre, 'es')
    );
}

/**
 * Devuelve el ranking de prioridades cacheado por 60 segundos. Si varias
 * requests llegan con el cache frío, comparten el mismo cálculo en curso.
 */
export async function obtenerPrioridades() {
  if (cache && cache.expiraEn > Date.now()) {
    return cache.datos;
  }

  if (enCurso) return enCurso;

  const generacionActual = generacion;

  enCurso = (async () => {
    const datos = await calcularTodo();

    // Si hubo una invalidación mientras se calculaba, no guardamos el
    // resultado viejo: la próxima request vuelve a calcular.
    if (generacionActual === generacion) {
      cache = { datos, expiraEn: Date.now() + TTL_MS };
    }

    return datos;
  })();

  try {
    return await enCurso;
  } finally {
    enCurso = null;
  }
}
