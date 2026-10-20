'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AuditoriaDTO } from '@sde/shared';
import { api } from '@/lib/api-client';
import { formatearFechaHora } from '@/lib/utils';
import { Aviso } from './ui/Aviso';

const ACCIONES = ['', 'CREAR', 'EDITAR', 'BORRAR', 'IMPORTAR', 'LOGIN'];

export function AuditoriaClient() {
  const [accion, setAccion] = useState('');
  const [entidad, setEntidad] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const consulta = useMemo(() => {
    const params = new URLSearchParams({ limite: '200' });
    if (accion) params.set('accion', accion);
    if (entidad) params.set('entidad', entidad);
    if (desde) params.set('desde', `${desde}T00:00:00`);
    if (hasta) params.set('hasta', `${hasta}T23:59:59`);
    return params.toString();
  }, [accion, entidad, desde, hasta]);

  const auditoria = useQuery({
    queryKey: ['auditoria', consulta],
    queryFn: () => api<{ datos: AuditoriaDTO[]; total: number }>(`/auditoria?${consulta}`),
  });

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Auditoría</h1>
        <p className="text-sm text-suave">Registro de acciones realizadas sobre el sistema.</p>
      </div>

      <div className="tarjeta grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className="etiqueta">Acción</label>
          <select className="campo" value={accion} onChange={(e) => setAccion(e.target.value)}>
            {ACCIONES.map((valor) => (
              <option key={valor} value={valor}>
                {valor || 'Todas'}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="etiqueta">Entidad</label>
          <input className="campo" value={entidad} onChange={(e) => setEntidad(e.target.value)} placeholder="Camino, Tramo…" />
        </div>
        <div>
          <label className="etiqueta">Desde</label>
          <input type="date" className="campo" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div>
          <label className="etiqueta">Hasta</label>
          <input type="date" className="campo" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
        <div className="flex items-end">
          <span className="text-sm text-suave">{auditoria.data?.total ?? 0} registros</span>
        </div>
      </div>

      {auditoria.isError && <Aviso tipo="error">No se pudo cargar la auditoría.</Aviso>}

      <div className="tarjeta overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b border-borde text-left text-xs uppercase tracking-wide text-suave">
            <tr>
              <th className="py-2">Fecha</th>
              <th className="py-2">Usuario</th>
              <th className="py-2">Acción</th>
              <th className="py-2">Entidad</th>
              <th className="py-2">Detalle</th>
              <th className="py-2">IP</th>
            </tr>
          </thead>
          <tbody>
            {(auditoria.data?.datos ?? []).map((fila) => (
              <tr key={fila.id} className="border-b border-borde/60 align-top last:border-0">
                <td className="whitespace-nowrap py-2">{formatearFechaHora(fila.fecha)}</td>
                <td className="py-2">{fila.usuario?.nombre ?? 'Sistema / público'}</td>
                <td className="py-2">
                  <span className="chip bg-fondo">{fila.accion}</span>
                </td>
                <td className="py-2">
                  {fila.entidad}
                  {fila.entidadId && <span className="ml-1 text-xs text-suave">#{fila.entidadId.slice(0, 8)}</span>}
                </td>
                <td className="max-w-[280px] truncate py-2 text-xs text-suave" title={JSON.stringify(fila.detalle)}>
                  {fila.detalle ? JSON.stringify(fila.detalle) : '—'}
                </td>
                <td className="py-2 text-xs text-suave">{fila.ip ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
