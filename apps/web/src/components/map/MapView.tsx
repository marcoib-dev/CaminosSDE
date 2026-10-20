'use client';

import dynamic from 'next/dynamic';
import type { MapCanvasProps } from './MapCanvas';

const Mapa = dynamic(() => import('./MapCanvas'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-fondo text-sm text-suave">Cargando mapa…</div>
  ),
});

export function MapView(props: MapCanvasProps) {
  return <Mapa {...props} />;
}
