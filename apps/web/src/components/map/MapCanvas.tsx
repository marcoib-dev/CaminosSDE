'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import type { EstadoTramoDTO, FeatureCollectionDTO, InfraestructuraDTO, PuntoInteresDTO, TipoViaDTO } from '@sde/shared';
import { bboxDeMapa } from '@/lib/utils';
import { colorEstado, colorTipoVia, estiloTipoVia } from '@/lib/constants';

export interface TramoProps {
  id: string;
  caminoId: string;
  longitudKm: number;
  estadoId: string;
  estado: EstadoTramoDTO;
  observaciones: string | null;
  version: number;
  camino: {
    id: string;
    nombre: string;
    localidad: string;
    departamentoId: string | null;
    departamento: { id: string | null; nombre: string } | null;
    tipoViaId: string;
  };
}

export interface MapCanvasProps {
  tramos: FeatureCollectionDTO<TramoProps>;
  puntos?: PuntoInteresDTO[];
  infraestructura?: InfraestructuraDTO[];
  tiposVia?: TipoViaDTO[];
  colorPor?: 'estado' | 'tipoVia';
  onViewportChange?: (bbox: [number, number, number, number]) => void;
  onTramoClick?: (tramo: TramoProps) => void;
  onPuntoClick?: (punto: PuntoInteresDTO) => void;
  onInfraClick?: (infraestructura: InfraestructuraDTO) => void;
  onMapClick?: (punto: [number, number]) => void;
  draftPoints?: [number, number][];
  dibujando?: boolean;
  mostrarGps?: boolean;
  centrarEn?: [number, number] | null;
  className?: string;
}

export default function MapCanvas({
  tramos,
  puntos = [],
  infraestructura = [],
  tiposVia = [],
  colorPor = 'estado',
  onViewportChange,
  onTramoClick,
  onPuntoClick,
  onInfraClick,
  onMapClick,
  draftPoints = [],
  dibujando = false,
  mostrarGps = false,
  centrarEn = null,
  className = 'h-full w-full',
}: MapCanvasProps) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const capaTramos = useRef<L.LayerGroup | null>(null);
  const capaPuntos = useRef<L.MarkerClusterGroup | null>(null);
  const capaInfra = useRef<L.MarkerClusterGroup | null>(null);
  const capaBorrador = useRef<L.LayerGroup | null>(null);
  const capaGps = useRef<L.LayerGroup | null>(null);
  const temporizador = useRef<number | null>(null);

  const callbacks = useRef({ onViewportChange, onTramoClick, onPuntoClick, onInfraClick, onMapClick });
  callbacks.current = { onViewportChange, onTramoClick, onPuntoClick, onInfraClick, onMapClick };

  useEffect(() => {
    if (!contenedor.current || mapa.current) return;

    const instancia = L.map(contenedor.current, {
      preferCanvas: true,
      zoomControl: false,
      center: [-27.8, -63.2],
      zoom: 7,
    });

    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    });
    const satelite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19, attribution: '© Esri, Maxar, Earthstar Geographics' }
    );

    osm.addTo(instancia);
    L.control.layers({ 'Mapa base': osm, Satélite: satelite }, undefined, { position: 'topright' }).addTo(instancia);
    L.control.zoom({ position: 'bottomright' }).addTo(instancia);
    L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(instancia);

    capaTramos.current = L.layerGroup().addTo(instancia);
    capaPuntos.current = L.markerClusterGroup({ maxClusterRadius: 50, disableClusteringAtZoom: 14 }).addTo(instancia);
    capaInfra.current = L.markerClusterGroup({ maxClusterRadius: 45 }).addTo(instancia);
    capaBorrador.current = L.layerGroup().addTo(instancia);
    capaGps.current = L.layerGroup().addTo(instancia);

    instancia.on('moveend zoomend', () => {
      if (temporizador.current) window.clearTimeout(temporizador.current);
      temporizador.current = window.setTimeout(() => {
        callbacks.current.onViewportChange?.(bboxDeMapa(instancia));
      }, 400);
    });

    instancia.on('click', (evento: L.LeafletMouseEvent) => {
      callbacks.current.onMapClick?.([evento.latlng.lng, evento.latlng.lat]);
    });

    mapa.current = instancia;
    window.setTimeout(() => {
      instancia.invalidateSize();
      callbacks.current.onViewportChange?.(bboxDeMapa(instancia));
    }, 250);

    return () => {
      if (temporizador.current) window.clearTimeout(temporizador.current);
      instancia.remove();
      mapa.current = null;
    };
  }, []);

  useEffect(() => {
    const instancia = mapa.current;
    const capa = capaTramos.current;
    if (!instancia || !capa) return;
    capa.clearLayers();

    for (const feature of tramos.features ?? []) {
      if (!feature.geometry || feature.geometry.type !== 'LineString') continue;
      const props = feature.properties;
      const tipoVia = tiposVia.find((tipo) => tipo.id === props.camino.tipoViaId);
      const color = colorPor === 'estado' ? colorEstado(props.estado) : colorTipoVia(tipoVia);
      const estilo = colorPor === 'estado' ? { weight: 4 } : estiloTipoVia(tipoVia);
      const coordenadas = feature.geometry.coordinates.map(([lng, lat]) => [lat, lng]) as [number, number][];

      L.polyline(coordenadas, {
        color,
        weight: estilo.weight,
        dashArray: estilo.dashArray,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      })
        .bindTooltip(`${props.camino.nombre} · ${props.estado?.nombre ?? ''}`, { sticky: true })
        .on('click', (evento) => {
          L.DomEvent.stopPropagation(evento);
          callbacks.current.onTramoClick?.(props);
        })
        .addTo(capa);
    }
  }, [tramos, colorPor, tiposVia]);

  useEffect(() => {
    const capa = capaPuntos.current;
    if (!capa) return;
    capa.clearLayers();

    for (const punto of puntos) {
      const marcador = L.circleMarker([punto.latitud, punto.longitud], {
        radius: 7,
        color: '#ffffff',
        weight: 2,
        fillColor: punto.categoriaPunto?.color ?? '#0e7490',
        fillOpacity: 1,
      });
      marcador.bindTooltip(`${punto.nombre} (${punto.categoriaPunto?.nombre ?? punto.categoria})`);
      marcador.on('click', (evento) => {
        L.DomEvent.stopPropagation(evento);
        callbacks.current.onPuntoClick?.(punto);
      });
      capa.addLayer(marcador);
    }
  }, [puntos]);

  useEffect(() => {
    const capa = capaInfra.current;
    if (!capa) return;
    capa.clearLayers();

    for (const item of infraestructura) {
      if (!item.geom?.coordinates) continue;
      const [lng, lat] = item.geom.coordinates;
      const icono =
        item.tipo === 'PUENTE'
          ? '<span style="font-size:15px;line-height:1">≡</span>'
          : item.tipo === 'TAPA'
            ? '<span style="font-size:13px;line-height:1">○</span>'
            : '<span style="font-size:13px;line-height:1">▤</span>';
      const marcador = L.marker([lat, lng], {
        icon: L.divIcon({
          className: '',
          html: `<div style="display:grid;place-items:center;width:24px;height:24px;border-radius:6px;background:#7c3aed;color:#fff;border:2px solid #fff;box-shadow:0 1px 4px #0004">${icono}</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        }),
      });
      marcador.bindTooltip(`${item.tipo}${item.descripcion ? ` · ${item.descripcion}` : ''}`);
      marcador.on('click', (evento) => {
        L.DomEvent.stopPropagation(evento);
        callbacks.current.onInfraClick?.(item);
      });
      capa.addLayer(marcador);
    }
  }, [infraestructura]);

  useEffect(() => {
    const capa = capaBorrador.current;
    if (!capa) return;
    capa.clearLayers();
    if (draftPoints.length === 0) return;

    const coordenadas = draftPoints.map(([lng, lat]) => [lat, lng]) as [number, number][];
    if (coordenadas.length > 1) {
      L.polyline(coordenadas, {
        color: dibujando ? '#0ea5e9' : '#f59e0b',
        weight: 4,
        dashArray: dibujando ? '8 6' : undefined,
      }).addTo(capa);
    }
    for (const [indice, punto] of coordenadas.entries()) {
      L.circleMarker(punto, {
        radius: 5,
        color: '#ffffff',
        weight: 2,
        fillColor: indice === 0 ? '#16a34a' : '#0ea5e9',
        fillOpacity: 1,
      }).addTo(capa);
    }
  }, [draftPoints, dibujando]);

  useEffect(() => {
    const instancia = mapa.current;
    if (!instancia) return;
    contenedor.current?.classList.toggle('cursor-crosshair', dibujando);
  }, [dibujando]);

  useEffect(() => {
    const instancia = mapa.current;
    const capa = capaGps.current;
    if (!instancia || !capa) return;
    if (!mostrarGps) {
      instancia.stopLocate();
      capa.clearLayers();
      return;
    }

    const alUbicar = (evento: L.LocationEvent) => {
      capa.clearLayers();
      L.circle([evento.latlng.lat, evento.latlng.lng], {
        radius: evento.accuracy,
        color: '#0ea5e9',
        weight: 1,
        fillColor: '#0ea5e9',
        fillOpacity: 0.15,
      }).addTo(capa);
      L.circleMarker([evento.latlng.lat, evento.latlng.lng], {
        radius: 7,
        color: '#fff',
        weight: 2,
        fillColor: '#0284c7',
        fillOpacity: 1,
      })
        .bindTooltip(`Precisión ±${Math.round(evento.accuracy)} m`)
        .addTo(capa);
    };

    instancia.on('locationfound', alUbicar);
    instancia.locate({ watch: true, enableHighAccuracy: true, setView: true, maxZoom: 16 });

    return () => {
      instancia.off('locationfound', alUbicar);
      instancia.stopLocate();
    };
  }, [mostrarGps]);

  useEffect(() => {
    if (centrarEn && mapa.current) mapa.current.setView(centrarEn, 15);
  }, [centrarEn]);

  return <div ref={contenedor} className={className} />;
}
