const RADIANES = Math.PI / 180;

/**
 * Devuelve el punto de la línea más cercano a una coordenada de Leaflet [lat, lng].
 * La comparación se hace con una proyección equirectangular local, suficiente
 * para distancias cortas. El backend vuelve a ajustar el punto con turf.
 */
export function puntoMasCercanoEnLinea(coordenadas, [lat, lng]) {
  if (!Array.isArray(coordenadas) || coordenadas.length === 0) return [lat, lng];
  if (coordenadas.length === 1) {
    const [unicaLng, unicaLat] = coordenadas[0];
    return [unicaLat, unicaLng];
  }

  const coseno = Math.cos(lat * RADIANES);
  const proyectar = ([coordLng, coordLat]) => [coordLng * coseno, coordLat];
  const objetivo = [lng * coseno, lat];

  let mejor = null;
  let mejorDistancia = Number.POSITIVE_INFINITY;

  for (let indice = 0; indice < coordenadas.length - 1; indice += 1) {
    const a = proyectar(coordenadas[indice]);
    const b = proyectar(coordenadas[indice + 1]);
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const largo2 = dx * dx + dy * dy;

    let t = 0;
    if (largo2 > 0) {
      t = ((objetivo[0] - a[0]) * dx + (objetivo[1] - a[1]) * dy) / largo2;
      t = Math.max(0, Math.min(1, t));
    }

    const puntoX = a[0] + t * dx;
    const puntoY = a[1] + t * dy;
    const distancia = (puntoX - objetivo[0]) ** 2 + (puntoY - objetivo[1]) ** 2;

    if (distancia < mejorDistancia) {
      mejorDistancia = distancia;

      const [aLng, aLat] = coordenadas[indice];
      const [bLng, bLat] = coordenadas[indice + 1];
      mejor = [aLat + t * (bLat - aLat), aLng + t * (bLng - aLng)];
    }
  }

  return mejor ?? [lat, lng];
}

/**
 * Convierte una lista de puntos de Leaflet [lat, lng] a GeoJSON [lng, lat].
 */
export function aGeometriaLineString(puntos) {
  return {
    type: 'LineString',
    coordinates: puntos.map(([lat, lng]) => [
      Number(lng.toFixed(6)),
      Number(lat.toFixed(6)),
    ]),
  };
}
