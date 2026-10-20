import { nivelPrioridad } from '../utils/formato.js';

export default function PuntajePrioridad({ valor, conBarra = false, compacto = false }) {
  const puntaje = Number(valor);
  const valido = Number.isFinite(puntaje);
  const nivel = nivelPrioridad(valido ? puntaje : 0);

  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={[
          'inline-flex items-center justify-center rounded-lg font-bold tabular-nums',
          compacto ? 'min-w-9 px-1.5 py-1 text-xs' : 'min-w-11 px-2 py-1 text-sm',
          nivel.clase,
        ].join(' ')}
        title={`Prioridad ${nivel.etiqueta.toLowerCase()}`}
      >
        {valido ? Math.round(puntaje) : '—'}
      </span>
      {conBarra ? (
        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-stone-200 dark:bg-white/10" aria-hidden="true">
          <span
            className={`block h-full rounded-full ${nivel.barra}`}
            style={{ width: `${Math.min(100, Math.max(0, valido ? puntaje : 0))}%` }}
          />
        </span>
      ) : null}
    </span>
  );
}
