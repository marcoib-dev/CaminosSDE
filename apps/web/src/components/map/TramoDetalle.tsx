'use client';

import { useQuery } from '@tanstack/react-query';
import type { PrioridadDTO } from '@sde/shared';
import { Modal } from '../ui/Modal';
import { SugerenciaForm } from '../SugerenciaForm';
import { formatearKm } from '@/lib/utils';
import { getPublico } from '@/lib/api-client';
import type { TramoProps } from './MapCanvas';

interface FotoDTO {
  id: string;
  url: string;
  descripcion: string | null;
}

interface CaminoDetalle {
  id: string;
  nombre: string;
  longitudKm: number;
  fotos: FotoDTO[];
}

export function TramoDetalle({ tramo, onCerrar }: { tramo: TramoProps | null; onCerrar: () => void }) {
  const prioridad = useQuery({
    queryKey: ['prioridad-tramos'],
    queryFn: () => getPublico<PrioridadDTO[]>('/tramos/prioridad?limite=300'),
    enabled: Boolean(tramo),
    staleTime: 60_000,
  });

  const camino = useQuery({
    queryKey: ['camino-detalle', tramo?.camino.id],
    queryFn: () => getPublico<CaminoDetalle>(`/caminos/${tramo!.camino.id}`),
    enabled: Boolean(tramo?.camino.id),
  });

  const puntaje = prioridad.data?.find((item) => item.id === tramo?.id);
  const fotos = camino.data?.fotos ?? [];

  return (
    <Modal abierto={Boolean(tramo)} titulo={tramo?.camino.nombre ?? 'Tramo'} onCerrar={onCerrar} ancho="max-w-2xl">
      {tramo && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="chip text-white" style={{ backgroundColor: tramo.estado.colorHex }}>
              {tramo.estado.nombre}
            </span>
            <span className="chip bg-fondo text-suave">{formatearKm(tramo.longitudKm)}</span>
            <span className="chip bg-fondo text-suave">{tramo.camino.localidad}</span>
            {tramo.camino.departamento && (
              <span className="chip bg-fondo text-suave">{tramo.camino.departamento.nombre}</span>
            )}
            {puntaje && (
              <span className="chip bg-marca/10 font-semibold text-marca">
                Prioridad {puntaje.puntaje.toFixed(1)} / 100
              </span>
            )}
          </div>

          {puntaje && (
            <div className="rounded-lg border border-borde p-3">
              <div className="mb-2 flex items-center justify-between text-xs text-suave">
                <span>Puntaje de prioridad</span>
                <span className="font-semibold text-texto">{puntaje.puntaje.toFixed(1)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-fondo">
                <div
                  className="h-full rounded-full bg-marca"
                  style={{ width: `${Math.max(0, Math.min(100, puntaje.puntaje))}%` }}
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                <span className="chip bg-fondo">Estado: {puntaje.puntajeEstado.toFixed(0)}</span>
                <span className="chip bg-fondo">Tipo de vía: {puntaje.puntajeTipo.toFixed(0)}</span>
                <span className="chip bg-fondo">Cercanía a POI: {puntaje.puntajeCercania.toFixed(0)}</span>
              </div>
            </div>
          )}

          {tramo.observaciones && <p className="text-sm text-suave">{tramo.observaciones}</p>}

          {fotos.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold">Fotos del camino</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {fotos.slice(0, 6).map((foto) => (
                  <a
                    key={foto.id}
                    href={foto.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-lg border border-borde"
                  >
                    <img
                      src={foto.url}
                      alt={foto.descripcion ?? 'Foto del camino'}
                      loading="lazy"
                      className="h-28 w-full object-cover"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-borde p-3">
            <p className="mb-3 text-sm font-semibold">Sugerir un cambio</p>
            <SugerenciaForm caminoId={tramo.camino.id} tramoId={tramo.id} />
          </div>
        </div>
      )}
    </Modal>
  );
}
