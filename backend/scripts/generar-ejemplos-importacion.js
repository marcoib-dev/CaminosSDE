/**
 * Genera archivos de ejemplo para probar la importación (etapa 4).
 *
 * Uso:
 *   node scripts/generar-ejemplos-importacion.js
 *
 * Crea en la carpeta `ejemplos/`:
 *   - relevamiento-ejemplo.kml: un LineString con altitud (como exporta QGIS)
 *     y un MultiLineString en EPSG:4326.
 *   - relevamiento-ejemplo.gpkg: una capa en EPSG:4326 (con LineString,
 *     MultiLineString y un Polygon que debe descartarse) y otra capa en
 *     EPSG:3857 para verificar la reproyección.
 */

import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FeatureColumn,
  GeoPackageAPI,
  GeoPackageDataType,
  GeometryData,
  ProjectionConstants,
} from '@ngageoint/geopackage';
import wkx from 'wkx';

const directorio = path.dirname(fileURLToPath(import.meta.url));
const destino = path.join(directorio, '..', 'ejemplos');

const KML = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Relevamiento de ejemplo</name>
    <Placemark>
      <name>Camino a Villa Mailín</name>
      <description>Relevado en octubre de 2026 con GPS.</description>
      <ExtendedData>
        <Data name="estado"><value>Regular</value></Data>
        <Data name="superficie"><value>Tierra</value></Data>
        <Data name="localidad"><value>Villa Mailín</value></Data>
        <Data name="departamento"><value>Avellaneda</value></Data>
      </ExtendedData>
      <LineString>
        <coordinates>
          -63.2700,-28.5100,0 -63.2650,-28.5150,0 -63.2600,-28.5200,0
        </coordinates>
      </LineString>
    </Placemark>
    <Placemark>
      <name>Camino a Los Telares</name>
      <ExtendedData>
        <Data name="estado"><value>Malo</value></Data>
        <Data name="superficie"><value>Ripio</value></Data>
        <Data name="localidad"><value>Los Telares</value></Data>
        <Data name="departamento"><value>Salavina</value></Data>
      </ExtendedData>
      <MultiGeometry>
        <LineString>
          <coordinates>
            -63.4500,-28.9800 -63.4450,-28.9750
          </coordinates>
        </LineString>
        <LineString>
          <coordinates>
            -63.4400,-28.9700 -63.4350,-28.9650 -63.4300,-28.9600
          </coordinates>
        </LineString>
      </MultiGeometry>
    </Placemark>
  </Document>
</kml>
`;

const RADIO_TIERRA = 6378137;

const aMercator = ([longitud, latitud]) => {
  const x = (longitud * Math.PI * RADIO_TIERRA) / 180;
  const y = RADIO_TIERRA * Math.log(Math.tan(Math.PI / 4 + (latitud * Math.PI) / 360));
  return [x, y];
};

function crearFila(dao, srsId, geojson, propiedades) {
  const geometry = new GeometryData();
  geometry.setSrsId(srsId);
  geometry.setGeometry(wkx.Geometry.parseGeoJSON(geojson));
  dao.create({ id: null, geometry: geometry.toData(), ...propiedades });
}

async function generarGpkg() {
  const ruta = path.join(destino, 'relevamiento-ejemplo.gpkg');
  await rm(ruta, { force: true });

  const gpkg = await GeoPackageAPI.create(ruta);

  const columnas = (extra) => [
    FeatureColumn.createPrimaryKeyColumn(0, 'id'),
    FeatureColumn.createGeometryColumn(1, 'geometry', 0, false, null),
    ...extra.map((nombre, indice) =>
      FeatureColumn.createColumn(indice + 2, nombre, GeoPackageDataType.TEXT)
    ),
  ];

  // Capa en EPSG:4326 con las mismas geometrías que el KML.
  gpkg.createFeatureTable(
    'caminos_relevados',
    null,
    columnas(['nombre', 'estado', 'superficie', 'localidad', 'departamento']),
    undefined,
    ProjectionConstants.EPSG_CODE_4326
  );
  const dao4326 = gpkg.getFeatureDao('caminos_relevados');

  crearFila(
    dao4326,
    ProjectionConstants.EPSG_CODE_4326,
    { type: 'LineString', coordinates: [[-63.27, -28.51], [-63.265, -28.515], [-63.26, -28.52]] },
    { nombre: 'Camino a Villa Mailín', estado: 'Regular', superficie: 'Tierra', localidad: 'Villa Mailín', departamento: 'Avellaneda' }
  );
  crearFila(
    dao4326,
    ProjectionConstants.EPSG_CODE_4326,
    {
      type: 'MultiLineString',
      coordinates: [
        [[-63.45, -28.98], [-63.445, -28.975]],
        [[-63.44, -28.97], [-63.435, -28.965], [-63.43, -28.96]],
      ],
    },
    { nombre: 'Camino a Los Telares', estado: 'Malo', superficie: 'Ripio', localidad: 'Los Telares', departamento: 'Salavina' }
  );
  crearFila(
    dao4326,
    ProjectionConstants.EPSG_CODE_4326,
    {
      type: 'Polygon',
      coordinates: [[[-63.5, -29], [-63.49, -29], [-63.49, -28.99], [-63.5, -29]]],
    },
    { nombre: 'Polígono que debe descartarse', estado: 'Bueno', superficie: 'Pavimentado', localidad: 'Añatuya', departamento: 'General Taboada' }
  );

  // Capa en EPSG:3857 para comprobar la reproyección a EPSG:4326.
  gpkg.createFeatureTable(
    'caminos_mercator',
    null,
    columnas(['nombre', 'estado', 'superficie', 'localidad', 'departamento']),
    undefined,
    ProjectionConstants.EPSG_CODE_3857
  );
  const dao3857 = gpkg.getFeatureDao('caminos_mercator');

  crearFila(
    dao3857,
    ProjectionConstants.EPSG_CODE_3857,
    {
      type: 'LineString',
      coordinates: [aMercator([-62.83, -28.46]), aMercator([-62.82, -28.455])],
    },
    { nombre: 'Camino a Añatuya', estado: 'Bueno', superficie: 'Pavimentado', localidad: 'Añatuya', departamento: 'General Taboada' }
  );

  gpkg.close();
  return ruta;
}

async function principal() {
  await mkdir(destino, { recursive: true });

  const rutaKml = path.join(destino, 'relevamiento-ejemplo.kml');
  await writeFile(rutaKml, KML, 'utf8');

  const rutaGpkg = await generarGpkg();

  console.log('Ejemplos generados:');
  console.log(` - ${rutaKml}`);
  console.log(` - ${rutaGpkg}`);
}

principal().catch((error) => {
  console.error('No se pudieron generar los ejemplos:', error);
  process.exit(1);
});
