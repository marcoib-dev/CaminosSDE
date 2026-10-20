import { ApiError } from './ApiError.js';

// Bounding box aproximado de Santiago del Estero.
const PROVINCIA = { minLng: -65.2, minLat: -30.8, maxLng: -61.6, maxLat: -25.8 };

export const RANGO_PROVINCIA = PROVINCIA;

export function assertDentroDeProvincia(coordenadas: Array<[number, number]>) {
  const fuera = coordenadas.some(
    ([lng, lat]) =>
      lng < PROVINCIA.minLng || lng > PROVINCIA.maxLng || lat < PROVINCIA.minLat || lat > PROVINCIA.maxLat
  );
  if (fuera) {
    throw new ApiError(
      400,
      'La geometría cae fuera del área aproximada de Santiago del Estero. Revisá la captura GPS.'
    );
  }
}

export function assertLineaValida(coordenadas: Array<[number, number]>) {
  if (coordenadas.length < 2) {
    throw new ApiError(400, 'La línea necesita al menos dos puntos.');
  }
  const distintos = new Set(coordenadas.map(([lng, lat]) => `${lng},${lat}`));
  if (distintos.size < 2) {
    throw new ApiError(400, 'La línea necesita al menos dos puntos distintos.');
  }
  assertDentroDeProvincia(coordenadas);
}

export const geojsonDeCoordenadas = (coordenadas: Array<[number, number]>) =>
  JSON.stringify({ type: 'LineString', coordinates: coordenadas });

export const pointDeCoordenadas = (lng: number, lat: number) =>
  JSON.stringify({ type: 'Point', coordinates: [lng, lat] });
