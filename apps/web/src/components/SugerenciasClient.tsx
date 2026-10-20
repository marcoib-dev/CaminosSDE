'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, MessageSquare, X } from 'lucide-react';
import type { EstadoSugerencia, SugerenciaDTO } from '@sde/shared';
import { apiDatos } from '@/lib/api-client';
import { formatearFechaHora } from '@/lib/utils';
import { Aviso } from './ui/Aviso';

interface SugerenciaConCamino extends SugerenciaDTO {
  camino: { id: string; nombre: string } | null;
  tramo: { id: string } | null;
}

const estadoEstilo: Record<string, string> = {
  PENDIENTE: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  REVISADA: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  DESCARTADA: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export function SugerenciasClient() {
  const [estado, setEstado] = useState<EstadoSugerencia | ''>('PENDIENTE');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const sugerencias = useQuery({
    queryKey: ['sugerencias', estado],
    queryFn: () =>
      apiDatos<SugerenciaConCamino[]>(`/sugerencias${estado ? `?estado=${estado}` : ''}`),
  });

  const cambiarEstado = useMutation({
    mutationFn: ({ id, nuevo }: { id: string; nuevo: EstadoSugerencia }) =>
      apiDatos(`/sugerencias/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ estado: nuevo }),
      }),
    onSuccess: () => {
      setError('');
      void queryClient.invalidateQueries({ queryKey: ['sugerencias'] });
    },
    onError: (fallo) => setError(fallo instanceof Error ? fallo.message : 'No se pudo actualizar.'),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Sugerencias</h1>
          <p className="text-sm text-suave">Aportes enviados por la comunidad sin necesidad de login.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-suave">Estado</label>
          <select className="campo w-44" value={estado} onChange={(evento) => setEstado(evento.target.value as EstadoSugerencia | '')}>
            <option value="PENDIENTE">Pendientes</option>
            <option value="REVISADA">Revisadas</option>
            <option value="DESCARTADA">Descartadas</option>
            <option value="">Todas</option>
          </select>
        </div>
      </div>

      {error && <Aviso tipo="error">{error}</Aviso>}

      {sugerencias.isLoading ? (
        <p className="text-sm text-suave">Cargando sugerencias…</p>
      ) : (sugerencias.data ?? []).length === 0 ? (
        <div className="tarjeta flex flex-col items-center gap-2 py-12 text-center text-suave">
          <MessageSquare size={30} />
          <p>No hay sugerencias en este estado.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {(sugerencias.data ?? []).map((sugerencia) => (
            <article key={sugerencia.id} className="tarjeta space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`chip ${estadoEstilo[sugerencia.estado]}`}>{sugerencia.estado}</span>
                <span className="text-xs text-suave">{formatearFechaHora(sugerencia.creadoEn)}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm">{sugerencia.texto}</p>
              <div className="flex flex-wrap gap-2 text-xs text-suave">
                {sugerencia.camino && <span className="chip bg-fondo">Camino: {sugerencia.camino.nombre}</span>}
                {sugerencia.tramo && <span className="chip bg-fondo">Tramo: {sugerencia.tramo.id.slice(0, 8)}</span>}
                {sugerencia.contacto && <span className="chip bg-fondo">Contacto: {sugerencia.contacto}</span>}
              </div>
              {sugerencia.estado === 'PENDIENTE' && (
                <div className="flex gap-2">
                  <button
                    className="boton-primario"
                    disabled={cambiarEstado.isPending}
                    onClick={() => cambiarEstado.mutate({ id: sugerencia.id, nuevo: 'REVISADA' })}
                  >
                    <Check size={16} /> Marcar revisada
                  </button>
                  <button
                    className="boton-secundario"
                    disabled={cambiarEstado.isPending}
                    onClick={() => cambiarEstado.mutate({ id: sugerencia.id, nuevo: 'DESCARTADA' })}
                  >
                    <X size={16} /> Descartar
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
