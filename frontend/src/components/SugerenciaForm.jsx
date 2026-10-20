import { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';
import { crearSugerencia } from '../services/api.js';

export default function SugerenciaForm({ caminoId, tramoId }) {
  const mapa = useMap();
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const [contacto, setContacto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  // Al abrir el formulario el popup crece: Leaflet debe recalcular su posición
  // para que el contenido y el botón de cierre sigan visibles.
  useEffect(() => {
    const cuadro = window.requestAnimationFrame(() => {
      mapa?._popup?.update?.();
    });

    return () => window.cancelAnimationFrame(cuadro);
  }, [abierto, error, mensaje, mapa]);

  const cerrar = () => {
    setAbierto(false);
    setError('');
    setMensaje('');
  };

  const enviar = async (evento) => {
    evento.preventDefault();
    setError('');
    setMensaje('');

    const textoLimpio = texto.trim();
    if (textoLimpio.length < 5) {
      setError('Escribí al menos 5 caracteres para describir el cambio.');
      return;
    }

    const contactoLimpio = contacto.trim();
    setEnviando(true);

    try {
      const respuesta = await crearSugerencia({
        texto: textoLimpio,
        ...(contactoLimpio ? { contacto: contactoLimpio } : {}),
        caminoId,
        tramoId,
      });

      setMensaje(respuesta?.mensaje || 'Sugerencia enviada. ¡Gracias por colaborar!');
      setTexto('');
      setContacto('');
      setAbierto(false);
    } catch (err) {
      setError(err?.message || 'No se pudo enviar la sugerencia. Intentá nuevamente.');
    } finally {
      setEnviando(false);
    }
  };

  if (mensaje) {
    return (
      <div className="rounded-xl border border-verde-600/25 bg-verde-50 p-3 dark:border-verde-400/25 dark:bg-verde-950/40">
        <p className="text-xs font-medium text-verde-800 dark:text-verde-200">{mensaje}</p>
        <button
          type="button"
          onClick={() => {
            setMensaje('');
            setAbierto(true);
          }}
          className="mt-2 text-xs font-semibold text-verde-700 underline underline-offset-2 hover:text-verde-900 dark:text-verde-300 dark:hover:text-verde-100"
        >
          Enviar otra sugerencia
        </button>
      </div>
    );
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-verde-600/40 bg-verde-50/60 px-3 py-2.5 text-xs font-semibold text-verde-800 transition hover:border-verde-600 hover:bg-verde-50 dark:border-verde-400/30 dark:bg-verde-950/30 dark:text-verde-200 dark:hover:bg-verde-950/60"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
          <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.9 8.9 0 0 1-3.8-.9L3 21l1.9-4.6A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z" strokeLinejoin="round" />
          <path d="M12 8v4M12 15h.01" strokeLinecap="round" />
        </svg>
        Sugerir un cambio
      </button>
    );
  }

  return (
    <form
      onSubmit={enviar}
      className="animate-aparecer rounded-xl border border-arena-200 bg-arena-50/80 p-3 dark:border-white/10 dark:bg-white/5"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-stone-600 dark:text-stone-300">
          Sugerir un cambio
        </p>
        <button
          type="button"
          onClick={cerrar}
          className="rounded-md p-1 text-stone-500 transition hover:bg-stone-900/5 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-white/10 dark:hover:text-white"
          aria-label="Cerrar formulario de sugerencia"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <label htmlFor={`sugerencia-texto-${tramoId}`} className="sr-only">
        ¿Qué cambio sugerís?
      </label>
      <textarea
        id={`sugerencia-texto-${tramoId}`}
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Contanos qué pasa en este tramo: anegamientos, baches, falta de señalización…"
        className="control-campo resize-none text-xs"
        disabled={enviando}
        required
      />
      <div className="mt-1 flex justify-end">
        <span className="text-[10px] tabular-nums text-stone-400 dark:text-stone-500">{texto.length}/2000</span>
      </div>

      <label htmlFor={`sugerencia-contacto-${tramoId}`} className="sr-only">
        Contacto opcional
      </label>
      <input
        id={`sugerencia-contacto-${tramoId}`}
        type="text"
        value={contacto}
        onChange={(evento) => setContacto(evento.target.value)}
        maxLength={200}
        placeholder="Contacto opcional (email o teléfono)"
        className="control-campo mt-1 text-xs"
        disabled={enviando}
      />

      {error ? (
        <p className="mt-2 rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={enviando} className="boton-primario mt-2 w-full py-2 text-xs">
        {enviando ? 'Enviando…' : 'Enviar sugerencia'}
      </button>
    </form>
  );
}
