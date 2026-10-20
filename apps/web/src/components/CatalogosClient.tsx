'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import type { CapaDTO, DepartamentoDTO, EstadoTramoDTO, TipoViaDTO } from '@sde/shared';
import { apiDatos } from '@/lib/api-client';
import { Aviso } from './ui/Aviso';

export function CatalogosClient() {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [nombreTipo, setNombreTipo] = useState('');
  const [nombreEstado, setNombreEstado] = useState('');
  const [colorEstado, setColorEstado] = useState('#0d7490');
  const [nombreCapa, setNombreCapa] = useState('');
  const [organismoCapa, setOrganismoCapa] = useState('Vialidad');
  const [nombreDepto, setNombreDepto] = useState('');
  const [tipoEditando, setTipoEditando] = useState<TipoViaDTO | null>(null);
  const [estadoEditando, setEstadoEditando] = useState<EstadoTramoDTO | null>(null);
  const [capaEditando, setCapaEditando] = useState<CapaDTO | null>(null);
  const [deptoEditando, setDeptoEditando] = useState<DepartamentoDTO | null>(null);

  const tipos = useQuery({ queryKey: ['tipos-via'], queryFn: () => apiDatos<TipoViaDTO[]>('/catalogos/tipos-via') });
  const estados = useQuery({
    queryKey: ['estados-tramo'],
    queryFn: () => apiDatos<EstadoTramoDTO[]>('/catalogos/estados-tramo'),
  });
  const capas = useQuery({ queryKey: ['capas'], queryFn: () => apiDatos<CapaDTO[]>('/capas') });
  const departamentos = useQuery({
    queryKey: ['departamentos'],
    queryFn: () => apiDatos<DepartamentoDTO[]>('/departamentos'),
  });

  const refrescar = (clave: string) => void queryClient.invalidateQueries({ queryKey: [clave] });

  const crearTipo = useMutation({
    mutationFn: () =>
      apiDatos('/catalogos/tipos-via', {
        method: 'POST',
        body: JSON.stringify({ nombre: nombreTipo }),
      }),
    onSuccess: () => {
      setNombreTipo('');
      setError('');
      refrescar('tipos-via');
    },
    onError: (fallo) => setError(fallo instanceof Error ? fallo.message : 'No se pudo crear.'),
  });

  const crearEstado = useMutation({
    mutationFn: () =>
      apiDatos('/catalogos/estados-tramo', {
        method: 'POST',
        body: JSON.stringify({ nombre: nombreEstado, colorHex: colorEstado }),
      }),
    onSuccess: () => {
      setNombreEstado('');
      setError('');
      refrescar('estados-tramo');
    },
    onError: (fallo) => setError(fallo instanceof Error ? fallo.message : 'No se pudo crear.'),
  });

  const actualizarTipo = useMutation({
    mutationFn: (tipo: TipoViaDTO) =>
      apiDatos<TipoViaDTO>(`/catalogos/tipos-via/${tipo.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          nombre: tipo.nombre,
          descripcion: tipo.descripcion,
          orden: tipo.orden,
          activo: tipo.activo,
        }),
      }),
    onSuccess: () => {
      setTipoEditando(null);
      setError('');
      refrescar('tipos-via');
    },
    onError: (fallo) => setError(fallo instanceof Error ? fallo.message : 'No se pudo actualizar.'),
  });

  const actualizarEstado = useMutation({
    mutationFn: (estado: EstadoTramoDTO) =>
      apiDatos<EstadoTramoDTO>(`/catalogos/estados-tramo/${estado.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          nombre: estado.nombre,
          colorHex: estado.colorHex,
          orden: estado.orden,
          activo: estado.activo,
        }),
      }),
    onSuccess: () => {
      setEstadoEditando(null);
      setError('');
      refrescar('estados-tramo');
    },
    onError: (fallo) => setError(fallo instanceof Error ? fallo.message : 'No se pudo actualizar.'),
  });

  const crearCapa = useMutation({
    mutationFn: () =>
      apiDatos('/capas', {
        method: 'POST',
        body: JSON.stringify({
          clave: nombreCapa
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, '_')
            .replace(/^_|_$/g, ''),
          nombre: nombreCapa,
          organismo: organismoCapa,
        }),
      }),
    onSuccess: () => {
      setNombreCapa('');
      setError('');
      refrescar('capas');
    },
    onError: (fallo) => setError(fallo instanceof Error ? fallo.message : 'No se pudo crear.'),
  });

  const crearDepto = useMutation({
    mutationFn: () =>
      apiDatos('/departamentos', {
        method: 'POST',
        body: JSON.stringify({ nombre: nombreDepto }),
      }),
    onSuccess: () => {
      setNombreDepto('');
      setError('');
      refrescar('departamentos');
    },
    onError: (fallo) => setError(fallo instanceof Error ? fallo.message : 'No se pudo crear.'),
  });

  const actualizarCapa = useMutation({
    mutationFn: (capa: CapaDTO) =>
      apiDatos<CapaDTO>(`/capas/${capa.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          nombre: capa.nombre,
          organismo: capa.organismo,
          activa: capa.activa,
        }),
      }),
    onSuccess: () => {
      setCapaEditando(null);
      setError('');
      refrescar('capas');
      refrescar('capas-permitidas');
    },
    onError: (fallo) => setError(fallo instanceof Error ? fallo.message : 'No se pudo actualizar.'),
  });

  const actualizarDepto = useMutation({
    mutationFn: (depto: DepartamentoDTO) =>
      apiDatos<DepartamentoDTO>(`/departamentos/${depto.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          nombre: depto.nombre,
          codigoIndec: depto.codigoIndec,
        }),
      }),
    onSuccess: () => {
      setDeptoEditando(null);
      setError('');
      refrescar('departamentos');
    },
    onError: (fallo) => setError(fallo instanceof Error ? fallo.message : 'No se pudo actualizar.'),
  });

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Catálogos y capas</h1>
        <p className="text-sm text-suave">Estados, tipos de vía, departamentos y capas de permisos.</p>
      </div>
      {error && <Aviso tipo="error">{error}</Aviso>}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="tarjeta">
          <h2 className="mb-3 font-semibold">Estados de tramo</h2>
          <div className="mb-3 grid gap-1.5">
            {(estados.data ?? []).map((estado) =>
              estadoEditando?.id === estado.id ? (
                <form
                  key={estado.id}
                  className="grid gap-2 rounded-lg border border-marca/40 bg-fondo/60 p-2"
                  onSubmit={(evento) => {
                    evento.preventDefault();
                    actualizarEstado.mutate(estadoEditando);
                  }}
                >
                  <input
                    className="campo"
                    value={estadoEditando.nombre}
                    onChange={(e) => setEstadoEditando({ ...estadoEditando, nombre: e.target.value })}
                    required
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="color"
                      className="campo h-[38px] w-16 p-1"
                      value={estadoEditando.colorHex}
                      onChange={(e) => setEstadoEditando({ ...estadoEditando, colorHex: e.target.value })}
                    />
                    <input
                      type="number"
                      min={0}
                      className="campo w-24"
                      value={estadoEditando.orden}
                      onChange={(e) => setEstadoEditando({ ...estadoEditando, orden: Number(e.target.value) })}
                      aria-label="Orden"
                    />
                    <label className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={estadoEditando.activo}
                        onChange={(e) => setEstadoEditando({ ...estadoEditando, activo: e.target.checked })}
                      />
                      Activo
                    </label>
                    <button className="boton-primario !px-3 !py-1" disabled={actualizarEstado.isPending}>
                      Guardar
                    </button>
                    <button
                      type="button"
                      className="boton-secundario !px-3 !py-1"
                      onClick={() => setEstadoEditando(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <div key={estado.id} className="flex items-center justify-between rounded-lg border border-borde px-3 py-2 text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: estado.colorHex }} />
                    {estado.nombre}
                    {!estado.activo && <span className="text-xs text-suave">(inactivo)</span>}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-suave">{estado.clave}</span>
                    <button
                      type="button"
                      className="text-xs text-marca hover:underline"
                      onClick={() => setEstadoEditando({ ...estado })}
                    >
                      Editar
                    </button>
                  </span>
                </div>
              )
            )}
          </div>
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(evento) => {
              evento.preventDefault();
              crearEstado.mutate();
            }}
          >
            <div className="min-w-[140px] flex-1">
              <label className="etiqueta">Nombre</label>
              <input className="campo" value={nombreEstado} onChange={(e) => setNombreEstado(e.target.value)} required />
            </div>
            <div>
              <label className="etiqueta">Color</label>
              <input type="color" className="campo h-[38px] w-16 p-1" value={colorEstado} onChange={(e) => setColorEstado(e.target.value)} />
            </div>
            <button className="boton-primario" disabled={crearEstado.isPending}>
              <Plus size={16} /> Agregar
            </button>
          </form>
        </section>

        <section className="tarjeta">
          <h2 className="mb-3 font-semibold">Tipos de vía</h2>
          <div className="mb-3 grid gap-1.5">
            {(tipos.data ?? []).map((tipo) =>
              tipoEditando?.id === tipo.id ? (
                <form
                  key={tipo.id}
                  className="grid gap-2 rounded-lg border border-marca/40 bg-fondo/60 p-2"
                  onSubmit={(evento) => {
                    evento.preventDefault();
                    actualizarTipo.mutate(tipoEditando);
                  }}
                >
                  <input
                    className="campo"
                    value={tipoEditando.nombre}
                    onChange={(e) => setTipoEditando({ ...tipoEditando, nombre: e.target.value })}
                    required
                  />
                  <input
                    className="campo"
                    value={tipoEditando.descripcion ?? ''}
                    placeholder="Descripción (opcional)"
                    onChange={(e) => setTipoEditando({ ...tipoEditando, descripcion: e.target.value || null })}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      className="campo w-24"
                      value={tipoEditando.orden}
                      onChange={(e) => setTipoEditando({ ...tipoEditando, orden: Number(e.target.value) })}
                      aria-label="Orden"
                    />
                    <label className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={tipoEditando.activo}
                        onChange={(e) => setTipoEditando({ ...tipoEditando, activo: e.target.checked })}
                      />
                      Activo
                    </label>
                    <button className="boton-primario !px-3 !py-1" disabled={actualizarTipo.isPending}>
                      Guardar
                    </button>
                    <button
                      type="button"
                      className="boton-secundario !px-3 !py-1"
                      onClick={() => setTipoEditando(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <div key={tipo.id} className="flex items-center justify-between rounded-lg border border-borde px-3 py-2 text-sm">
                  <span>
                    {tipo.nombre}
                    {!tipo.activo && <span className="ml-2 text-xs text-suave">(inactivo)</span>}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-suave">{tipo.clave}</span>
                    <button
                      type="button"
                      className="text-xs text-marca hover:underline"
                      onClick={() => setTipoEditando({ ...tipo })}
                    >
                      Editar
                    </button>
                  </span>
                </div>
              )
            )}
          </div>
          <form
            className="flex items-end gap-2"
            onSubmit={(evento) => {
              evento.preventDefault();
              crearTipo.mutate();
            }}
          >
            <div className="flex-1">
              <label className="etiqueta">Nombre</label>
              <input className="campo" value={nombreTipo} onChange={(e) => setNombreTipo(e.target.value)} required />
            </div>
            <button className="boton-primario" disabled={crearTipo.isPending}>
              <Plus size={16} /> Agregar
            </button>
          </form>
        </section>

        <section className="tarjeta">
          <h2 className="mb-3 font-semibold">Capas</h2>
          <div className="mb-3 grid gap-1.5">
            {(capas.data ?? []).map((capa) =>
              capaEditando?.id === capa.id ? (
                <form
                  key={capa.id}
                  className="grid gap-2 rounded-lg border border-marca/40 bg-fondo/60 p-2"
                  onSubmit={(evento) => {
                    evento.preventDefault();
                    actualizarCapa.mutate(capaEditando);
                  }}
                >
                  <input
                    className="campo"
                    value={capaEditando.nombre}
                    onChange={(e) => setCapaEditando({ ...capaEditando, nombre: e.target.value })}
                    required
                  />
                  <input
                    className="campo"
                    value={capaEditando.organismo}
                    onChange={(e) => setCapaEditando({ ...capaEditando, organismo: e.target.value })}
                    required
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={capaEditando.activa}
                        onChange={(e) => setCapaEditando({ ...capaEditando, activa: e.target.checked })}
                      />
                      Activa
                    </label>
                    <button className="boton-primario !px-3 !py-1" disabled={actualizarCapa.isPending}>
                      Guardar
                    </button>
                    <button
                      type="button"
                      className="boton-secundario !px-3 !py-1"
                      onClick={() => setCapaEditando(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <div key={capa.id} className="flex items-center justify-between rounded-lg border border-borde px-3 py-2 text-sm">
                  <span>
                    {capa.nombre}
                    {!capa.activa && <span className="ml-2 text-xs text-suave">(inactiva)</span>}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-suave">{capa.organismo} · {capa.clave}</span>
                    <button
                      type="button"
                      className="text-xs text-marca hover:underline"
                      onClick={() => setCapaEditando({ ...capa })}
                    >
                      Editar
                    </button>
                  </span>
                </div>
              )
            )}
          </div>
          <form
            className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
            onSubmit={(evento) => {
              evento.preventDefault();
              crearCapa.mutate();
            }}
          >
            <div>
              <label className="etiqueta">Nombre</label>
              <input className="campo" value={nombreCapa} onChange={(e) => setNombreCapa(e.target.value)} required />
            </div>
            <div>
              <label className="etiqueta">Organismo</label>
              <input className="campo" value={organismoCapa} onChange={(e) => setOrganismoCapa(e.target.value)} required />
            </div>
            <button className="boton-primario" disabled={crearCapa.isPending}>
              <Plus size={16} /> Agregar
            </button>
          </form>
        </section>

        <section className="tarjeta">
          <h2 className="mb-3 font-semibold">Departamentos</h2>
          <div className="mb-3 grid max-h-72 gap-1.5 overflow-y-auto pr-1">
            {(departamentos.data ?? []).map((depto) =>
              deptoEditando?.id === depto.id ? (
                <form
                  key={depto.id}
                  className="grid gap-2 rounded-lg border border-marca/40 bg-fondo/60 p-2 sm:grid-cols-[1fr_150px_auto_auto] sm:items-end"
                  onSubmit={(evento) => {
                    evento.preventDefault();
                    actualizarDepto.mutate(deptoEditando);
                  }}
                >
                  <div>
                    <label className="etiqueta">Nombre</label>
                    <input
                      className="campo"
                      value={deptoEditando.nombre}
                      onChange={(e) => setDeptoEditando({ ...deptoEditando, nombre: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="etiqueta">Código INDEC</label>
                    <input
                      className="campo"
                      value={deptoEditando.codigoIndec ?? ''}
                      onChange={(e) => setDeptoEditando({ ...deptoEditando, codigoIndec: e.target.value || null })}
                    />
                  </div>
                  <button className="boton-primario !px-3 !py-1" disabled={actualizarDepto.isPending}>
                    Guardar
                  </button>
                  <button
                    type="button"
                    className="boton-secundario !px-3 !py-1"
                    onClick={() => setDeptoEditando(null)}
                  >
                    Cancelar
                  </button>
                </form>
              ) : (
                <div key={depto.id} className="flex items-center justify-between rounded-lg border border-borde px-3 py-1.5 text-sm">
                  <span>
                    {depto.nombre}
                    {depto.codigoIndec && <span className="ml-2 text-xs text-suave">INDEC {depto.codigoIndec}</span>}
                  </span>
                  <button
                    type="button"
                    className="text-xs text-marca hover:underline"
                    onClick={() => setDeptoEditando({ ...depto })}
                  >
                    Editar
                  </button>
                </div>
              )
            )}
          </div>
          <form
            className="flex items-end gap-2"
            onSubmit={(evento) => {
              evento.preventDefault();
              crearDepto.mutate();
            }}
          >
            <div className="flex-1">
              <label className="etiqueta">Nombre</label>
              <input className="campo" value={nombreDepto} onChange={(e) => setNombreDepto(e.target.value)} required />
            </div>
            <button className="boton-primario" disabled={crearDepto.isPending}>
              <Plus size={16} /> Agregar
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
