import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ESTADOS, TIPOS } from '../constants/dominio.js';
import { actualizarSugerencia, obtenerSugerencias } from '../services/api.js';
import { formatearFechaHora } from '../utils/formato.js';

const ESTADOS_SUGERENCIA = {
  PENDIENTE: {
    etiqueta: 'Pendiente',
    clase: 'bg-amber-100 text-amber-900 ring-amber-600/20 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-400/30',
  },
  REVISADA: {
    etiqueta: 'Revisada',
    clase: 'bg-verde-100 text-verde-800 ring-verde-600/20 dark:bg-verde-950/60 dark:text-verde-300 dark:ring-verde-400/30',
  },
  DESCARTADA: {
    etiqueta: 'Descartada',
    clase: 'bg-stone-200 text-stone-600 ring-stone-500/20 dark:bg-white/10 dark:text-stone-400 dark:ring-white/10',
  },
};

const FILTROS = ['', 'PENDIENTE', 'REVISADA', 'DESCARTADA'];

export default function SugerenciasPage() {
  const [estado, setEstado] = useState('PENDIENTE');
  const [sugerencias, setSugerencias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [procesandoId, setProcesandoId] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');

    try {
      setSugerencias(await obtenerSugerencias(estado ? { estado } : {}));
    } catch (err) {
      setError(err?.message || 'No se pudieron cargar las sugerencias.');
    } finally {
      setCargando(false);
    }
  }, [estado]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cambiarEstado = async (sugerencia, nuevoEstado) => {
    if (nuevoEstado === 'DESCARTADA') {
      const confirmado = window.confirm('¿Descartar esta sugerencia? Quedará registrada como descartada.');
      if (!confirmado) return;
    }

    setProcesandoId(sugerencia.id);
    setMensaje('');
    setError('');

    try {
      const respuesta = await actualizarSugerencia(sugerencia.id, { estado: nuevoEstado });
      setMensaje(respuesta?.mensaje || 'Sugerencia actualizada correctamente.');
      await cargar();
    } catch (err) {
      setError(err?.message || 'No se pudo actualizar la sugerencia.');
    } finally {
      setProcesandoId(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-arena-50 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-verde-700 dark:text-verde-300">
              Participación ciudadana
            </p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-stone-900 dark:text-white sm:text-4xl">
              Sugerencias
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-stone-600 dark:text-stone-300">
              Revisá los aportes enviados desde el mapa y marcalos como revisados o descartados.
            </p>
          </div>
          <button type="button" onClick={cargar} disabled={cargando} className="boton-suave self-start sm:self-auto">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
              <path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Actualizar
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-1.5 rounded-2xl border border-arena-200/80 bg-white/70 p-1.5 dark:border-white/10 dark:bg-white/5">
          {FILTROS.map((clave) => (
            <button
              key={clave || 'todas'}
              type="button"
              onClick={() => setEstado(clave)}
              className={[
                'flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition sm:flex-none',
                estado === clave
                  ? 'bg-verde-700 text-white shadow-sm dark:bg-verde-600'
                  : 'text-stone-600 hover:bg-stone-900/5 dark:text-stone-300 dark:hover:bg-white/10',
              ].join(' ')}
            >
              {clave ? ESTADOS_SUGERENCIA[clave].etiqueta : 'Todas'}
            </button>
          ))}
        </div>

        {mensaje ? (
          <p className="mt-4 rounded-xl bg-verde-50 px-3.5 py-2.5 text-xs font-medium text-verde-800 dark:bg-verde-950/40 dark:text-verde-200" role="status">
            {mensaje}
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">
            {error}
          </p>
        ) : null}

        {cargando ? (
          <div className="mt-4 space-y-2">
            {[0, 1, 2].map((item) => (
              <div key={item} className="tarjeta h-24 animate-pulse bg-white/60 dark:bg-white/5" />
            ))}
          </div>
        ) : null}

        {!cargando && sugerencias.length === 0 ? (
          <div className="tarjeta mt-4 p-10 text-center">
            <p className="font-display text-lg font-semibold text-stone-900 dark:text-white">
              No hay sugerencias {estado ? ESTADOS_SUGERENCIA[estado].etiqueta.toLowerCase() + 's' : ''}
            </p>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
              Cuando los ciudadanos envíen aportes desde el mapa van a aparecer acá.
            </p>
          </div>
        ) : null}

        {!cargando && sugerencias.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {sugerencias.map((sugerencia) => {
              const infoEstado = ESTADOS_SUGERENCIA[sugerencia.estado];
              const procesando = procesandoId === sugerencia.id;

              return (
                <li key={sugerencia.id} className="tarjeta p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-stone-500 dark:text-stone-400">
                      <span className={`inline-flex rounded-full px-2 py-0.5 font-bold ring-1 ring-inset ${infoEstado.clase}`}>
                        {infoEstado.etiqueta}
                      </span>
                      <span>{formatearFechaHora(sugerencia.creadoEn)}</span>
                      {sugerencia.revisadoPor ? (
                        <span>· revisada por {sugerencia.revisadoPor.nombre}</span>
                      ) : null}
                    </div>
                  </div>

                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-stone-800 dark:text-stone-100">
                    {sugerencia.texto}
                  </p>

                  <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-stone-500 dark:text-stone-400">
                    {sugerencia.camino ? (
                      sugerencia.tramoId ? (
                        <Link
                          to={`/?tramo=${encodeURIComponent(sugerencia.tramoId)}`}
                          className="font-semibold text-verde-700 hover:underline dark:text-verde-300"
                        >
                          {sugerencia.camino.nombre}
                        </Link>
                      ) : (
                        <span className="font-semibold text-stone-700 dark:text-stone-200">
                          {sugerencia.camino.nombre}
                        </span>
                      )
                    ) : (
                      <span>Sin camino asociado</span>
                    )}
                    {sugerencia.tramo ? (
                      <span>
                        Tramo: {ESTADOS[sugerencia.tramo.estado]?.etiqueta ?? sugerencia.tramo.estado} ·{' '}
                        {TIPOS[sugerencia.tramo.tipo]?.etiqueta ?? sugerencia.tramo.tipo}
                      </span>
                    ) : null}
                    {sugerencia.contacto ? <span>Contacto: {sugerencia.contacto}</span> : null}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 border-t border-arena-200/70 pt-2.5 dark:border-white/10">
                    {sugerencia.estado !== 'REVISADA' ? (
                      <button
                        type="button"
                        onClick={() => cambiarEstado(sugerencia, 'REVISADA')}
                        disabled={procesando}
                        className="boton-primario px-3 py-1.5 text-xs"
                      >
                        Marcar revisada
                      </button>
                    ) : null}
                    {sugerencia.estado !== 'DESCARTADA' ? (
                      <button
                        type="button"
                        onClick={() => cambiarEstado(sugerencia, 'DESCARTADA')}
                        disabled={procesando}
                        className="boton-suave px-3 py-1.5 text-xs text-red-700 dark:text-red-300"
                      >
                        Descartar
                      </button>
                    ) : null}
                    {sugerencia.estado !== 'PENDIENTE' ? (
                      <button
                        type="button"
                        onClick={() => cambiarEstado(sugerencia, 'PENDIENTE')}
                        disabled={procesando}
                        className="boton-fantasma px-3 py-1.5 text-xs"
                      >
                        Volver a pendiente
                      </button>
                    ) : null}
                    {procesando ? (
                      <span className="self-center text-[11px] text-stone-500 dark:text-stone-400">
                        Guardando…
                      </span>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
