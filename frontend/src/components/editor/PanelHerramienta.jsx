import { useState } from 'react';
import { ESTADOS, ORDEN_ESTADOS, ORDEN_TIPOS, TIPOS } from '../../constants/dominio.js';

export default function PanelHerramienta({
  modo,
  dibujo,
  tramo,
  borrador,
  onDeshacer,
  onTerminar,
  onCancelar,
  onReiniciar,
  onConfirmarDivision,
}) {
  const [estado, setEstado] = useState(tramo?.estado ?? 'REGULAR');
  const [tipo, setTipo] = useState(tramo?.tipo ?? 'TIERRA');
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState('');

  const confirmarDivision = (evento) => {
    evento.preventDefault();

    if (!tramo) {
      setError('Elegí un tramo para dividir.');
      return;
    }

    if (dibujo.length < 2) {
      setError('Marcá el punto inicial y el punto final sobre el tramo.');
      return;
    }

    onConfirmarDivision({
      desde: dibujo[0],
      hasta: dibujo[1],
      estado,
      tipo,
      observaciones: observaciones.trim() || null,
    });
  };

  const cancelar = () => {
    setError('');
    onCancelar();
  };

  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-4 z-[1060] flex justify-center sm:bottom-6">
      <div className="tarjeta pointer-events-auto w-full max-w-md animate-aparecer p-3.5">
        {modo === 'punto' ? (
          <>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-verde-700 dark:text-verde-300">
              Nuevo punto de interés
            </p>
            <p className="mt-1 text-sm font-medium text-stone-800 dark:text-stone-100">
              Hacé clic en el mapa para ubicar el hospital, la escuela o la UPA.
            </p>
            <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">
              Después vas a poder ajustar el nombre, la categoría y las coordenadas.
            </p>
            <button type="button" onClick={cancelar} className="boton-suave mt-3 w-full py-2 text-xs">
              Cancelar
            </button>
          </>
        ) : null}

        {modo === 'dibujar' ? (
          <>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-verde-700 dark:text-verde-300">
                  Dibujando tramo
                </p>
                <p className="mt-0.5 text-sm font-semibold text-stone-900 dark:text-white">
                  {borrador?.caminoNombre || 'Camino seleccionado'}
                </p>
              </div>
              <span className="rounded-full bg-verde-700 px-2 py-0.5 text-[11px] font-bold text-white dark:bg-verde-600">
                {dibujo.length} punto{dibujo.length === 1 ? '' : 's'}
              </span>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-stone-600 dark:text-stone-300">
              Hacé clic sobre el mapa para agregar vértices. Necesitás al menos dos puntos para
              guardar el tramo.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onDeshacer}
                disabled={dibujo.length === 0}
                className="boton-suave flex-1 py-2 text-xs"
              >
                Deshacer último
              </button>
              <button
                type="button"
                onClick={onTerminar}
                disabled={dibujo.length < 2}
                className="boton-primario flex-1 py-2 text-xs"
              >
                Terminar tramo
              </button>
            </div>
            <button type="button" onClick={cancelar} className="boton-fantasma mt-1.5 w-full py-1.5 text-xs">
              Cancelar
            </button>
          </>
        ) : null}

        {modo === 'dividir' ? (
          <>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-verde-700 dark:text-verde-300">
                  Dividir y reclasificar
                </p>
                <p className="mt-0.5 text-sm font-semibold text-stone-900 dark:text-white">
                  {tramo?.camino?.nombre || 'Tramo'}
                </p>
              </div>
              <button
                type="button"
                onClick={cancelar}
                className="rounded-lg p-1 text-stone-500 hover:bg-stone-900/5 dark:text-stone-400 dark:hover:bg-white/10"
                aria-label="Cancelar división"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
                  <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <ol className="mt-2 space-y-1 text-[11px] text-stone-600 dark:text-stone-300">
              <li className={dibujo.length >= 1 ? 'font-semibold text-verde-700 dark:text-verde-300' : ''}>
                1. Tocá el punto inicial sobre la línea del tramo.
              </li>
              <li className={dibujo.length >= 2 ? 'font-semibold text-verde-700 dark:text-verde-300' : ''}>
                2. Tocá el punto final. También podés corregirlos con “Reiniciar”.
              </li>
            </ol>

            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={onReiniciar}
                className="boton-suave flex-1 py-1.5 text-[11px]"
              >
                Reiniciar puntos
              </button>
              <span className="inline-flex items-center rounded-lg bg-arena-100 px-2.5 text-[11px] font-semibold text-stone-600 dark:bg-white/10 dark:text-stone-300">
                {dibujo.length}/2
              </span>
            </div>

            {dibujo.length >= 2 ? (
              <form onSubmit={confirmarDivision} className="mt-3 space-y-2 border-t border-arena-200/80 pt-3 dark:border-white/10">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="division-estado" className="etiqueta-campo">
                      Estado del segmento
                    </label>
                    <select
                      id="division-estado"
                      value={estado}
                      onChange={(evento) => setEstado(evento.target.value)}
                      className="control-campo py-2 text-xs"
                    >
                      {ORDEN_ESTADOS.map((clave) => (
                        <option key={clave} value={clave}>
                          {ESTADOS[clave].etiqueta}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="division-tipo" className="etiqueta-campo">
                      Superficie
                    </label>
                    <select
                      id="division-tipo"
                      value={tipo}
                      onChange={(evento) => setTipo(evento.target.value)}
                      className="control-campo py-2 text-xs"
                    >
                      {ORDEN_TIPOS.map((clave) => (
                        <option key={clave} value={clave}>
                          {TIPOS[clave].etiqueta}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <input
                  type="text"
                  value={observaciones}
                  onChange={(evento) => setObservaciones(evento.target.value)}
                  maxLength={2000}
                  placeholder="Observaciones del segmento (opcional)"
                  className="control-campo py-2 text-xs"
                />

                {error ? (
                  <p className="rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">
                    {error}
                  </p>
                ) : null}

                <button type="submit" className="boton-primario w-full py-2 text-xs">
                  Aplicar al segmento central
                </button>
                <p className="text-[10px] leading-relaxed text-stone-500 dark:text-stone-400">
                  Los extremos conservan el estado y la superficie originales.
                </p>
              </form>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
