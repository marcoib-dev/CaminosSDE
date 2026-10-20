/**
 * Importa puntos de interés (hospitales, escuelas y UPAs) desde un archivo
 * GeoJSON o KML, por ejemplo el que se exporta desde Overpass Turbo con los
 * datos de OpenStreetMap.
 *
 * Uso:
 *   node scripts/importar-puntos.js --archivo puntos.geojson
 *   node scripts/importar-puntos.js --archivo puntos.kml --categoria ESCUELA --aplicar
 *
 * Sin `--aplicar` el script solo muestra qué haría: no escribe en la base.
 * Los puntos cuyo nombre ya existe en la misma categoría a menos de
 * `--umbral-metros` se consideran duplicados y se omiten.
 */

import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { DOMParser } from '@xmldom/xmldom';
import { PrismaClient } from '@prisma/client';
import { kml as convertirKml } from '@tmcw/togeojson';
import { normalizarClave } from '../src/services/importacion/mapeo.js';

const prisma = new PrismaClient();

const CATEGORIAS_VALIDAS = new Set(['HOSPITAL', 'ESCUELA', 'UPA']);
const EXTENSIONES = ['.geojson', '.json', '.kml'];

const RADIO_TIERRA_M = 6371008.8;

// Caja aproximada de la provincia. Solo sirve para avisar de coordenadas
// sospechosas; no se descarta ningún punto por estar fuera.
const CAJA_SDE = { longitudMin: -65.2, longitudMax: -60.9, latitudMin: -30.8, latitudMax: -25.4 };

const CAMPOS_NOMBRE = [
  'nombre',
  'name',
  'nombre_establecimiento',
  'denominacion',
  'titulo',
  'title',
  'establecimiento',
];

const CAMPOS_CATEGORIA = [
  'categoria',
  'category',
  'amenity',
  'healthcare',
  'tipo',
  'clase',
  'tipo_establecimiento',
];

const CATALOGO_CATEGORIA = {
  hospital: 'HOSPITAL',
  hospitales: 'HOSPITAL',
  hospital_zonal: 'HOSPITAL',
  hospital_de_agudos: 'HOSPITAL',
  sanatorio: 'HOSPITAL',
  escuela: 'ESCUELA',
  escuelas: 'ESCUELA',
  school: 'ESCUELA',
  colegio: 'ESCUELA',
  instituto: 'ESCUELA',
  establecimiento_educativo: 'ESCUELA',
  upa: 'UPA',
  upas: 'UPA',
  clinic: 'UPA',
  clinics: 'UPA',
  doctors: 'UPA',
  health_post: 'UPA',
  centro_de_salud: 'UPA',
  centro_sanitario: 'UPA',
  puesto_sanitario: 'UPA',
  posta_sanitaria: 'UPA',
  sala_de_primeros_auxilios: 'UPA',
};

const AYUDA = `Importa puntos de interés desde GeoJSON o KML.

Uso:
  node scripts/importar-puntos.js --archivo <ruta> [opciones]

Opciones:
  --archivo, -a <ruta>       Archivo .geojson, .json o .kml a importar.
  --categoria, -c <valor>    HOSPITAL, ESCUELA o UPA. Si se omite, la categoría
                             se deduce de los atributos de cada punto
                             (amenity, healthcare, categoria, tipo, etc.).
  --umbral-metros <n>        Distancia para considerar duplicado a un punto con
                             el mismo nombre en la misma categoría. Por defecto 150.
  --aplicar                  Escribe en la base. Sin esta opción solo previsualiza.
  --ayuda, -h                Muestra esta ayuda.

Ejemplo:
  node scripts/importar-puntos.js --archivo hospitales.geojson --categoria HOSPITAL
  node scripts/importar-puntos.js --archivo escuelas.geojson --categoria ESCUELA --aplicar`;

function leerArgumentos(argv) {
  const opciones = {
    archivo: null,
    categoria: null,
    umbralMetros: 150,
    aplicar: false,
    ayuda: false,
  };

  const tomarValor = (clave, valorEnLinea, indice) => {
    if (valorEnLinea !== undefined) return { valor: valorEnLinea, indice };
    const siguiente = argv[indice + 1];
    if (siguiente === undefined || siguiente.startsWith('-')) {
      throw new Error(`Falta el valor de ${clave}.`);
    }
    return { valor: siguiente, indice: indice + 1 };
  };

  let indice = 0;

  while (indice < argv.length) {
    const argumento = argv[indice];

    if (!argumento.startsWith('-')) {
      if (opciones.archivo) {
        throw new Error(`Argumento inesperado: ${argumento}.`);
      }
      opciones.archivo = argumento;
      indice += 1;
      continue;
    }

    const separador = argumento.indexOf('=');
    const clave = separador >= 0 ? argumento.slice(0, separador) : argumento;
    const valorEnLinea = separador >= 0 ? argumento.slice(separador + 1) : undefined;

    if (clave === '--ayuda' || clave === '-h') {
      opciones.ayuda = true;
      indice += 1;
      continue;
    }

    if (clave === '--aplicar') {
      opciones.aplicar = true;
      indice += 1;
      continue;
    }

    if (clave === '--archivo' || clave === '-a') {
      const resultado = tomarValor(clave, valorEnLinea, indice);
      opciones.archivo = resultado.valor;
      indice = resultado.indice + 1;
      continue;
    }

    if (clave === '--categoria' || clave === '-c') {
      const resultado = tomarValor(clave, valorEnLinea, indice);
      opciones.categoria = resultado.valor.trim().toUpperCase();
      indice = resultado.indice + 1;
      continue;
    }

    if (clave === '--umbral-metros') {
      const resultado = tomarValor(clave, valorEnLinea, indice);
      const numero = Number(resultado.valor);
      if (!Number.isFinite(numero) || numero < 0) {
        throw new Error('--umbral-metros debe ser un número mayor o igual a 0.');
      }
      opciones.umbralMetros = numero;
      indice = resultado.indice + 1;
      continue;
    }

    throw new Error(`Opción desconocida: ${clave}. Usá --ayuda para ver las opciones.`);
  }

  if (opciones.categoria && !CATEGORIAS_VALIDAS.has(opciones.categoria)) {
    throw new Error(
      `La categoría "${opciones.categoria}" no es válida. Usá HOSPITAL, ESCUELA o UPA.`
    );
  }

  return opciones;
}

function valorDeCampo(propiedades, campo) {
  const buscado = normalizarClave(campo);

  for (const [clave, valor] of Object.entries(propiedades ?? {})) {
    if (normalizarClave(clave) !== buscado) continue;
    if (valor === null || valor === undefined || valor === '') continue;
    if (typeof valor === 'object') continue;
    return valor;
  }

  return null;
}

function primerValor(propiedades, campos) {
  for (const campo of campos) {
    const valor = valorDeCampo(propiedades, campo);
    if (valor !== null) return valor;
  }
  return null;
}

function leerNombre(propiedades) {
  const valor = primerValor(propiedades, CAMPOS_NOMBRE);
  if (valor === null) return null;
  const nombre = String(valor).trim();
  return nombre || null;
}

function leerCategoria(propiedades) {
  const valor = primerValor(propiedades, CAMPOS_CATEGORIA);
  if (valor === null) return null;

  const crudo = String(valor).trim();
  const directo = crudo.toUpperCase();
  if (CATEGORIAS_VALIDAS.has(directo)) return directo;

  return CATALOGO_CATEGORIA[normalizarClave(crudo)] ?? null;
}

function redondear(valor) {
  return Number(valor.toFixed(6));
}

function coordenadaValida(longitud, latitud) {
  return (
    Number.isFinite(longitud) &&
    Number.isFinite(latitud) &&
    longitud >= -180 &&
    longitud <= 180 &&
    latitud >= -90 &&
    latitud <= 90
  );
}

function distanciaMetros(a, b) {
  const aRadianes = (grados) => (grados * Math.PI) / 180;
  const diferenciaLatitud = aRadianes(b.latitud - a.latitud);
  const diferenciaLongitud = aRadianes(b.longitud - a.longitud);
  const latitudA = aRadianes(a.latitud);
  const latitudB = aRadianes(b.latitud);

  const haversine =
    Math.sin(diferenciaLatitud / 2) ** 2 +
    Math.cos(latitudA) * Math.cos(latitudB) * Math.sin(diferenciaLongitud / 2) ** 2;

  return 2 * RADIO_TIERRA_M * Math.asin(Math.min(1, Math.sqrt(haversine)));
}

function construirPuntos(features) {
  const puntos = [];
  const descartados = [];
  let sinGeometria = 0;

  for (const feature of features) {
    const propiedades = feature.properties ?? {};
    const geometria = feature.geometry;

    const coordenadas =
      geometria?.type === 'Point'
        ? [geometria.coordinates]
        : geometria?.type === 'MultiPoint'
          ? geometria.coordinates ?? []
          : [];

    if (coordenadas.length === 0) {
      sinGeometria += 1;
      continue;
    }

    const nombre = leerNombre(propiedades);

    for (const coordenada of coordenadas) {
      const [longitud, latitud] = coordenada ?? [];

      if (!coordenadaValida(longitud, latitud)) {
        descartados.push({
          nombre: nombre ?? '(sin nombre)',
          motivo: 'coordenadas inválidas',
        });
        continue;
      }

      puntos.push({
        nombre,
        categoria: leerCategoria(propiedades),
        longitud: redondear(longitud),
        latitud: redondear(latitud),
        origen: propiedades['@id'] ?? propiedades.id ?? null,
      });
    }
  }

  return { puntos, descartados, sinGeometria };
}

function leerGeoJson(buffer) {
  let json;

  try {
    json = JSON.parse(buffer.toString('utf8').replace(/^\uFEFF/, ''));
  } catch {
    throw new Error('No se pudo leer el archivo GeoJSON. Verificá que sea un JSON válido.');
  }

  if (Array.isArray(json)) return json;
  if (json?.type === 'Feature') return [json];
  if (json?.type === 'FeatureCollection' && Array.isArray(json.features)) return json.features;
  if (json?.type === 'GeometryCollection' && Array.isArray(json.geometries)) {
    return json.geometries.map((geometria) => ({ type: 'Feature', properties: {}, geometry: geometria }));
  }

  throw new Error(
    'El archivo no es un GeoJSON de puntos. Se esperaba una FeatureCollection, una Feature o una lista de features.'
  );
}

function leerKml(buffer) {
  const texto = buffer.toString('utf8').replace(/^\uFEFF/, '');

  if (!texto.trim()) {
    throw new Error('El archivo KML está vacío.');
  }

  let documento;
  try {
    documento = new DOMParser({ onError: () => {} }).parseFromString(texto, 'application/xml');
  } catch {
    throw new Error('No se pudo leer el archivo KML. Verificá que no esté dañado.');
  }

  const raiz = (
    documento?.documentElement?.localName ??
    documento?.documentElement?.nodeName ??
    ''
  ).toLowerCase();
  const errores = documento?.getElementsByTagName?.('parsererror') ?? [];

  if (raiz.includes('parsererror') || errores.length > 0 || raiz !== 'kml') {
    throw new Error('El archivo no es un KML válido.');
  }

  let coleccion;
  try {
    coleccion = convertirKml(documento);
  } catch {
    throw new Error('No se pudo interpretar el contenido del KML.');
  }

  return coleccion?.features ?? [];
}

async function leerArchivo(ruta) {
  const extension = path.extname(ruta).toLowerCase();

  if (!EXTENSIONES.includes(extension)) {
    throw new Error('El archivo debe tener extensión .geojson, .json o .kml.');
  }

  const buffer = await readFile(ruta);

  if (buffer.length === 0) {
    throw new Error('El archivo está vacío.');
  }

  return {
    formato: extension === '.kml' ? 'KML' : 'GeoJSON',
    features: extension === '.kml' ? leerKml(buffer) : leerGeoJson(buffer),
  };
}

function dentroDeSantiagoDelEstero(punto) {
  return (
    punto.longitud >= CAJA_SDE.longitudMin &&
    punto.longitud <= CAJA_SDE.longitudMax &&
    punto.latitud >= CAJA_SDE.latitudMin &&
    punto.latitud <= CAJA_SDE.latitudMax
  );
}

async function main() {
  const opciones = leerArgumentos(process.argv.slice(2));

  if (opciones.ayuda) {
    console.log(AYUDA);
    return;
  }

  if (!opciones.archivo) {
    throw new Error('Indicá el archivo a importar con --archivo. Usá --ayuda para ver las opciones.');
  }

  const ruta = path.resolve(process.cwd(), opciones.archivo);
  const { formato, features } = await leerArchivo(ruta);
  const { puntos, descartados, sinGeometria } = construirPuntos(features);

  if (puntos.length === 0) {
    throw new Error(
      sinGeometria > 0
        ? `El archivo no contiene puntos: ${sinGeometria} elemento(s) tienen otra geometría (líneas o polígonos).`
        : 'El archivo no contiene puntos válidos para importar.'
    );
  }

  const existentes = await prisma.puntoInteres.findMany({
    select: { nombre: true, categoria: true, latitud: true, longitud: true },
  });

  const aceptados = [];
  const duplicados = [];
  const sinNombre = [];
  const sinCategoria = [];
  const fueraDeProvincia = [];

  for (const punto of puntos) {
    const categoria = opciones.categoria ?? punto.categoria;

    if (!punto.nombre) {
      sinNombre.push(punto);
      continue;
    }

    if (!categoria) {
      sinCategoria.push(punto);
      continue;
    }

    const candidato = { ...punto, categoria };
    const nombreNormalizado = normalizarClave(candidato.nombre);

    const duplicado =
      [...existentes, ...aceptados].find(
        (otro) =>
          otro.categoria === categoria &&
          normalizarClave(otro.nombre) === nombreNormalizado &&
          distanciaMetros(otro, candidato) <= opciones.umbralMetros
      ) ?? null;

    if (duplicado) {
      duplicados.push({ punto: candidato, existente: duplicado });
      continue;
    }

    if (!dentroDeSantiagoDelEstero(candidato)) {
      fueraDeProvincia.push(candidato);
    }

    aceptados.push(candidato);
  }

  const porCategoria = aceptados.reduce((conteo, punto) => {
    conteo[punto.categoria] = (conteo[punto.categoria] ?? 0) + 1;
    return conteo;
  }, {});

  console.log(`Archivo: ${ruta} (${formato})`);
  console.log(`Puntos leídos: ${puntos.length}`);
  console.log(
    `A crear: ${aceptados.length} · ` +
      ['HOSPITAL', 'ESCUELA', 'UPA']
        .map((categoria) => `${categoria} ${porCategoria[categoria] ?? 0}`)
        .join(' · ')
  );
  console.log(`Duplicados omitidos: ${duplicados.length}`);
  console.log(
    `Descartados: ${sinNombre.length} sin nombre · ${sinCategoria.length} sin categoría · ` +
      `${descartados.length} con coordenadas inválidas · ${sinGeometria} sin geometría de punto`
  );

  if (fueraDeProvincia.length > 0) {
    console.log(
      `Aviso: ${fueraDeProvincia.length} punto(s) quedan fuera del área aproximada de Santiago del Estero. Revisá el sistema de coordenadas del archivo.`
    );
  }

  if (aceptados.length > 0) {
    console.log('\nPrimeros puntos a crear:');

    for (const punto of aceptados.slice(0, 20)) {
      console.log(
        ` - [${punto.categoria}] ${punto.nombre} (${punto.latitud}, ${punto.longitud})`
      );
    }

    if (aceptados.length > 20) {
      console.log(` ... y ${aceptados.length - 20} más.`);
    }
  }

  if (duplicados.length > 0) {
    console.log('\nDuplicados omitidos:');

    for (const { punto, existente } of duplicados.slice(0, 10)) {
      console.log(` - ${punto.nombre} (${punto.categoria}) ya existe como "${existente.nombre}".`);
    }

    if (duplicados.length > 10) {
      console.log(` ... y ${duplicados.length - 10} más.`);
    }
  }

  if (sinCategoria.length > 0) {
    console.log(
      '\nHay puntos sin categoría. Asignalos todos con --categoria HOSPITAL, ESCUELA o UPA, o agregá el atributo categoria en el archivo.'
    );
  }

  if (aceptados.length === 0) {
    console.log('\nNo hay puntos nuevos para crear.');
    return;
  }

  if (!opciones.aplicar) {
    console.log('\nPrevisualización: no se guardó nada. Volvé a ejecutar con --aplicar para importar.');
    return;
  }

  const resultado = await prisma.puntoInteres.createMany({
    data: aceptados.map((punto) => ({
      nombre: punto.nombre,
      categoria: punto.categoria,
      latitud: punto.latitud,
      longitud: punto.longitud,
    })),
  });

  console.log(`\nImportación completada: ${resultado.count} punto(s) de interés creado(s).`);
}

main()
  .catch((error) => {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
