import * as turf from '@turf/turf';

/**
 * Pesos del cálculo de prioridad. Cambiar estos valores es suficiente
 * para ajustar el comportamiento del ranking (el máximo total es 100).
 */
export const PESOS_PRIORIDAD = {
  estado: {
    INTRANSITABLE: 50,
    REGULAR: 25,
    EN_OBRA: 10,
    TRANSITABLE: 0,
  },
  tipo: {
    TIERRA: 20,
    RIPIO: 12,
    ENRIPIADO_MEJORADO: 6,
    PAVIMENTADO: 0,
  },
  categoriaPunto: {
    HOSPITAL: 30,
    UPA: 20,
    ESCUELA: 15,
  },
  maximoCercania: 30,
  maximoTotal: 100,
};

const numeroPositivo = (valor, porDefecto) => {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0 ? numero : porDefecto;
};

/** Distancia máxima (km) a un punto de interés para sumar cercanía. */
export const UMBRAL_CERCANIA_KM = numeroPositivo(process.env.PRIORIDAD_UMBRAL_KM, 1);

const redondear = (valor) => Math.round(valor * 100) / 100;

/**
 * Calcula el puntaje de prioridad de un tramo (0 a 100) según su estado,
 * el tipo de superficie y la cercanía a puntos de interés.
 */
export function calcularPrioridad(
  tramo,
  puntosInteres = [],
  pesosCategoria = PESOS_PRIORIDAD.categoriaPunto
) {
  const puntajeEstado = PESOS_PRIORIDAD.estado[tramo.estado] ?? 0;
  const puntajeTipo = PESOS_PRIORIDAD.tipo[tramo.tipo] ?? 0;

  let puntajeCercania = 0;
  const puntosCercanos = [];

  if (puntosInteres.length > 0) {
    const linea = turf.lineString(tramo.geometria.coordinates);

    for (const punto of puntosInteres) {
      const distanciaKm = turf.pointToLineDistance(
        turf.point([punto.longitud, punto.latitud]),
        linea,
        { units: 'kilometers' }
      );

      if (distanciaKm > UMBRAL_CERCANIA_KM) continue;

      const aporte = pesosCategoria[punto.categoria] ?? 0;
      puntajeCercania += aporte;

      puntosCercanos.push({
        id: punto.id,
        nombre: punto.nombre,
        categoria: punto.categoria,
        distanciaKm: redondear(distanciaKm),
        aporte,
      });
    }
  }

  puntajeCercania = Math.min(puntajeCercania, PESOS_PRIORIDAD.maximoCercania);
  const total = Math.min(puntajeEstado + puntajeTipo + puntajeCercania, PESOS_PRIORIDAD.maximoTotal);

  return {
    puntaje: Math.round(total),
    estado: puntajeEstado,
    tipo: puntajeTipo,
    cercania: puntajeCercania,
    umbralCercaniaKm: UMBRAL_CERCANIA_KM,
    puntosCercanos: puntosCercanos.sort((a, b) => a.distanciaKm - b.distanciaKm),
  };
}
