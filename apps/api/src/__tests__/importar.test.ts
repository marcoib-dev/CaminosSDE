import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { previsualizar } from '../services/importar.service.js';

const geojson = JSON.stringify({
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { nombre: 'Camino Norte' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-63.45, -28.97],
          [-63.4, -28.95],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Camino Sur' },
      geometry: {
        type: 'MultiLineString',
        coordinates: [
          [
            [-63.5, -29.0],
            [-63.45, -28.99],
          ],
          [
            [-63.44, -28.98],
            [-63.4, -28.97],
          ],
        ],
      },
    },
  ],
});

const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>Camino KML</name>
      <LineString><coordinates>-63.45,-28.97,0 -63.40,-28.95,0</coordinates></LineString>
    </Placemark>
  </Document>
</kml>`;

describe('importación de archivos', () => {
  it('previsualiza GeoJSON y separa MultiLineString en tramos', async () => {
    const resultado = await previsualizar({
      originalname: 'caminos.geojson',
      buffer: Buffer.from(geojson),
    });
    expect(resultado.total).toBe(3);
    expect(resultado.features.map((feature) => feature.nombre)).toEqual([
      'Camino Norte',
      'Camino Sur',
      'Camino Sur',
    ]);
    expect(resultado.features.every((feature) => feature.tipoGeometria === 'LineString')).toBe(true);
    expect(resultado.features.every((feature) => feature.longitudKm > 0)).toBe(true);
  });

  it('previsualiza KML', async () => {
    const resultado = await previsualizar({
      originalname: 'caminos.kml',
      buffer: Buffer.from(kml),
    });
    expect(resultado.total).toBe(1);
    expect(resultado.features[0]?.nombre).toBe('Camino KML');
    expect(resultado.features[0]?.geometria.type).toBe('LineString');
  });

  it('previsualiza un GeoPackage con tablas de entidades', async () => {
    const buffer = await readFile(
      new URL('../../../../datos/ejemplos/relevamiento-ejemplo.gpkg', import.meta.url)
    );
    const resultado = await previsualizar({ originalname: 'relevamiento-ejemplo.gpkg', buffer });
    expect(resultado.total).toBe(3);
    expect(resultado.features[0]?.nombre).toBe('Camino a Villa Mailín');
    expect(resultado.features.every((feature) => feature.tipoGeometria === 'LineString')).toBe(true);
  });

  it('rechaza formatos no soportados', async () => {
    await expect(
      previsualizar({ originalname: 'caminos.txt', buffer: Buffer.from('no es un mapa') })
    ).rejects.toThrow(/Formato no soportado/);
  });
});
