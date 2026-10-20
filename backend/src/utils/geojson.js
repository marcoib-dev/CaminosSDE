import * as turf from '@turf/turf';
import { ApiError } from './ApiError.js';

const UMBRAL_KM = 0.001; // 1 metro
const UMBRAL_EXTREMO_KM = 0.0005; // 0,5 metros

const redondearKm = (km) => Math.round(km * 1000) / 1000;

/**
 * Convierte una geometría GeoJSON (LineString) almacenada en la base
 * en una feature de turf.
 */
function aFeatureLineString(geometria) {
  return turf.lineString(geometria.coordinates);
}

/**
 * Calcula la longitud en kilómetros de un LineString GeoJSON.
 */
export function calcularLongitudKm(geometria) {
  const linea = aFeatureLineString(geometria);
  const longitud = turf.length(linea, { units: 'kilometers' });

  if (!Number.isFinite(longitud) || longitud <= 0) {
    throw new ApiError(400, 'La geometría debe tener una longitud mayor a 0.');
  }

  return redondearKm(longitud);
}

const comoGeoJson = (feature) => ({
  type: 'LineString',
  coordinates: feature.geometry.coordinates,
});

/**
 * Divide un LineString entre dos puntos (inicio y fin del segmento central).
 * Devuelve hasta tres geometrías: tramo inicial, tramo central y tramo final.
 * Los puntos recibidos se ajustan a la línea con nearestPointOnLine.
 */
export function dividirGeometria(geometria, desde, hasta) {
  const linea = aFeatureLineString(geometria);
  const longitudTotal = turf.length(linea, { units: 'kilometers' });

  if (!Number.isFinite(longitudTotal) || longitudTotal <= UMBRAL_KM * 2) {
    throw new ApiError(400, 'El tramo es demasiado corto para dividirlo.');
  }

  const puntoDesde = turf.nearestPointOnLine(linea, turf.point(desde), { units: 'kilometers' });
  const puntoHasta = turf.nearestPointOnLine(linea, turf.point(hasta), { units: 'kilometers' });

  let inicio = puntoDesde;
  let fin = puntoHasta;

  // El orden de los puntos define el segmento central: siempre de menor a mayor.
  if (inicio.properties.location > fin.properties.location) {
    [inicio, fin] = [fin, inicio];
  }

  const longitudCentral = fin.properties.location - inicio.properties.location;
  if (longitudCentral <= UMBRAL_KM) {
    throw new ApiError(400, 'Los puntos de división deben estar separados por al menos 1 metro.');
  }

  const coordenadas = linea.geometry.coordinates;
  const medio = turf.lineSlice(inicio, fin, linea);

  const primero =
    inicio.properties.location > UMBRAL_EXTREMO_KM
      ? turf.lineSlice(coordenadas[0], inicio, linea)
      : null;

  const ultimo =
    longitudTotal - fin.properties.location > UMBRAL_EXTREMO_KM
      ? turf.lineSlice(fin, coordenadas[coordenadas.length - 1], linea)
      : null;

  if (!primero && !ultimo) {
    throw new ApiError(
      400,
      'Los puntos deben estar dentro del tramo y dejar al menos uno de los extremos fuera del segmento central.'
    );
  }

  const geometriaCentral = comoGeoJson(medio);
  if (geometriaCentral.coordinates.length < 2 || calcularLongitudKm(geometriaCentral) <= 0) {
    throw new ApiError(400, 'No se pudo generar un segmento central válido.');
  }

  return {
    primero: primero ? comoGeoJson(primero) : null,
    medio: geometriaCentral,
    ultimo: ultimo ? comoGeoJson(ultimo) : null,
  };
}
