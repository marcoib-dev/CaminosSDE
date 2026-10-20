'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Filter, Loader2, Route } from 'lucide-react';
import type {
  DepartamentoDTO,
  EstadoTramoDTO,
  FeatureCollectionDTO,
  InfraestructuraDTO,
  PuntoInteresDTO,
  TipoViaDTO,
} from '@sde/shared';
import { getPublico } from '@/lib/api-client';
import { useMapStore } from '@/lib/stores';
import { MapView } from './map/MapView';
import type { TramoProps } from './map/MapCanvas';
import { PanelFiltros, type FiltrosMapa } from './map/PanelFiltros';
import { Leyenda } from './map/Leyenda';
import { TramoDetalle } from './map/TramoDetalle';
import { formatearKm } from '@/lib/utils';

type Bbox = [number, number, number, number];
type TramoFC = FeatureCollectionDTO<TramoProps>;

const consulta = (params: Record<string, string | undefined>) => {
  const busqueda = new URLSearchParams();
  for (const [clave, valor] of Object.entries(params)) {
    if (valor) busqueda.set(clave, valor);
  }
  const texto = busqueda.toString();
  return texto ? `?${texto}` : '';
};

export function DashboardMap({ rol }: { rol: 'ADMIN' | 'EDITOR' | null }) {
  const [bbox, setBbox] = useState<Bbox | null>(null);
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [mostrarPuntos, setMostrarPuntos] = useState(false);
  const [filtros, setFiltros] = useState<FiltrosMapa>({
    estadoId: '',
    tipoViaId: '',
    departamentoId: '',
    q: '',
  });
  const [tramoSeleccionado, setTramoSeleccionado] = useState<TramoProps | null>(null);
  const { colorPor, setColorPor } = useMapStore();

  const { data: estados = [] } = useQuery({
    queryKey: ['estados-tramo'],
    queryFn: () => getPublico<EstadoTramoDTO[]>('/catalogos/estados-tramo'),
  });
  const { data: tiposVia = [] } = useQuery({
    queryKey: ['tipos-via'],
    queryFn: () => getPublico<TipoViaDTO[]>('/catalogos/tipos-via'),
  });
  const { data: departamentos = [] } = useQuery({
    queryKey: ['departamentos'],
    queryFn: () => getPublico<DepartamentoDTO[]>('/departamentos'),
  });

  const params = useMemo(
    () => ({
      bbox: bbox?.join(','),
      estadoId: filtros.estadoId || undefined,
      tipoViaId: filtros.tipoViaId || undefined,
      departamentoId: filtros.departamentoId || undefined,
      q: filtros.q.trim() || undefined,
      zoom: '12',
    }),
    [bbox, filtros]
  );

  const tramosQuery = useQuery({
    queryKey: ['tramos-mapa', params],
    queryFn: () => getPublico<TramoFC>(`/tramos${consulta(params)}`),
    enabled: Boolean(bbox),
    placeholderData: (anterior) => anterior,
  });

  const puntosQuery = useQuery({
    queryKey: ['puntos-mapa', bbox],
    queryFn: () =>
      getPublico<PuntoInteresDTO[]>(`/puntos-interes?bbox=${bbox!.join(',')}`),
    enabled: Boolean(bbox) && mostrarPuntos,
  });

  const infraQuery = useQuery({
    queryKey: ['infra-mapa', bbox],
    queryFn: () =>
      getPublico<InfraestructuraDTO[]>(`/infraestructura?bbox=${bbox!.join(',')}`),
    enabled: Boolean(bbox),
  });

  const totalKm = (tramosQuery.data?.features ?? []).reduce(
    (total, feature) => total + (feature.properties.longitudKm ?? 0),
    0
  );

  return (
    <div className="relative h-[calc(100vh-3.5rem)] w-full overflow-hidden">
      <MapView
        tramos={tramosQuery.data ?? { type: 'FeatureCollection', features: [] }}
        puntos={mostrarPuntos ? puntosQuery.data ?? [] : []}
        infraestructura={infraQuery.data ?? []}
        tiposVia={tiposVia}
        colorPor={colorPor}
        onViewportChange={setBbox}
        onTramoClick={setTramoSeleccionado}
      />

      <PanelFiltros
        abierto={panelAbierto}
        onCerrar={() => setPanelAbierto(false)}
        filtros={filtros}
        setFiltros={setFiltros}
        estados={estados}
        tiposVia={tiposVia}
        departamentos={departamentos}
        colorPor={colorPor}
        setColorPor={setColorPor}
        mostrarPuntos={mostrarPuntos}
        setMostrarPuntos={setMostrarPuntos}
      />

      <div className="pointer-events-none absolute left-3 right-3 top-3 z-[900] flex items-start justify-between lg:left-[336px]">
        <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-borde bg-panel/95 px-3 py-2 text-sm shadow-panel backdrop-blur">
          <button className="boton-secundario !px-2 lg:hidden" onClick={() => setPanelAbierto(true)} aria-label="Abrir filtros">
            <Filter size={16} />
          </button>
          <Route size={16} className="text-marca" />
          <span className="font-semibold">{tramosQuery.data?.features.length ?? 0}</span>
          <span className="text-suave">tramos · {formatearKm(totalKm)}</span>
          {tramosQuery.isFetching && <Loader2 size={14} className="animate-spin text-suave" />}
        </div>

        {rol && (
          <Link href="/carga" className="boton-primario pointer-events-auto shadow-panel">
            <ClipboardList size={16} /> App de carga
          </Link>
        )}
      </div>

      <div className="pointer-events-none absolute bottom-4 left-3 z-[900] lg:left-[336px]">
        <div className="pointer-events-auto">
          <Leyenda estados={estados} tiposVia={tiposVia} colorPor={colorPor} />
        </div>
      </div>

      <TramoDetalle tramo={tramoSeleccionado} onCerrar={() => setTramoSeleccionado(null)} />
    </div>
  );
}
