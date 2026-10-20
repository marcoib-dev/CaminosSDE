import { DOMParser } from '@xmldom/xmldom';
import { kml } from '@tmcw/togeojson';
import { GeoPackageAPI } from '@ngageoint/geopackage';
import { length, lineString } from '@turf/turf';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { ImportarConfirmarInput, ImportarFeatureInput } from '@sde/shared';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../core/ApiError.js';
import { registrarAuditoria } from '../core/auditoria.js';
import { assertLineaValida, RANGO_PROVINCIA } from '../core/geo.js';
import * as caminos from './caminos.service.js';
import * as tramos from './tramos.service.js';

export interface FeatureImportada {
  id: string;
  nombre: string;
  tipoGeometria: 'LineString';
  longitudKm: number;
  atributos: Record<string, unknown>;
  geometria: { type: 'LineString'; coordinates: [number, number][] };
  origen: string;
  fueraProvincia: boolean;
}

export interface ResultadoImportacion {
  creados: Array<{ nombre: string; caminoId: string; tramoId: string }>;
  errores: Array<{ indice: number; nombre: string; mensaje: string }>;
}

const MAX_FEATURES = 500;

const nombreDeAtributos = (atributos: Record<string, unknown>, indice: number) => {
  const candidatos = [
    'nombre',
    'Nombre',
    'NOMBRE',
    'name',
    'Name',
    'NAME',
    'camino',
    'Camino',
    'CAMINO',
    'descripcion',
    'Descripcion',
  ];
  for (const clave of candidatos) {
    const valor = atributos[clave];
    if (typeof valor === 'string' && valor.trim().length > 0) return valor.trim();
  }
  return `Camino importado ${indice + 1}`;
};

const dentroProvincia = (coordenadas: Array<[number, number]>) =>
  coordenadas.every(
    ([lng, lat]) =>
      lng >= RANGO_PROVINCIA.minLng &&
      lng <= RANGO_PROVINCIA.maxLng &&
      lat >= RANGO_PROVINCIA.minLat &&
      lat <= RANGO_PROVINCIA.maxLat
  );

const limpiarAtributos = (valores: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(valores).filter(([, valor]) => {
      if (valor === null) return true;
      const tipo = typeof valor;
      return tipo === 'string' || tipo === 'number' || tipo === 'boolean';
    })
  );

function lineasDeGeometria(geometria: Geometry | null, idBase: string): Array<{ id: string; coordenadas: [number, number][] }> {
  if (!geometria) return [];
  if (geometria.type === 'LineString') {
    return [{ id: idBase, coordenadas: geometria.coordinates.map(([lng, lat]) => [lng, lat]) }];
  }
  if (geometria.type === 'MultiLineString') {
    return geometria.coordinates.map((linea, indice) => ({
      id: `${idBase}-${indice + 1}`,
      coordenadas: linea.map(([lng, lat]) => [lng, lat]),
    }));
  }
  if (geometria.type === 'GeometryCollection') {
    return geometria.geometries.flatMap((parte, indice) => lineasDeGeometria(parte, `${idBase}-${indice + 1}`));
  }
  return [];
}

function agregarFeature(
  salida: FeatureImportada[],
  feature: Feature,
  indice: number,
  origen: string,
  transformar?: (coordenada: [number, number]) => [number, number]
) {
  if (salida.length >= MAX_FEATURES) return;
  const atributosRaw = (feature.properties ?? {}) as Record<string, unknown>;
  const atributos = limpiarAtributos(atributosRaw);
  const nombre = nombreDeAtributos(atributos, indice);
  // El id de origen puede repetirse entre tablas o archivos; usamos uno único por posición.
  const idBase = `${origen}-${indice + 1}`;

  for (const linea of lineasDeGeometria(feature.geometry, idBase)) {
    if (salida.length >= MAX_FEATURES) return;
    const coordenadas = transformar ? linea.coordenadas.map(transformar) : linea.coordenadas;
    if (coordenadas.length < 2) continue;
    const longitudKm = length(lineString(coordenadas), { units: 'kilometers' });
    if (!Number.isFinite(longitudKm) || longitudKm <= 0) continue;
    salida.push({
      id: linea.id,
      nombre,
      tipoGeometria: 'LineString',
      longitudKm,
      atributos,
      geometria: { type: 'LineString', coordinates: coordenadas },
      origen,
      fueraProvincia: !dentroProvincia(coordenadas),
    });
  }
}

async function leerGpkg(buffer: Buffer): Promise<FeatureImportada[]> {
  const salida: FeatureImportada[] = [];
  let gpkg;
  try {
    gpkg = await GeoPackageAPI.open(buffer);
  } catch {
    throw new ApiError(400, 'No se pudo abrir el archivo GPKG. Verificá que no esté corrupto.');
  }

  try {
    const tablas = gpkg.getFeatureTables();
    if (tablas.length === 0) {
      throw new ApiError(400, 'El GPKG no contiene tablas de entidades vectoriales.');
    }

    for (const tabla of tablas) {
      const dao = gpkg.getFeatureDao(tabla);
      const geometriaColumna = dao.getGeometryColumnName();
      let indice = 0;

      for (const filaCruda of dao.queryForAll()) {
        const fila = dao.getRow(filaCruda);
        const crudo = fila.geometry?.toGeoJSON?.() as unknown;
        const geometria =
          crudo && typeof crudo === 'object' && 'type' in crudo && crudo.type === 'Feature'
            ? ((crudo as Feature).geometry as Geometry | null)
            : ((crudo as Geometry | null) ?? null);
        if (!geometria) {
          indice += 1;
          continue;
        }

        const atributos = { ...(fila.values ?? {}) } as Record<string, unknown>;
        delete atributos[geometriaColumna];
        const feature: Feature = {
          type: 'Feature',
          id: String(fila.id ?? `${tabla}-${indice + 1}`),
          geometry: geometria,
          properties: atributos,
        };

        const srs = dao.srs;
        const esWgs84 =
          srs?.organization === 'EPSG' && Number(srs?.organization_coordsys_id) === 4326;
        const transformar =
          dao.projection && srs && !esWgs84
            ? (coordenada: [number, number]) => {
                const [lng, lat] = dao.projection.forward(coordenada);
                return [lng, lat] as [number, number];
              }
            : undefined;

        agregarFeature(salida, feature, indice, `gpkg:${tabla}`, transformar);
        indice += 1;
      }
    }
  } finally {
    gpkg.close();
  }

  return salida;
}

function leerKml(texto: string): FeatureImportada[] {
  try {
    const documento = new DOMParser({
      onError: (nivel, mensaje) => {
        if (nivel !== 'warning') throw new Error(mensaje);
      },
    }).parseFromString(texto, 'text/xml');
    const coleccion = kml(documento) as FeatureCollection;
    const salida: FeatureImportada[] = [];
    coleccion.features.forEach((feature, indice) => agregarFeature(salida, feature, indice, 'kml'));
    return salida;
  } catch {
    throw new ApiError(400, 'No se pudo leer el KML. Verificá que sea un archivo XML válido.');
  }
}

function leerGeoJson(texto: string): FeatureImportada[] {
  let contenido: FeatureCollection | Feature | Geometry;
  try {
    contenido = JSON.parse(texto) as FeatureCollection | Feature | Geometry;
  } catch {
    throw new ApiError(400, 'El archivo GeoJSON no es JSON válido.');
  }

  const features: Feature[] =
    'type' in contenido && contenido.type === 'FeatureCollection'
      ? contenido.features
      : 'type' in contenido && contenido.type === 'Feature'
        ? [contenido as Feature]
        : [{ type: 'Feature', geometry: contenido as Geometry, properties: {} }];

  if (!Array.isArray(features)) {
    throw new ApiError(400, 'El GeoJSON no contiene una lista de entidades válida.');
  }

  const salida: FeatureImportada[] = [];
  features.forEach((feature, indice) => agregarFeature(salida, feature, indice, 'geojson'));
  return salida;
}

export async function previsualizar(archivo: { originalname: string; buffer: Buffer }) {
  const nombre = archivo.originalname.toLowerCase();
  let features: FeatureImportada[];

  if (nombre.endsWith('.gpkg')) {
    features = await leerGpkg(archivo.buffer);
  } else if (nombre.endsWith('.kml')) {
    features = leerKml(archivo.buffer.toString('utf8'));
  } else if (nombre.endsWith('.geojson') || nombre.endsWith('.json')) {
    features = leerGeoJson(archivo.buffer.toString('utf8'));
  } else {
    throw new ApiError(400, 'Formato no soportado. Usá .gpkg, .kml o .geojson.');
  }

  if (features.length === 0) {
    throw new ApiError(400, 'El archivo no contiene geometrías LineString o MultiLineString válidas.');
  }

  return {
    archivo: archivo.originalname,
    total: features.length,
    truncado: features.length >= MAX_FEATURES,
    advertencias:
      features.length >= MAX_FEATURES
        ? [`Se muestran las primeras ${MAX_FEATURES} geometrías. Dividí el archivo para importar el resto.`]
        : [],
    features,
  };
}

export async function confirmar(
  datos: ImportarConfirmarInput,
  { usuarioId, ip }: { usuarioId?: string | null; ip?: string | null }
): Promise<ResultadoImportacion> {
  const creados: ResultadoImportacion['creados'] = [];
  const errores: ResultadoImportacion['errores'] = [];
  const caminosCreados = new Map<string, string>();

  for (const [indice, feature] of datos.features.entries()) {
    const clave = [
      feature.nombre.trim().toLowerCase(),
      feature.localidad.trim().toLowerCase(),
      feature.tipoViaId,
      feature.departamentoId ?? '',
    ].join('|');
    let caminoCreadoAhora = false;
    let caminoId = feature.caminoId ?? null;

    try {
      assertLineaValida(feature.geometria.coordinates);

      if (caminoId) {
        const existente = await prisma.camino.findUnique({ where: { id: caminoId }, select: { id: true } });
        if (!existente) throw new ApiError(404, 'El camino indicado no existe.');
      } else {
        caminoId = caminosCreados.get(clave) ?? null;

        if (!caminoId) {
          const camino = await caminos.crear(
            {
              nombre: feature.nombre,
              localidad: feature.localidad,
              tipoViaId: feature.tipoViaId,
              departamentoId: feature.departamentoId ?? null,
              descripcion: null,
              geom: feature.geometria,
            },
            { usuarioId, ip }
          );
          caminoId = camino.id;
          caminosCreados.set(clave, caminoId);
          caminoCreadoAhora = true;
        }
      }

      const tramo = await tramos.crear(
        caminoId,
        {
          geometria: feature.geometria,
          estadoId: feature.estadoId,
          observaciones: feature.observaciones ?? null,
        },
        { usuarioId, ip }
      );
      if (!tramo) throw new ApiError(500, 'No se pudo crear el tramo.');

      creados.push({ nombre: feature.nombre, caminoId, tramoId: tramo.id });
    } catch (error) {
      // Si el camino se creó en este intento y el tramo falló, no dejamos un camino vacío.
      if (caminoCreadoAhora && caminoId) {
        await prisma.camino.delete({ where: { id: caminoId } }).catch(() => undefined);
        caminosCreados.delete(clave);
      }
      errores.push({
        indice,
        nombre: feature.nombre,
        mensaje: error instanceof Error ? error.message : 'Error desconocido.',
      });
    }
  }

  await registrarAuditoria({
    usuarioId,
    ip,
    accion: 'IMPORTAR',
    entidad: 'Camino',
    detalle: {
      seleccionados: datos.features.length,
      creados: creados.length,
      errores: errores.length,
    },
  });

  if (creados.length === 0) {
    throw new ApiError(400, `No se pudo importar ninguna geometría. ${errores[0]?.mensaje ?? ''}`.trim());
  }

  return { creados, errores };
}
