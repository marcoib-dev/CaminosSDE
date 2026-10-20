import path from 'node:path';
import { DOMParser } from '@xmldom/xmldom';
import { GeoPackageAPI } from '@ngageoint/geopackage';
import { kml as convertirKml } from '@tmcw/togeojson';
import proj4 from 'proj4';
import { ApiError } from '../../utils/ApiError.js';
import { calcularLongitudKm } from '../../utils/geojson.js';

export const MAXIMO_TRAMOS = 2000;

const EXTENSIONES = {
  '.kml': 'KML',
  '.gpkg': 'GPKG',
};

const FIRMA_SQLITE = Buffer.from('SQLite format 3\0', 'utf8');

const identidad = (coordenada) => coordenada;

const redondear = (valor) => Number(valor.toFixed(6));

const esFinito = (valor) => typeof valor === 'number' && Number.isFinite(valor);

const coordenadaValida = ([longitud, latitud]) =>
  esFinito(longitud) &&
  esFinito(latitud) &&
  longitud >= -180 &&
  longitud <= 180 &&
  latitud >= -90 &&
  latitud <= 90;

/**
 * Convierte los atributos crudos en un objeto plano serializable.
 * Ignora valores binarios u objetos complejos.
 */
function limpiarAtributos(valores) {
  const atributos = {};

  for (const [clave, valor] of Object.entries(valores ?? {})) {
    if (valor === null || valor === undefined) continue;
    if (typeof valor === 'string' || typeof valor === 'number' || typeof valor === 'boolean') {
      atributos[clave] = valor;
    } else if (valor instanceof Date) {
      atributos[clave] = valor.toISOString();
    }
  }

  return atributos;
}

/**
 * Devuelve las partes LineString de una geometría GeoJSON.
 * Un MultiLineString se separa en tantas líneas como partes tenga, sin unirlas.
 */
export function partesLinea(geometria) {
  if (!geometria || typeof geometria !== 'object') return [];

  if (geometria.type === 'LineString') {
    return [geometria.coordinates ?? []];
  }

  if (geometria.type === 'MultiLineString') {
    return (geometria.coordinates ?? []).filter((parte) => Array.isArray(parte));
  }

  if (geometria.type === 'GeometryCollection') {
    return (geometria.geometries ?? []).flatMap((hija) => partesLinea(hija));
  }

  return [];
}

function transformarGeometria(geometria, transformar) {
  if (!geometria || typeof geometria !== 'object') {
    return geometria;
  }

  if (geometria.type === 'LineString' || geometria.type === 'MultiLineString') {
    // Los KML exportados desde QGIS suelen incluir la altitud como tercera
    // coordenada. El dominio guarda siempre [longitud, latitud], así que se
    // descarta cualquier dimensión extra.
    const convertirAnillo = (coordenadas) =>
      coordenadas.map((coordenada) => {
        const [longitud, latitud] = coordenada;

        if (transformar === identidad) {
          return [longitud, latitud];
        }

        const [nuevaLongitud, nuevaLatitud] = transformar([longitud, latitud]);
        return [redondear(nuevaLongitud), redondear(nuevaLatitud)];
      });

    if (geometria.type === 'LineString') {
      return { type: 'LineString', coordinates: convertirAnillo(geometria.coordinates ?? []) };
    }

    return {
      type: 'MultiLineString',
      coordinates: (geometria.coordinates ?? []).map(convertirAnillo),
    };
  }

  if (geometria.type === 'GeometryCollection') {
    return {
      type: 'GeometryCollection',
      geometries: (geometria.geometries ?? []).map((hija) =>
        transformarGeometria(hija, transformar)
      ),
    };
  }

  return geometria;
}

function nombreSistema(srs) {
  if (!srs) return null;
  if (srs.organization && srs.organization_coordsys_id !== undefined) {
    return `${srs.organization}:${srs.organization_coordsys_id}`;
  }
  return `srs_id ${srs.srs_id}`;
}

function crearTransformador(srs, capa, advertencias) {
  if (!srs) {
    advertencias.push(
      `La capa "${capa}" no declara sistema de coordenadas; se interpretaron las coordenadas como EPSG:4326.`
    );
    return { etiqueta: 'EPSG:4326', transformar: identidad, reproyectado: false };
  }

  const etiqueta = nombreSistema(srs);
  const esWgs84 = srs.organization === 'EPSG' && Number(srs.organization_coordsys_id) === 4326;

  if (esWgs84) {
    return { etiqueta: 'EPSG:4326', transformar: identidad, reproyectado: false };
  }

  const definicion = srs.definition_12_063 || srs.definition;

  if (!definicion) {
    throw new ApiError(
      400,
      `La capa "${capa}" usa el sistema ${etiqueta} y el GeoPackage no incluye su definición, así que no se puede reproyectar a EPSG:4326.`
    );
  }

  let transformador;
  try {
    transformador = proj4(definicion, 'EPSG:4326');
  } catch {
    throw new ApiError(
      400,
      `No se pudo reproyectar la capa "${capa}" desde ${etiqueta} a EPSG:4326.`
    );
  }

  return {
    etiqueta,
    transformar: (coordenada) => {
      try {
        return transformador.forward(coordenada);
      } catch {
        throw new ApiError(
          400,
          `No se pudo reproyectar una coordenada de la capa "${capa}" desde ${etiqueta} a EPSG:4326.`
        );
      }
    },
    reproyectado: true,
  };
}

/**
 * Convierte las features crudas en tramos LineString listos para previsualizar.
 */
function construirFeatures(crudas) {
  const features = [];
  const advertencias = [];
  let descartadosSinLinea = 0;
  let descartadosInvalidos = 0;

  for (const cruda of crudas) {
    const partes = partesLinea(cruda.geometria).filter((parte) => parte.length >= 2);

    if (partes.length === 0) {
      descartadosSinLinea += 1;
      continue;
    }

    let numeroParte = 0;

    for (const parte of partes) {
      const geometria = transformarGeometria(
        { type: 'LineString', coordinates: parte },
        cruda.transformar
      );

      if (!geometria.coordinates.every(coordenadaValida)) {
        descartadosInvalidos += 1;
        continue;
      }

      let longitudKm;
      try {
        longitudKm = calcularLongitudKm(geometria);
      } catch {
        descartadosInvalidos += 1;
        continue;
      }

      numeroParte += 1;
      features.push({
        id: `${cruda.origen}-${numeroParte}`,
        origen: cruda.origen,
        capa: cruda.capa,
        atributos: cruda.atributos,
        geometria,
        tipoGeometria: 'LineString',
        tipoGeometriaOriginal: cruda.geometria?.type ?? null,
        longitudKm,
        parte: numeroParte,
        partes: partes.length,
      });
    }
  }

  if (descartadosSinLinea > 0) {
    advertencias.push(
      `Se descartaron ${descartadosSinLinea} elemento(s) sin geometría de línea (puntos, polígonos o sin geometría).`
    );
  }

  if (descartadosInvalidos > 0) {
    advertencias.push(
      `Se descartaron ${descartadosInvalidos} línea(s) con coordenadas inválidas o longitud cero.`
    );
  }

  return {
    features,
    advertencias,
    descartados: descartadosSinLinea + descartadosInvalidos,
  };
}

function leerKml(buffer) {
  const texto = buffer.toString('utf8');

  if (!texto.trim()) {
    throw new ApiError(400, 'El archivo KML está vacío.');
  }

  let documento;
  try {
    documento = new DOMParser({ onError: () => {} }).parseFromString(texto, 'application/xml');
  } catch {
    throw new ApiError(400, 'No se pudo leer el archivo KML. Verificá que no esté dañado.');
  }

  const raiz = (
    documento?.documentElement?.localName ??
    documento?.documentElement?.nodeName ??
    ''
  ).toLowerCase();
  const errores = documento?.getElementsByTagName?.('parsererror') ?? [];

  if (raiz.includes('parsererror') || errores.length > 0 || raiz !== 'kml') {
    throw new ApiError(400, 'El archivo no es un KML válido.');
  }

  let coleccion;
  try {
    coleccion = convertirKml(documento);
  } catch {
    throw new ApiError(400, 'No se pudo interpretar el contenido del KML.');
  }

  const crudas = (coleccion?.features ?? []).map((feature, indice) => ({
    origen: `kml-${indice + 1}`,
    capa: 'KML',
    geometria: feature.geometry,
    atributos: limpiarAtributos(feature.properties),
    transformar: identidad,
  }));

  return {
    crudas,
    capas: ['KML'],
    sistemasCoordenadas: ['EPSG:4326'],
    reproyectado: false,
  };
}

function esSqlite(buffer) {
  return buffer.length >= 16 && buffer.subarray(0, 16).equals(FIRMA_SQLITE);
}

async function leerGpkg(buffer) {
  if (!esSqlite(buffer)) {
    throw new ApiError(
      400,
      'El archivo no es un GeoPackage válido. Verificá que sea un .gpkg exportado desde QGIS.'
    );
  }

  let gpkg;
  try {
    gpkg = await GeoPackageAPI.open(buffer);
  } catch {
    throw new ApiError(400, 'No se pudo abrir el GeoPackage. El archivo está dañado o incompleto.');
  }

  try {
    const tablas = gpkg.getFeatureTables?.() ?? [];

    if (tablas.length === 0) {
      throw new ApiError(400, 'El GeoPackage no contiene tablas de entidades (capas vectoriales).');
    }

    const crudas = [];
    const advertencias = [];
    const sistemasCoordenadas = new Set();
    let reproyectado = false;

    for (const tabla of tablas) {
      const dao = gpkg.getFeatureDao(tabla);
      const { etiqueta, transformar, reproyectado: capaReproyectada } = crearTransformador(
        dao.srs,
        tabla,
        advertencias
      );

      sistemasCoordenadas.add(etiqueta);
      if (capaReproyectada) reproyectado = true;

      const columnas = dao.getFeatureTable().getUserColumns().getColumns();
      const columnaGeometria = dao.getGeometryColumnName();
      const filas = dao.queryForAll();
      let filasInvalidas = 0;

      for (const [indice, filaCruda] of filas.entries()) {
        let fila;
        let geometria;

        try {
          fila = dao.getRow(filaCruda);
          geometria = fila.geometry?.toGeoJSON?.() ?? null;
        } catch {
          filasInvalidas += 1;
          continue;
        }

        const atributos = {};

        for (const columna of columnas) {
          if (columna.name === columnaGeometria) continue;
          const valor = fila.getValueWithColumnName(columna.name);
          if (valor === null || valor === undefined) continue;
          if (valor instanceof Date) atributos[columna.name] = valor.toISOString();
          else if (typeof valor === 'string' || typeof valor === 'number' || typeof valor === 'boolean') {
            atributos[columna.name] = valor;
          }
        }

        crudas.push({
          origen: `${tabla}-${indice + 1}`,
          capa: tabla,
          geometria,
          atributos,
          transformar,
        });
      }

      if (filasInvalidas > 0) {
        advertencias.push(
          `Se omitieron ${filasInvalidas} fila(s) de la capa "${tabla}" porque su geometría no se pudo leer.`
        );
      }
    }

    return {
      crudas,
      capas: tablas,
      sistemasCoordenadas: [...sistemasCoordenadas],
      reproyectado,
      advertencias,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, 'No se pudo leer el GeoPackage. Revisá que no esté dañado.');
  } finally {
    try {
      gpkg.close();
    } catch {
      // El GeoPackage ya estaba cerrado.
    }
  }
}

/**
 * Lee un archivo .kml o .gpkg y devuelve los tramos de línea encontrados.
 * No guarda nada: es la base de la previsualización.
 */
export async function leerArchivoDeImportacion({ buffer, nombreArchivo }) {
  if (!buffer || buffer.length === 0) {
    throw new ApiError(400, 'El archivo está vacío.');
  }

  const extension = path.extname(nombreArchivo ?? '').toLowerCase();
  const formato = EXTENSIONES[extension];

  if (!formato) {
    throw new ApiError(400, 'El archivo debe tener extensión .kml o .gpkg.');
  }

  const leido = formato === 'KML' ? leerKml(buffer) : await leerGpkg(buffer);

  const { features, advertencias, descartados } = construirFeatures(leido.crudas);

  if (features.length === 0) {
    throw new ApiError(400, 'El archivo no contiene geometrías de línea (LineString o MultiLineString).');
  }

  if (features.length > MAXIMO_TRAMOS) {
    throw new ApiError(
      400,
      `El archivo contiene ${features.length} tramos y el máximo permitido es ${MAXIMO_TRAMOS}. Dividí el archivo en partes más chicas.`
    );
  }

  return {
    formato,
    capas: leido.capas,
    sistemasCoordenadas: leido.sistemasCoordenadas,
    reproyectado: leido.reproyectado,
    total: features.length,
    descartados,
    advertencias: [...(leido.advertencias ?? []), ...advertencias],
    features,
  };
}
