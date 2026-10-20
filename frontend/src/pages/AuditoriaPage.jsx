import { useCallback, useEffect, useState } from 'react';
import { obtenerAuditoria, obtenerUsuarios } from '../services/api.js';
import { formatearFechaHora, normalizarTexto } from '../utils/formato.js';

const ACCIONES = [
  { valor: '', etiqueta: 'Todas' },
  { valor: 'CREAR', etiqueta: 'Crear' },
  { valor: 'EDITAR', etiqueta: 'Editar' },
  { valor: 'BORRAR', etiqueta: 'Borrar' },
];

const ENTIDADES = [
  '',
  'Camino',
  'Tramo',
  'PuntoInteres',
  'Sugerencia',
  'Usuario',
  'Foto',
];

const ESTILO_ACCION = {
  CREAR: 'bg-verde-100 text-verde-800 dark:bg-verde-950/60 dark:text-verde-300',
  EDITAR: 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300',
  BORRAR: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300',
};

const FILTROS_INICIALES = { usuarioId: '', accion: '', entidad: '', desde: '', hasta: '' };

function resumenDetalle(detalle) {
  if (!detalle || typeof detalle !== 'object') return '—';

  const partes = [];
  if (detalle.nombre) partes.push(detalle.nombre);
  if (detalle.email) partes.push(detalle.email);
  if (detalle.caminoId) partes.push(`camino ${detalle.caminoId.slice(0, 6)}…`);
  if (detalle.tramoId) partes.push(`tramo ${detalle.tramoId.slice(0, 6)}…`);
  if (detalle.estado) partes.push(detalle.estado);
  if (detalle.tipo) partes.push(detalle.tipo);
  if (detalle.estadoNuevo) partes.push(`→ ${detalle.estadoNuevo}`);
  if (detalle.cambioPassword) partes.push('cambio de contraseña');
  if (detalle.division) partes.push('división de tramo');
  if (Array.isArray(detalle.campos) && detalle.campos.length > 0) {
    partes.push(`campos: ${detalle.campos.join(', ')}`);
  }

  return partes.length > 0 ? partes.join(' · ') : '—';
}

export default function AuditoriaPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [aplicados, setAplicados] = useState(FILTROS_INICIALES);
  const [registros, setRegistros] = useState([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    obtenerUsuarios()
      .then(setUsuarios)
      .catch(() => setUsuarios([]));
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');

    const parametros = {
      limite: 200,
      ...(aplicados.usuarioId ? { usuarioId: aplicados.usuarioId } : {}),
      ...(aplicados.accion ? { accion: aplicados.accion } : {}),
      ...(aplicados.entidad ? { entidad: aplicados.entidad } : {}),
      ...(aplicados.desde ? { desde: `${aplicados.desde}T00:00:00-03:00` } : {}),
      ...(aplicados.hasta ? { hasta: `${aplicados.hasta}T23:59:59.999-03:00` } : {}),
    };

    try {
      const respuesta = await obtenerAuditoria(parametros);
      setRegistros(respuesta.datos);
      setTotal(respuesta.total);
    } catch (err) {
      setError(err?.message || 'No se pudo cargar la auditoría.');
    } finally {
      setCargando(false);
    }
  }, [aplicados]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cambiar = (campo, valor) => setFiltros((actual) => ({ ...actual, [campo]: valor }));

  const aplicar = (evento) => {
    evento.preventDefault();
    setAplicados(filtros);
  };

  const limpiar = () => {
    setFiltros(FILTROS_INICIALES);
    setAplicados(FILTROS_INICIALES);
    setBusqueda('');
  };

  const hayFiltros = Object.values(aplicados).some(Boolean);

  const visibles = busqueda
    ? registros.filter((registro) => {
        const texto = normalizarTexto(
          `${registro.usuario?.nombre ?? ''} ${registro.usuario?.email ?? ''} ${registro.entidad} ${registro.accion} ${JSON.stringify(registro.detalle ?? {})}`
        );
        return texto.includes(normalizarTexto(busqueda));
      })
    : registros;

  return (
    <div className="h-full overflow-y-auto bg-arena-50 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-verde-700 dark:text-verde-300">
              Administración
            </p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-stone-900 dark:text-white sm:text-4xl">
              Auditoría
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-stone-600 dark:text-stone-300">
              Registro de altas, ediciones y bajas sobre caminos, tramos, puntos de interés,
              sugerencias y usuarios.
            </p>
          </div>
          <div className="tarjeta self-start px-3.5 py-2 text-xs text-stone-600 dark:text-stone-300">
            <span className="tabular-nums font-bold text-stone-900 dark:text-white">{total}</span>{' '}
            registro{total === 1 ? '' : 's'} encontrados
          </div>
        </div>

        <form onSubmit={aplicar} className="tarjeta mt-5 p-3 sm:p-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
            <div className="lg:col-span-2">
              <label htmlFor="auditoria-usuario" className="etiqueta-campo">
                Usuario
              </label>
              <select
                id="auditoria-usuario"
                value={filtros.usuarioId}
                onChange={(evento) => cambiar('usuarioId', evento.target.value)}
                className="control-campo py-2 text-xs"
              >
                <option value="">Todos</option>
                {usuarios.map((usuario) => (
                  <option key={usuario.id} value={usuario.id}>
                    {usuario.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="auditoria-accion" className="etiqueta-campo">
                Acción
              </label>
              <select
                id="auditoria-accion"
                value={filtros.accion}
                onChange={(evento) => cambiar('accion', evento.target.value)}
                className="control-campo py-2 text-xs"
              >
                {ACCIONES.map((accion) => (
                  <option key={accion.valor || 'todas'} value={accion.valor}>
                    {accion.etiqueta}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="auditoria-entidad" className="etiqueta-campo">
                Entidad
              </label>
              <select
                id="auditoria-entidad"
                value={filtros.entidad}
                onChange={(evento) => cambiar('entidad', evento.target.value)}
                className="control-campo py-2 text-xs"
              >
                {ENTIDADES.map((entidad) => (
                  <option key={entidad || 'todas'} value={entidad}>
                    {entidad || 'Todas'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="auditoria-desde" className="etiqueta-campo">
                Desde
              </label>
              <input
                id="auditoria-desde"
                type="date"
                value={filtros.desde}
                onChange={(evento) => cambiar('desde', evento.target.value)}
                className="control-campo py-2 text-xs"
              />
            </div>

            <div>
              <label htmlFor="auditoria-hasta" className="etiqueta-campo">
                Hasta
              </label>
              <input
                id="auditoria-hasta"
                type="date"
                value={filtros.hasta}
                onChange={(evento) => cambiar('hasta', evento.target.value)}
                className="control-campo py-2 text-xs"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="submit" className="boton-primario px-3 py-2 text-xs" disabled={cargando}>
              {cargando ? 'Buscando…' : 'Aplicar filtros'}
            </button>
            <button
              type="button"
              onClick={limpiar}
              className="boton-suave px-3 py-2 text-xs"
              disabled={!hayFiltros}
            >
              Limpiar
            </button>
            <div className="ml-auto w-full sm:w-64">
              <label htmlFor="auditoria-busqueda" className="sr-only">
                Buscar en los resultados
              </label>
              <input
                id="auditoria-busqueda"
                type="search"
                value={busqueda}
                onChange={(evento) => setBusqueda(evento.target.value)}
                placeholder="Buscar en los resultados…"
                className="control-campo py-2 text-xs"
              />
            </div>
          </div>
        </form>

        {error ? (
          <p className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">
            {error}
          </p>
        ) : null}

        {cargando ? (
          <div className="mt-4 space-y-2">
            {[0, 1, 2, 3, 4].map((item) => (
              <div key={item} className="tarjeta h-12 animate-pulse bg-white/60 dark:bg-white/5" />
            ))}
          </div>
        ) : null}

        {!cargando && visibles.length === 0 ? (
          <div className="tarjeta mt-4 p-10 text-center">
            <p className="font-display text-lg font-semibold text-stone-900 dark:text-white">
              Sin registros
            </p>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
              Probá con otro rango de fechas o limpiá los filtros.
            </p>
          </div>
        ) : null}

        {!cargando && visibles.length > 0 ? (
          <div className="tarjeta mt-4 overflow-hidden">
            <div className="panel-desplazable overflow-x-auto">
              <table className="min-w-full divide-y divide-arena-200 text-left text-sm dark:divide-white/10">
                <thead className="bg-arena-100/70 dark:bg-white/5">
                  <tr className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500 dark:text-stone-400">
                    <th scope="col" className="whitespace-nowrap px-4 py-3">Fecha</th>
                    <th scope="col" className="px-4 py-3">Usuario</th>
                    <th scope="col" className="px-4 py-3">Acción</th>
                    <th scope="col" className="px-4 py-3">Entidad</th>
                    <th scope="col" className="px-4 py-3">Detalle</th>
                    <th scope="col" className="whitespace-nowrap px-4 py-3">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-arena-200/70 dark:divide-white/5">
                  {visibles.map((registro) => (
                    <tr key={registro.id} className="align-top transition hover:bg-verde-50/40 dark:hover:bg-white/[0.03]">
                      <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-stone-600 dark:text-stone-300">
                        {formatearFechaHora(registro.fecha)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold text-stone-800 dark:text-stone-100">
                          {registro.usuario?.nombre || 'Ciudadano / sistema'}
                        </p>
                        {registro.usuario?.email ? (
                          <p className="text-[10px] text-stone-500 dark:text-stone-400">
                            {registro.usuario.email}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${ESTILO_ACCION[registro.accion] ?? ''}`}>
                          {registro.accion}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-stone-700 dark:text-stone-200">
                        {registro.entidad}
                      </td>
                      <td className="max-w-[26rem] px-4 py-3 text-xs text-stone-600 dark:text-stone-300">
                        <span className="line-clamp-2">{resumenDetalle(registro.detalle)}</span>
                        {registro.entidadId ? (
                          <span className="mt-0.5 block truncate text-[10px] text-stone-400 dark:text-stone-500">
                            id: {registro.entidadId}
                          </span>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[10px] tabular-nums text-stone-500 dark:text-stone-400">
                        {registro.ip || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
