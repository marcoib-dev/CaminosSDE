'use client';

import { useEffect, useRef, useState } from 'react';

export interface LineaMapa {
  id: string;
  nombre?: string;
  coordenadas: [number, number][];
  color?: string;
}

let moduloLeaflet: typeof import('leaflet') | null = null;

export function MapaLineas({
  lineas,
  className = 'h-72 w-full',
  color = '#0d7490',
}: {
  lineas: LineaMapa[];
  className?: string;
  color?: string;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<import('leaflet').Map | null>(null);
  const capa = useRef<import('leaflet').LayerGroup | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    let cancelado = false;

    void (async () => {
      const L = moduloLeaflet ?? (await import('leaflet')).default;
      moduloLeaflet = L;
      if (cancelado || !contenedor.current || mapa.current) return;

      const instancia = L.map(contenedor.current, {
        preferCanvas: true,
        center: [-27.8, -63.2],
        zoom: 7,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap',
      }).addTo(instancia);
      L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(instancia);
      capa.current = L.layerGroup().addTo(instancia);
      mapa.current = instancia;
      setListo(true);

      window.setTimeout(() => instancia.invalidateSize(), 150);
    })();

    return () => {
      cancelado = true;
      mapa.current?.remove();
      mapa.current = null;
      capa.current = null;
    };
  }, []);

  useEffect(() => {
    if (!listo || !mapa.current || !capa.current || !moduloLeaflet) return;
    const L = moduloLeaflet;
    capa.current.clearLayers();

    const puntos: [number, number][] = [];
    for (const linea of lineas) {
      if (linea.coordenadas.length < 2) continue;
      L.polyline(
        linea.coordenadas.map(([lng, lat]) => [lat, lng] as [number, number]),
        { color: linea.color ?? color, weight: 4, opacity: 0.85 }
      )
        .bindTooltip(linea.nombre ?? 'Geometría')
        .addTo(capa.current);
      puntos.push(...linea.coordenadas.map(([lng, lat]) => [lat, lng] as [number, number]));
    }

    if (puntos.length > 0) {
      const limites = L.latLngBounds(puntos);
      if (limites.isValid()) mapa.current.fitBounds(limites, { padding: [24, 24], maxZoom: 16 });
    }
  }, [lineas, listo, color]);

  return <div ref={contenedor} className={className} />;
}
