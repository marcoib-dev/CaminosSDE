'use client';

import { Filter, Layers, Search, X } from 'lucide-react';
import type { DepartamentoDTO, EstadoTramoDTO, TipoViaDTO } from '@sde/shared';

export interface FiltrosMapa {
  estadoId: string;
  tipoViaId: string;
  departamentoId: string;
  q: string;
}

export function PanelFiltros({
  abierto,
  onCerrar,
  filtros,
  setFiltros,
  estados,
  tiposVia,
  departamentos,
  colorPor,
  setColorPor,
  mostrarPuntos,
  setMostrarPuntos,
}: {
  abierto: boolean;
  onCerrar: () => void;
  filtros: FiltrosMapa;
  setFiltros: (filtros: FiltrosMapa) => void;
  estados: EstadoTramoDTO[];
  tiposVia: TipoViaDTO[];
  departamentos: DepartamentoDTO[];
  colorPor: 'estado' | 'tipoVia';
  setColorPor: (valor: 'estado' | 'tipoVia') => void;
  mostrarPuntos: boolean;
  setMostrarPuntos: (valor: boolean) => void;
}) {
  const cambiar = (campo: keyof FiltrosMapa, valor: string) => setFiltros({ ...filtros, [campo]: valor });
  const limpiar = () => setFiltros({ estadoId: '', tipoViaId: '', departamentoId: '', q: '' });

  return (
    <div
      className={`absolute left-0 top-0 z-[1000] h-full w-[min(88vw,320px)] overflow-y-auto border-r border-borde bg-panel/95 p-4 shadow-panel backdrop-blur transition-transform lg:translate-x-0 ${
        abierto ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold">
          <Filter size={17} /> Filtros
        </h2>
        <button className="rounded-lg p-1 text-suave hover:bg-fondo lg:hidden" onClick={onCerrar} aria-label="Cerrar filtros">
          <X size={18} />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="etiqueta">Buscar por nombre</label>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-2.5 text-suave" />
            <input
              className="campo pl-9"
              value={filtros.q}
              onChange={(evento) => cambiar('q', evento.target.value)}
              placeholder="Camino, localidad…"
            />
          </div>
        </div>

        <div>
          <label className="etiqueta">Estado del tramo</label>
          <select className="campo" value={filtros.estadoId} onChange={(evento) => cambiar('estadoId', evento.target.value)}>
            <option value="">Todos</option>
            {estados.map((estado) => (
              <option key={estado.id} value={estado.id}>
                {estado.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="etiqueta">Tipo de vía</label>
          <select className="campo" value={filtros.tipoViaId} onChange={(evento) => cambiar('tipoViaId', evento.target.value)}>
            <option value="">Todos</option>
            {tiposVia.map((tipo) => (
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
            value={filtros.departamentoId}
            onChange={(evento) => cambiar('departamentoId', evento.target.value)}
          >
            <option value="">Todos</option>
            {departamentos.map((departamento) => (
              <option key={departamento.id} value={departamento.id}>
                {departamento.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="etiqueta">Colorear por</label>
          <select className="campo" value={colorPor} onChange={(evento) => setColorPor(evento.target.value as 'estado' | 'tipoVia')}>
            <option value="estado">Estado</option>
            <option value="tipoVia">Tipo de vía</option>
          </select>
        </div>

        <label className="flex items-center gap-2 rounded-lg border border-borde p-3 text-sm">
          <input type="checkbox" checked={mostrarPuntos} onChange={(evento) => setMostrarPuntos(evento.target.checked)} />
          <Layers size={16} /> Mostrar puntos de interés
        </label>

        <button className="boton-secundario w-full" onClick={limpiar}>
          Limpiar filtros
        </button>
      </div>
    </div>
  );
}
