import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal.jsx';
import PuntajePrioridad from '../components/PuntajePrioridad.jsx';
import {
  ESTADOS,
  ORDEN_ESTADOS,
  ORDEN_TIPOS,
  TIPOS,
} from '../constants/dominio.js';
import { useCategorias } from '../context/CategoriasContext.jsx';
import { obtenerTramosPrioridad } from '../services/api.js';
import { formatearKm, formatearNumero, normalizarTexto } from '../utils/formato.js';

const FILTROS_INICIALES = { busqueda: '', estado: '', tipo: '', departamento: '' };

function EtiquetaTramo({ etiqueta, color }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ color, backgroundColor: `${color}18` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
      {etiqueta}
    </span>
  );
}

function IconoTramos({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <path d="M4 19 9 7l5 10 6-12" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="4" cy="19" r="1.5" />
      <circle cx="20" cy="5" r="1.5" />
    </svg>
  );
}

function IconoPuntaje({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <path d="M4 18a8 8 0 1 1 16 0" strokeLinecap="round" />
      <path d="m12 14 4-4" strokeLinecap="round" />
      <circle cx="12" cy="14" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconoAlerta({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <path d="M10.3 4.3 2.8 17.3A2 2 0 0 0 4.5 20h15a2 2 0 0 0 1.7-2.7L13.7 4.3a2 2 0 0 0-3.4 0Z" strokeLinejoin="round" />
      <path d="M12 9v4M12 16.5h.01" strokeLinecap="round" />
    </svg>
  );
}

function IconoRed({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <path d="M5 21 9 3h6l4 18" strokeLinejoin="round" />
      <path d="M12 7v2M12 13v2M12 19v1" strokeLinecap="round" />
    </svg>
  );
}

function formatearDistancia(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return '—';
  if (numero < 1) return `${Math.round(numero * 1000)} m`;
  return `${numero.toLocaleString('es-AR', {
    minimumFractionDigits: Number.isInteger(numero) ? 0 : 2,
    maximumFractionDigits: 2,
  })} km`;
}

function PuntosCercanos({ puntos = [], onAbrir }) {
  const { porClave } = useCategorias();

  if (puntos.length === 0) {
    return <span className="text-xs text-stone-400 dark:text-stone-500">Sin cercanía</span>;
  }

  const nombres = puntos.slice(0, 2).map((punto) => punto.nombre);
  const restantes = Math.max(0, puntos.length - 2);
  const descripcion = `Ver ${puntos.length === 1 ? 'el punto de interés cercano' : `los ${puntos.length} puntos de interés cercanos`}`;

  return (
    <button
      type="button"
      onClick={onAbrir}
      aria-haspopup="dialog"
      title={`${descripcion}: ${puntos.map((punto) => punto.nombre).join(', ')}`}
      className="group inline-flex max-w-[15rem] items-center gap-1.5 rounded-lg py-1 pl-1 pr-1.5 text-left text-xs text-stone-600 transition hover:bg-verde-50 hover:text-verde-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verde-600 dark:text-stone-300 dark:hover:bg-white/10 dark:hover:text-verde-200 dark:focus-visible:outline-verde-300"
    >
      <span className="flex shrink-0 -space-x-1" aria-hidden="true">
        {puntos.slice(0, 3).map((punto) => (
          <span
            key={punto.id}
            className="flex h-4 w-4 items-center justify-center rounded-full border border-white text-[7px] font-bold text-white dark:border-slate-900"
            style={{ backgroundColor: porClave[punto.categoria]?.color ?? '#78716c' }}
          >
            {porClave[punto.categoria]?.inicial ?? '?'}
          </span>
        ))}
      </span>
      <span className="truncate">
        {nombres.join(', ')}
        {restantes > 0 ? ` +${restantes}` : ''}
      </span>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        className="h-3 w-3 shrink-0 text-stone-400 transition group-hover:text-verde-700 dark:text-stone-500 dark:group-hover:text-verde-300"
        aria-hidden="true"
      >
        <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="sr-only">— {descripcion}</span>
    </button>
  );
}

function DetallePuntosCercanos({ tramo, onCerrar, onVerEnMapa }) {
  const { porClave } = useCategorias();
  const prioridad = tramo?.prioridad;
  const puntos = prioridad?.puntosCercanos ?? [];
  const umbral = prioridad?.umbralCercaniaKm ?? 1;

  return (
    <Modal
      titulo="Puntos de interés cercanos"
      descripcion={`${tramo?.camino?.nombre ?? 'Tramo'}${tramo?.camino?.localidad ? ` · ${tramo.camino.localidad}` : ''}`}
      onCerrar={onCerrar}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-verde-50/80 px-3 py-2.5 text-xs text-verde-900 dark:bg-verde-950/30 dark:text-verde-100">
        <span>
          Puntos a menos de <strong className="font-bold">{formatearDistancia(umbral)}</strong> del tramo.
        </span>
        <span className="rounded-full bg-white/80 px-2 py-0.5 font-semibold tabular-nums dark:bg-white/10">
          Cercanía +{prioridad?.cercania ?? 0}
        </span>
      </div>

      <ul className="mt-3 space-y-2">
        {puntos.map((punto) => {
          const categoria = porClave[punto.categoria];

          return (
            <li
              key={punto.id}
              className="flex items-start gap-3 rounded-xl border border-arena-200/80 p-3 dark:border-white/10"
            >
              <span
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{ backgroundColor: categoria?.color ?? '#78716c' }}
                aria-hidden="true"
              >
                {categoria?.inicial ?? '?'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-stone-900 dark:text-white">
                  {punto.nombre}
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {categoria?.etiqueta ?? punto.categoria}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-semibold tabular-nums text-stone-700 dark:text-stone-200">
                  {formatearDistancia(punto.distanciaKm)}
                </p>
                {punto.aporte ? (
                  <p className="text-[10px] font-medium tabular-nums text-verde-700 dark:text-verde-300">
                    +{punto.aporte} pts
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex justify-end">
        <button type="button" onClick={onVerEnMapa} className="boton-suave px-3 py-2 text-xs">
          Ver el tramo en el mapa
        </button>
      </div>
    </Modal>
  );
}

export default function PrioridadesPage() {
  const navegar = useNavigate();
  const [tramos, setTramos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [despertando, setDespertando] = useState(false);
  const [error, setError] = useState('');
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [detalleCercania, setDetalleCercania] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');

    try {
      setTramos(await obtenerTramosPrioridad());
    } catch (err) {
      setError(err?.message || 'No se pudieron calcular las prioridades.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Mensaje de "despertando" si la carga tarda más de 3s (cold start)
  useEffect(() => {
    if (!cargando) {
      setDespertando(false);
      return;
    }
    const timer = setTimeout(() => setDespertando(true), 3000);
    return () => clearTimeout(timer);
  }, [cargando]);

  const tramosConPosicion = useMemo(
    () => tramos.map((tramo, indice) => ({ ...tramo, posicion: indice + 1 })),
    [tramos]
  );

  const departamentos = useMemo(
    () =>
      [...new Set(tramos.map((tramo) => tramo.camino?.departamento).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, 'es')
      ),
    [tramos]
  );

  const filtrados = useMemo(() => {
    const busqueda = normalizarTexto(filtros.busqueda);

    return tramosConPosicion.filter((tramo) => {
      if (filtros.estado && tramo.estado !== filtros.estado) return false;
      if (filtros.tipo && tramo.tipo !== filtros.tipo) return false;
      if (filtros.departamento && tramo.camino?.departamento !== filtros.departamento) return false;

      if (busqueda) {
        const texto = normalizarTexto(
          `${tramo.camino?.nombre ?? ''} ${tramo.camino?.localidad ?? ''} ${tramo.camino?.departamento ?? ''}`
        );
        if (!texto.includes(busqueda)) return false;
      }

      return true;
    });
  }, [tramosConPosicion, filtros]);

  const resumen = useMemo(() => {
    if (tramos.length === 0) {
      return { promedio: 0, criticos: 0, longitud: 0 };
    }

    const suma = tramos.reduce((total, tramo) => total + (tramo.prioridad?.puntaje ?? 0), 0);
    return {
      promedio: Math.round(suma / tramos.length),
      criticos: tramos.filter((tramo) => (tramo.prioridad?.puntaje ?? 0) >= 75).length,
      longitud: tramos.reduce((total, tramo) => total + (tramo.longitudKm ?? 0), 0),
    };
  }, [tramos]);

  const cambiarFiltro = (campo, valor) => {
    setFiltros((actual) => ({ ...actual, [campo]: valor }));
  };

  const limpiarFiltros = () => setFiltros(FILTROS_INICIALES);

  const hayFiltros = Object.values(filtros).some(Boolean);

  const verEnMapa = (id) => {
    setDetalleCercania(null);
    navegar(`/?tramo=${encodeURIComponent(id)}`);
  };

  return (
    <div className="h-full overflow-y-auto bg-arena-50 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-verde-700 dark:text-verde-300">
              Toma de decisiones
            </p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-stone-900 dark:text-white sm:text-4xl">
              Prioridades de intervención
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600 dark:text-stone-300">
              Ranking de tramos según el estado de transitabilidad, la superficie y la cercanía a
              puntos de interés como hospitales, escuelas y UPAs.
            </p>
          </div>
          <button type="button" onClick={cargar} disabled={cargando} className="boton-suave self-start sm:self-auto">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
              <path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Actualizar
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {[
            {
              etiqueta: 'Tramos analizados',
              valor: formatearNumero(tramos.length),
              clase: 'bg-cyan-50 dark:bg-cyan-950/40',
              iconoClase: 'bg-cyan-500',
              icono: <IconoTramos />,
            },
            {
              etiqueta: 'Puntaje promedio',
              valor: `${resumen.promedio}/100`,
              clase: 'bg-green-50 dark:bg-emerald-950/40',
              iconoClase: 'bg-green-500',
              icono: <IconoPuntaje />,
            },
            {
              etiqueta: 'Prioridad muy alta',
              valor: formatearNumero(resumen.criticos),
              clase: 'bg-orange-50 dark:bg-orange-950/40',
              iconoClase: 'bg-orange-500',
              icono: <IconoAlerta />,
            },
            {
              etiqueta: 'Red evaluada',
              valor: formatearKm(resumen.longitud),
              clase: 'bg-yellow-50 dark:bg-amber-950/40',
              iconoClase: 'bg-amber-500',
              icono: <IconoRed />,
            },
          ].map((item) => (
            <div
              key={item.etiqueta}
              className={`rounded-xl border border-gray-200 p-4 shadow-sm dark:border-slate-800 ${item.clase}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-slate-300">{item.etiqueta}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
                    {item.valor}
                  </p>
                </div>
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white ${item.iconoClase}`}>
                  {item.icono}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-verde-700/15 bg-verde-50/80 px-3.5 py-2.5 text-[11px] text-verde-900 dark:border-verde-400/15 dark:bg-verde-950/30 dark:text-verde-100">
          <span className="font-bold uppercase tracking-[0.1em]">Cómo se calcula</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 font-medium dark:bg-white/10">
            Estado <strong className="font-bold">+50</strong>
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 font-medium dark:bg-white/10">
            Superficie <strong className="font-bold">+20</strong>
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 font-medium dark:bg-white/10">
            Cercanía <strong className="font-bold">+30</strong> (1 km)
          </span>
          <span className="text-verde-800/80 dark:text-verde-200">Máximo 100 puntos.</span>
        </div>

        <div className="tarjeta mt-5 p-3 sm:p-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr_auto]">
            <div>
              <label htmlFor="prioridad-busqueda" className="etiqueta-campo">
                Buscar camino
              </label>
              <div className="relative">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" strokeLinecap="round" />
                </svg>
                <input
                  id="prioridad-busqueda"
                  type="search"
                  value={filtros.busqueda}
                  onChange={(evento) => cambiarFiltro('busqueda', evento.target.value)}
                  placeholder="Nombre, localidad o departamento…"
                  className="control-campo pl-9"
                />
              </div>
            </div>

            <div>
              <label htmlFor="prioridad-estado" className="etiqueta-campo">
                Estado
              </label>
              <select
                id="prioridad-estado"
                value={filtros.estado}
                onChange={(evento) => cambiarFiltro('estado', evento.target.value)}
                className="control-campo"
              >
                <option value="">Todos</option>
                {ORDEN_ESTADOS.map((clave) => (
                  <option key={clave} value={clave}>
                    {ESTADOS[clave].etiqueta}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="prioridad-tipo" className="etiqueta-campo">
                Superficie
              </label>
              <select
                id="prioridad-tipo"
                value={filtros.tipo}
                onChange={(evento) => cambiarFiltro('tipo', evento.target.value)}
                className="control-campo"
              >
                <option value="">Todas</option>
                {ORDEN_TIPOS.map((clave) => (
                  <option key={clave} value={clave}>
                    {TIPOS[clave].etiqueta}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="prioridad-departamento" className="etiqueta-campo">
                Departamento
              </label>
              <select
                id="prioridad-departamento"
                value={filtros.departamento}
                onChange={(evento) => cambiarFiltro('departamento', evento.target.value)}
                className="control-campo"
              >
                <option value="">Todos</option>
                {departamentos.map((departamento) => (
                  <option key={departamento} value={departamento}>
                    {departamento}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={limpiarFiltros}
                disabled={!hayFiltros}
                className="boton-fantasma w-full justify-center border border-arena-200 py-2.5 text-xs disabled:opacity-40 dark:border-white/10"
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {cargando ? 'Calculando prioridades…' : `${filtrados.length} tramo${filtrados.length === 1 ? '' : 's'} en el ranking`}
          </p>
          {hayFiltros ? (
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-verde-700 dark:text-verde-300">
              Filtros activos
            </p>
          ) : null}
        </div>

        {error ? (
          <div className="tarjeta mt-4 p-8 text-center">
            <p className="font-display text-lg font-semibold text-stone-900 dark:text-white">
              No se pudieron cargar las prioridades
            </p>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{error}</p>
            <button type="button" onClick={cargar} className="boton-primario mt-4">
              Reintentar
            </button>
          </div>
        ) : null}

        {cargando && !error ? (
          <div className="mt-3 space-y-2">
            <div className="tarjeta p-6 text-center animate-pulse">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-600/30 border-t-cyan-600 mx-auto mb-2 dark:border-cyan-300/30 dark:border-t-cyan-300" />
              <p className="text-sm font-medium text-stone-700 dark:text-stone-200">
                {despertando
                  ? 'Despertando la base de datos… (puede tardar unos segundos)'
                  : 'Calculando prioridades…'}
              </p>
              {despertando && (
                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400 max-w-xs mx-auto">
                  El servidor gratuito se apaga por inactividad. La primera carga tarda más.
                </p>
              )}
            </div>
            {[0, 1, 2, 3, 4].map((item) => (
              <div key={item} className="tarjeta h-16 animate-pulse bg-white/60 dark:bg-white/5" />
            ))}
          </div>
        ) : null}

        {!cargando && !error && filtrados.length === 0 ? (
          <div className="tarjeta mt-3 p-10 text-center">
            <p className="font-display text-lg font-semibold text-stone-900 dark:text-white">
              Sin resultados
            </p>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
              Probá con otros filtros o limpiá la búsqueda.
            </p>
          </div>
        ) : null}

        {!cargando && !error && filtrados.length > 0 ? (
          <>
            <div className="tarjeta mt-3 hidden overflow-hidden md:block">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-arena-200 text-left dark:divide-white/10">
                  <thead className="bg-arena-100/70 dark:bg-white/5">
                    <tr className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500 dark:text-stone-400">
                      <th scope="col" className="px-4 py-3 text-center">#</th>
                      <th scope="col" className="px-4 py-3">Prioridad</th>
                      <th scope="col" className="px-4 py-3">Camino</th>
                      <th scope="col" className="px-4 py-3">Departamento</th>
                      <th scope="col" className="px-4 py-3">Tramo</th>
                      <th scope="col" className="px-4 py-3">Longitud</th>
                      <th scope="col" className="px-4 py-3">Cercanía</th>
                      <th scope="col" className="px-4 py-3 text-right">Mapa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-arena-200/70 dark:divide-white/5">
                    {filtrados.map((tramo) => {
                      const estado = ESTADOS[tramo.estado];
                      const tipo = TIPOS[tramo.tipo];
                      return (
                        <tr
                          key={tramo.id}
                          className="text-sm transition hover:bg-verde-50/50 dark:hover:bg-white/[0.03]"
                        >
                          <td className="px-4 py-3 text-center text-xs font-bold tabular-nums text-stone-400 dark:text-stone-500">
                            {tramo.posicion}
                          </td>
                          <td className="px-4 py-3">
                            <PuntajePrioridad valor={tramo.prioridad?.puntaje} conBarra />
                          </td>
                          <td className="max-w-[16rem] px-4 py-3">
                            <p className="truncate font-semibold text-stone-900 dark:text-white">
                              {tramo.camino?.nombre ?? 'Sin camino'}
                            </p>
                            <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                              {tramo.camino?.localidad}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-xs text-stone-600 dark:text-stone-300">
                            {tramo.camino?.departamento ?? '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {estado ? <EtiquetaTramo etiqueta={estado.etiqueta} color={estado.color} /> : null}
                              {tipo ? <EtiquetaTramo etiqueta={tipo.etiqueta} color={tipo.color} /> : null}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-xs font-medium tabular-nums text-stone-600 dark:text-stone-300">
                            {formatearKm(tramo.longitudKm)}
                          </td>
                          <td className="px-4 py-3">
                            <PuntosCercanos
                              puntos={tramo.prioridad?.puntosCercanos}
                              onAbrir={() => setDetalleCercania(tramo)}
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => verEnMapa(tramo.id)}
                              className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-semibold text-verde-700 transition hover:bg-verde-50 dark:text-verde-300 dark:hover:bg-white/10"
                            >
                              Ver en mapa
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5" aria-hidden="true">
                                <path d="M7 17 17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-3 grid gap-3 md:hidden">
              {filtrados.map((tramo) => {
                const estado = ESTADOS[tramo.estado];
                const tipo = TIPOS[tramo.tipo];
                return (
                  <article key={tramo.id} className="tarjeta p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-stone-900/5 text-xs font-bold tabular-nums text-stone-500 dark:bg-white/10 dark:text-stone-400">
                          {tramo.posicion}
                        </span>
                        <div className="min-w-0">
                          <h2 className="truncate font-semibold leading-tight text-stone-900 dark:text-white">
                            {tramo.camino?.nombre ?? 'Sin camino'}
                          </h2>
                          <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                            {tramo.camino?.localidad} · {tramo.camino?.departamento}
                          </p>
                        </div>
                      </div>
                      <PuntajePrioridad valor={tramo.prioridad?.puntaje} compacto />
                    </div>

                    <div className="mt-2.5 flex flex-wrap gap-1">
                      {estado ? <EtiquetaTramo etiqueta={estado.etiqueta} color={estado.color} /> : null}
                      {tipo ? <EtiquetaTramo etiqueta={tipo.etiqueta} color={tipo.color} /> : null}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-arena-200/70 pt-2.5 text-xs dark:border-white/10">
                      <div>
                        <span className="text-stone-500 dark:text-stone-400">Longitud: </span>
                        <span className="font-semibold text-stone-700 dark:text-stone-200">
                          {formatearKm(tramo.longitudKm)}
                        </span>
                      </div>
                      <PuntosCercanos
                        puntos={tramo.prioridad?.puntosCercanos}
                        onAbrir={() => setDetalleCercania(tramo)}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => verEnMapa(tramo.id)}
                      className="boton-suave mt-3 w-full py-2 text-xs"
                    >
                      Ver en el mapa
                    </button>
                  </article>
                );
              })}
            </div>
          </>
        ) : null}
      </div>

      {detalleCercania ? (
        <DetallePuntosCercanos
          tramo={detalleCercania}
          onCerrar={() => setDetalleCercania(null)}
          onVerEnMapa={() => verEnMapa(detalleCercania.id)}
        />
      ) : null}
    </div>
  );
}
