import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { calcularLongitudKm } from '../utils/geojson.js';
import { registrarAuditoria } from './auditoria.service.js';
import { invalidarPrioridades } from './cachePrioridad.js';
import { leerArchivoDeImportacion } from './importacion/lectura.js';
import {
  inferirDepartamento,
  inferirEstado,
  inferirLocalidad,
  inferirNombre,
  inferirTipo,
  normalizarMapeo,
} from './importacion/mapeo.js';

const redondearKm = (km) => Math.round(km * 1000) / 1000;

function clavesDeAtributos(features) {
  const claves = new Set();

  for (const feature of features) {
    for (const clave of Object.keys(feature.atributos ?? {})) {
      claves.add(clave);
    }
  }

  return [...claves];
}

/**
 * Lee el archivo y devuelve la previsualización con sugerencias de mapeo.
 * No guarda nada en la base.
 */
export async function previsualizarImportacion({ buffer, nombreArchivo, mapeo }) {
  const reglas = normalizarMapeo(mapeo);
  const leido = await leerArchivoDeImportacion({ buffer, nombreArchivo });

  const numerosDeOrigen = new Map();

  const features = leido.features.map((feature) => {
    if (!numerosDeOrigen.has(feature.origen)) {
      numerosDeOrigen.set(feature.origen, numerosDeOrigen.size + 1);
    }

    const nombre = inferirNombre(feature.atributos) || `Camino importado ${numerosDeOrigen.get(feature.origen)}`;

    return {
      id: feature.id,
      origen: feature.origen,
      grupo: feature.origen,
      capa: feature.capa,
      nombre,
      parte: feature.parte,
      partes: feature.partes,
      tipoGeometria: feature.tipoGeometria,
      tipoGeometriaOriginal: feature.tipoGeometriaOriginal,
      longitudKm: feature.longitudKm,
      atributos: feature.atributos,
      geometria: feature.geometria,
      estadoSugerido: inferirEstado(feature.atributos, reglas.estado),
      tipoSugerido: inferirTipo(feature.atributos, reglas.tipo),
      localidadSugerida: inferirLocalidad(feature.atributos),
      departamentoSugerido: inferirDepartamento(feature.atributos),
    };
  });

  return {
    archivo: nombreArchivo,
    formato: leido.formato,
    capas: leido.capas,
    sistemasCoordenadas: leido.sistemasCoordenadas,
    reproyectado: leido.reproyectado,
    total: features.length,
    descartados: leido.descartados,
    advertencias: leido.advertencias,
    clavesAtributos: clavesDeAtributos(features),
    features,
  };
}

/**
 * Guarda los tramos aprobados. Los tramos con el mismo `grupo` (las partes de
 * un mismo MultiLineString) se agregan como tramos de un único camino.
 */
export async function confirmarImportacion({ features, mapeo }, { usuarioId = null, ip = null } = {}) {
  const reglas = normalizarMapeo(mapeo);

  const resultado = await prisma.$transaction(
    async (tx) => {
      const caminoPorGrupo = new Map();
      const caminos = [];
      const tramos = [];

      for (const [indice, feature] of features.entries()) {
        const estado = feature.estado ?? inferirEstado(feature.atributos ?? {}, reglas.estado);
        const tipo = feature.tipo ?? inferirTipo(feature.atributos ?? {}, reglas.tipo);
        const longitudKm = calcularLongitudKm(feature.geometria);

        let camino;

        if (feature.caminoId) {
          camino = await tx.camino.findUnique({
            where: { id: feature.caminoId },
            select: { id: true, nombre: true, localidad: true, departamento: true },
          });

          if (!camino) {
            throw new ApiError(404, `El camino con id ${feature.caminoId} no existe.`);
          }
        } else {
          const clave = feature.grupo || `f${indice}`;
          camino = caminoPorGrupo.get(clave);

          if (!camino) {
            camino = await tx.camino.create({
              data: {
                nombre: feature.nombre,
                localidad: feature.localidad,
                departamento: feature.departamento,
                descripcion: feature.descripcion ?? null,
              },
            });

            caminoPorGrupo.set(clave, camino);
            caminos.push({
              id: camino.id,
              nombre: camino.nombre,
              localidad: camino.localidad,
              departamento: camino.departamento,
            });

            await registrarAuditoria(
              {
                usuarioId,
                accion: 'CREAR',
                entidad: 'Camino',
                entidadId: camino.id,
                detalle: {
                  origen: 'importacion',
                  nombre: camino.nombre,
                  localidad: camino.localidad,
                  departamento: camino.departamento,
                },
                ip,
              },
              tx
            );
          }
        }

        const tramo = await tx.tramo.create({
          data: {
            caminoId: camino.id,
            geometria: feature.geometria,
            longitudKm,
            estado,
            tipo,
            observaciones: feature.observaciones ?? null,
          },
        });

        tramos.push({
          id: tramo.id,
          caminoId: camino.id,
          estado: tramo.estado,
          tipo: tramo.tipo,
          longitudKm: tramo.longitudKm,
        });

        await registrarAuditoria(
          {
            usuarioId,
            accion: 'CREAR',
            entidad: 'Tramo',
            entidadId: tramo.id,
            detalle: {
              origen: 'importacion',
              caminoId: camino.id,
              estado: tramo.estado,
              tipo: tramo.tipo,
              longitudKm: tramo.longitudKm,
            },
            ip,
          },
          tx
        );
      }

      const longitudTotalKm = tramos.reduce((total, tramo) => total + tramo.longitudKm, 0);

      return {
        resumen: {
          caminosCreados: caminos.length,
          tramosCreados: tramos.length,
          longitudTotalKm: redondearKm(longitudTotalKm),
        },
        caminos,
        tramos,
      };
    },
    { timeout: 60000, maxWait: 15000 }
  );

  invalidarPrioridades();
  return resultado;
}
