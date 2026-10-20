import { useEffect } from 'react';

export default function Modal({ titulo, descripcion, onCerrar, children, ancho = 'max-w-lg' }) {
  useEffect(() => {
    const alPresionar = (evento) => {
      if (evento.key === 'Escape') onCerrar();
    };

    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [onCerrar]);

  return (
    <div className="fixed inset-0 z-[1300] flex items-end justify-center bg-stone-950/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-5">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onCerrar}
        aria-label="Cerrar ventana"
        tabIndex={-1}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`tarjeta relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-b-none sm:rounded-2xl ${ancho}`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-arena-200/80 px-5 py-4 dark:border-white/10">
          <div>
            <h2 className="font-display text-lg font-semibold leading-tight text-stone-900 dark:text-white">
              {titulo}
            </h2>
            {descripcion ? (
              <p className="mt-0.5 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                {descripcion}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="shrink-0 rounded-lg p-1.5 text-stone-500 transition hover:bg-stone-900/5 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Cerrar"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="panel-desplazable overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
