'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, MapPinned, Search, TrendingUp } from 'lucide-react';
import type { PrioridadDTO } from '@sde/shared';
import { getPublico } from '@/lib/api-client';
import { formatearKm } from '@/lib/utils';
import { MapaLineas } from './map/MapaLineas';
import { Aviso } from './ui/Aviso';

const colorPuntaje = (puntaje: number) => {
  if (puntaje >= 70) return 'bg-red-500';
  if (puntaje >= 40) return 'bg-amber-500';
  return 'bg-emerald-500';
};

export function PrioridadesClient() {
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState('');
  const [seleccionado, setSeleccionado] = useState<PrioridadDTO | null>(null);

  const ranking = useQuery({
    queryKey: ['prioridad-tramos'],
    queryFn: () => getPublico<PrioridadDTO[]>('/tramos/prioridad?limite=300'),
  });

  const datos = ranking.data ?? [];
  const estados = useMemo(() => Array.from(new Set(datos.map((item) => item.estadoNombre))), [datos]);

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return datos.filter((item) => {
      if (estado && item.estadoNombre !== estado) return false;
      if (!texto) return true;
      return `${item.caminoNombre} ${item.localidad}`.toLowerCase().includes(texto);
    });
  }, [datos, busqueda, estado]);

  const promedio = useMemo(
    () => (filtrados.length ? filtrados.reduce((total, item) => total + item.puntaje, 0) / filtrados.length : 0),
    [filtrados]
  );

  const lineas = useMemo(
    () =>
      seleccionado
        ? [
            {
              id: seleccionado.id,
              nombre: seleccionado.caminoNombre,
              coordenadas: seleccionado.geometria.coordinates,
            },
          ]
        : filtrados.slice(0, 80).map((item) => ({
            id: item.id,
            nombre: item.caminoNombre,
            coordenadas: item.geometria.coordinates,
            color: item.estadoColor,
          })),
    [seleccionado, filtrados]
  );

  if (ranking.isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-sm text-suave">
        <span className="flex items-center gap-2">
          <Loader2 size={18} className="animate-spin" /> Calculando prioridades…
        </span>
      </div>
    );
  }

  if (ranking.error) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <Aviso tipo="error">
          {ranking.error instanceof Error ? ranking.error.message : 'No se pudo cargar el ranking de prioridades.'}
        </Aviso>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Prioridades de intervención</h1>
          <p className="text-sm text-suave">
            Ranking de tramos según estado, tipo de vía y cercanía a puntos de interés ponderados.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="tarjeta !p-3">
            <p className="text-xs uppercase text-suave">Tramos</p>
            <p className="text-xl font-semibold tabular-nums">{filtrados.length}</p>
          </div>
          <div className="tarjeta !p-3">
            <p className="text-xs uppercase text-suave">Puntaje medio</p>
            <p className="text-xl font-semibold tabular-nums">{promedio.toFixed(1)}</p>
          </div>
          <div className="tarjeta col-span-2 !p-3 sm:col-span-1">
            <p className="text-xs uppercase text-suave">Prioridad máxima</p>
            <p className="text-xl font-semibold tabular-nums">{filtrados[0]?.puntaje.toFixed(1) ?? '0.0'}</p>
          </div>
        </div>
      </div>

      <section className="tarjeta flex flex-wrap items-end gap-2">
        <div className="min-w-[220px] flex-1">
          <label className="etiqueta">Buscar camino o localidad</label>
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-2.5 text-suave" />
            <input
              className="campo pl-9"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Ej.: Ruta 34, Añatuya…"
            />
          </div>
        </div>
        <div className="min-w-[180px]">
          <label className="etiqueta">Estado</label>
          <select className="campo" value={estado} onChange={(evento) => setEstado(evento.target.value)}>
            <option value="">Todos los estados</option>
            {estados.map((nombre) => (
              <option key={nombre} value={nombre}>
                {nombre}
              </option>
            ))}
          </select>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <section className="tarjeta overflow-hidden !p-0">
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-fondo text-xs uppercase tracking-wide text-suave">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Camino</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2 text-right">Km</th>
                  <th className="px-3 py-2">Prioridad</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((item, indice) => (
                  <tr
                    key={item.id}
                    className={`cursor-pointer border-t border-borde align-top hover:bg-fondo ${
                      seleccionado?.id === item.id ? 'bg-fondo' : ''
                    }`}
                    onClick={() => setSeleccionado(item)}
                  >
                    <td className="px-3 py-2 text-suave tabular-nums">{indice + 1}</td>
                    <td className="px-3 py-2">
                      <p className="font-medium">{item.caminoNombre}</p>
                      <p className="text-xs text-suave">
                        {item.localidad} · {item.tipoVia.replaceAll('_', ' ')}
                      </p>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="chip"
                        style={{ backgroundColor: `${item.estadoColor}22`, color: item.estadoColor }}
                      >
                        {item.estadoNombre}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatearKm(item.longitudKm)}</td>
                    <td className="min-w-[120px] px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-fondo">
                          <div
                            className={`h-full rounded-full ${colorPuntaje(item.puntaje)}`}
                            style={{ width: `${Math.max(0, Math.min(100, item.puntaje))}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-xs font-semibold tabular-nums">
                          {item.puntaje.toFixed(1)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtrados.length === 0 && <p className="p-6 text-center text-sm text-suave">No hay tramos que coincidan.</p>}
          </div>
        </section>

        <section className="tarjeta space-y-3">
          <h2 className="flex items-center gap-2 font-semibold">
            <MapPinned size={18} /> {seleccionado ? seleccionado.caminoNombre : 'Mapa del ranking'}
          </h2>
          {seleccionado && (
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="chip bg-fondo">Estado: {seleccionado.puntajeEstado.toFixed(0)} pts</span>
              <span className="chip bg-fondo">Tipo de vía: {seleccionado.puntajeTipo.toFixed(0)} pts</span>
              <span className="chip bg-fondo">Cercanía: {seleccionado.puntajeCercania.toFixed(0)} pts</span>
              <span className="chip bg-marca/10 text-marca">
                <TrendingUp size={12} /> Total {seleccionado.puntaje.toFixed(1)}
              </span>
            </div>
          )}
          <MapaLineas lineas={lineas} className="h-[28rem] w-full rounded-lg" />
          <p className="text-xs text-suave">
            {seleccionado
              ? `Tramo de ${formatearKm(seleccionado.longitudKm)} en ${seleccionado.localidad}.`
              : 'Seleccioná un tramo de la tabla para ver su geometría y el desglose del puntaje.'}
          </p>
        </section>
      </div>
    </div>
  );
}
