'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, FileUp, Loader2, MapPinned } from 'lucide-react';
import type { DepartamentoDTO, EstadoTramoDTO, TipoViaDTO } from '@sde/shared';
import { apiDatos, getPublico } from '@/lib/api-client';
import { formatearKm } from '@/lib/utils';
import { Aviso } from './ui/Aviso';
import { MapaLineas } from './map/MapaLineas';

interface FeatureImportada {
  id: string;
  nombre: string;
  tipoGeometria: 'LineString';
  longitudKm: number;
  atributos: Record<string, unknown>;
  geometria: { type: 'LineString'; coordinates: [number, number][] };
  origen: string;
  fueraProvincia: boolean;
}

interface PreviewImportacion {
  archivo: string;
  total: number;
  truncado: boolean;
  advertencias: string[];
  features: FeatureImportada[];
}

interface ResultadoImportacion {
  creados: Array<{ nombre: string; caminoId: string; tramoId: string }>;
  errores: Array<{ indice: number; nombre: string; mensaje: string }>;
}

const MAX_BYTES = 30 * 1024 * 1024;

export function ImportarClient() {
  const queryClient = useQueryClient();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewImportacion | null>(null);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [nombres, setNombres] = useState<Record<string, string>>({});
  const [localidad, setLocalidad] = useState('');
  const [tipoViaId, setTipoViaId] = useState('');
  const [departamentoId, setDepartamentoId] = useState('');
  const [estadoId, setEstadoId] = useState('');
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);
  const [error, setError] = useState('');

  const tiposVia = useQuery({
    queryKey: ['tipos-via'],
    queryFn: () => getPublico<TipoViaDTO[]>('/catalogos/tipos-via'),
  });
  const estados = useQuery({
    queryKey: ['estados-tramo'],
    queryFn: () => getPublico<EstadoTramoDTO[]>('/catalogos/estados-tramo'),
  });
  const departamentos = useQuery({
    queryKey: ['departamentos'],
    queryFn: () => getPublico<DepartamentoDTO[]>('/departamentos'),
  });

  const analizar = useMutation({
    mutationFn: async (file: File) => {
      const datos = new FormData();
      datos.append('archivo', file);
      return apiDatos<PreviewImportacion>('/caminos/importar', { method: 'POST', body: datos });
    },
    onSuccess: (datos) => {
      setPreview(datos);
      setResultado(null);
      setError('');
      setSeleccion(new Set(datos.features.map((feature) => feature.id)));
      setNombres(Object.fromEntries(datos.features.map((feature) => [feature.id, feature.nombre])));

      if (!localidad) {
        const sugerida = datos.features
          .map((feature) => feature.atributos.localidad ?? feature.atributos.Localidad ?? feature.atributos.LOCALIDAD)
          .find((valor) => typeof valor === 'string' && valor.trim().length > 0);
        if (typeof sugerida === 'string') setLocalidad(sugerida.trim());
      }
      if (!tipoViaId) {
        const rural = tiposVia.data?.find((tipo) => tipo.clave === 'CAMINO_RURAL');
        setTipoViaId(rural?.id ?? tiposVia.data?.[0]?.id ?? '');
      }
    },
    onError: (fallo) => {
      setPreview(null);
      setSeleccion(new Set());
      setError(fallo instanceof Error ? fallo.message : 'No se pudo analizar el archivo.');
    },
  });

  const confirmar = useMutation({
    mutationFn: async () => {
      if (!preview) throw new Error('Primero analizá un archivo.');
      if (!localidad.trim()) throw new Error('Indicá la localidad de los caminos.');
      if (!tipoViaId) throw new Error('Seleccioná el tipo de vía.');
      const features = preview.features
        .filter((feature) => seleccion.has(feature.id))
        .map((feature) => ({
          nombre: (nombres[feature.id] ?? feature.nombre).trim(),
          localidad: localidad.trim(),
          tipoViaId,
          departamentoId: departamentoId || null,
          estadoId: estadoId || undefined,
          observaciones: null,
          geometria: feature.geometria,
        }));
      if (features.length === 0) throw new Error('Seleccioná al menos una geometría.');

      return apiDatos<ResultadoImportacion>('/caminos/importar/confirmar', {
        method: 'POST',
        body: JSON.stringify({ features }),
      });
    },
    onSuccess: (datos) => {
      setResultado(datos);
      setSeleccion(new Set());
      setError('');
      void queryClient.invalidateQueries({ queryKey: ['tramos'] });
      void queryClient.invalidateQueries({ queryKey: ['caminos'] });
      void queryClient.invalidateQueries({ queryKey: ['reporte-resumen'] });
    },
    onError: (fallo) => setError(fallo instanceof Error ? fallo.message : 'No se pudo importar.'),
  });

  const lineas = useMemo(
    () =>
      (preview?.features ?? [])
        .filter((feature) => seleccion.has(feature.id))
        .map((feature) => ({
          id: feature.id,
          nombre: feature.nombre,
          coordenadas: feature.geometria.coordinates,
          color: feature.fueraProvincia ? '#dc2626' : '#0d7490',
        })),
    [preview, seleccion]
  );

  const alternar = (id: string) =>
    setSeleccion((actual) => {
      const siguiente = new Set(actual);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Importar caminos</h1>
          <p className="text-sm text-suave">
            Cargá un archivo GPKG, KML o GeoJSON. Las líneas se convierten en caminos con sus tramos.
          </p>
        </div>
        <Link href="/carga" className="boton-secundario">
          <MapPinned size={16} /> Ir a la app de carga
        </Link>
      </div>

      {error && <Aviso tipo="error">{error}</Aviso>}
      {resultado && (
        <Aviso tipo={resultado.errores.length > 0 ? 'info' : 'ok'}>
          Se importaron {resultado.creados.length} tramo(s).
          {resultado.errores.length > 0 && ` ${resultado.errores.length} geometría(s) no se pudieron crear.`}
          {resultado.errores.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-xs">
              {resultado.errores.slice(0, 10).map((fallo) => (
                <li key={`${fallo.indice}-${fallo.nombre}`}>
                  {fallo.nombre}: {fallo.mensaje}
                </li>
              ))}
            </ul>
          )}
        </Aviso>
      )}

      <section className="tarjeta space-y-3">
        <div>
          <label className="etiqueta">Archivo</label>
          <input
            type="file"
            accept=".gpkg,.kml,.geojson,.json"
            className="campo file:mr-3 file:rounded-md file:border-0 file:bg-fondo file:px-3 file:py-1.5 file:text-sm"
            onChange={(evento) => {
              const file = evento.target.files?.[0] ?? null;
              setArchivo(file);
              setPreview(null);
              setResultado(null);
              setSeleccion(new Set());
              setError('');
              if (file && file.size > MAX_BYTES) {
                setArchivo(null);
                setError('El archivo supera el límite de 30 MB.');
              }
            }}
          />
          <p className="mt-1 text-xs text-suave">
            Se aceptan GeoPackage (.gpkg), Google Earth (.kml) y GeoJSON. Límite: 30 MB.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <button
            className="boton-primario"
            disabled={!archivo || analizar.isPending}
            onClick={() => archivo && analizar.mutate(archivo)}
          >
            {analizar.isPending ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={16} />}
            Analizar archivo
          </button>
          {preview && (
            <span className="text-sm text-suave">
              {preview.total} geometría(s) detectada(s)
              {preview.truncado && ' · se muestran las primeras 500'}
            </span>
          )}
        </div>

        {preview?.advertencias.map((advertencia) => (
          <Aviso key={advertencia} tipo="info">
            <span className="flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {advertencia}
            </span>
          </Aviso>
        ))}
      </section>

      {preview && (
        <>
          <section className="tarjeta grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="etiqueta">Localidad *</label>
              <input
                className="campo"
                value={localidad}
                onChange={(evento) => setLocalidad(evento.target.value)}
                placeholder="Ej.: Añatuya"
              />
            </div>
            <div>
              <label className="etiqueta">Tipo de vía *</label>
              <select className="campo" value={tipoViaId} onChange={(evento) => setTipoViaId(evento.target.value)}>
                <option value="">Seleccionar…</option>
                {(tiposVia.data ?? []).map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="etiqueta">Departamento</label>
              <select
                className="campo"
                value={departamentoId}
                onChange={(evento) => setDepartamentoId(evento.target.value)}
              >
                <option value="">Detectar por geometría</option>
                {(departamentos.data ?? []).map((departamento) => (
                  <option key={departamento.id} value={departamento.id}>
                    {departamento.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="etiqueta">Estado inicial</label>
              <select className="campo" value={estadoId} onChange={(evento) => setEstadoId(evento.target.value)}>
                <option value="">Transitable (por defecto)</option>
                {(estados.data ?? []).map((estado) => (
                  <option key={estado.id} value={estado.id}>
                    {estado.nombre}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <section className="tarjeta">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">Geometrías detectadas</h2>
                <div className="flex gap-2">
                  <button
                    className="boton-secundario !px-2 !py-1 text-xs"
                    onClick={() => setSeleccion(new Set(preview.features.map((feature) => feature.id)))}
                  >
                    Todas
                  </button>
                  <button className="boton-secundario !px-2 !py-1 text-xs" onClick={() => setSeleccion(new Set())}>
                    Ninguna
                  </button>
                </div>
              </div>

              <div className="max-h-[28rem] overflow-auto rounded-lg border border-borde">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-fondo text-xs uppercase tracking-wide text-suave">
                    <tr>
                      <th className="w-10 px-2 py-2" />
                      <th className="px-2 py-2">Nombre</th>
                      <th className="px-2 py-2">Origen</th>
                      <th className="px-2 py-2 text-right">Longitud</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.features.map((feature) => (
                      <tr key={feature.id} className="border-t border-borde align-top">
                        <td className="px-2 py-2">
                          <input
                            type="checkbox"
                            checked={seleccion.has(feature.id)}
                            onChange={() => alternar(feature.id)}
                            aria-label={`Seleccionar ${feature.nombre}`}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            className="campo !py-1"
                            value={nombres[feature.id] ?? feature.nombre}
                            onChange={(evento) =>
                              setNombres((actual) => ({ ...actual, [feature.id]: evento.target.value }))
                            }
                          />
                          {feature.fueraProvincia && (
                            <span className="mt-1 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300">
                              <AlertTriangle size={12} /> Fuera del área provincial
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-xs text-suave">{feature.origen}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{formatearKm(feature.longitudKm)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-suave">{seleccion.size} seleccionada(s)</span>
                <button
                  className="boton-primario"
                  disabled={confirmar.isPending || seleccion.size === 0}
                  onClick={() => confirmar.mutate()}
                >
                  {confirmar.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Importar seleccionadas
                </button>
              </div>
            </section>

            <section className="tarjeta">
              <h2 className="mb-2 font-semibold">Vista previa</h2>
              <MapaLineas lineas={lineas} className="h-[26rem] w-full rounded-lg" />
              <p className="mt-2 text-xs text-suave">
                Las líneas en rojo quedan fuera del área aproximada de Santiago del Estero y la importación las
                rechazará.
              </p>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
