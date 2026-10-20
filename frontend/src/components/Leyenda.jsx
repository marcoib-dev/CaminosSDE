import { useState } from 'react';
import {
  CATEGORIAS_POI,
  ESTADOS,
  ORDEN_CATEGORIAS_POI,
  ORDEN_ESTADOS,
  ORDEN_TIPOS,
  TIPOS,
} from '../constants/dominio.js';
import { BORDE_TRAMO } from '../constants/estilosMapa.js';
import { useTema } from '../context/TemaContext.jsx';

function MuestraLinea({ color, dashArray }) {
  const { esOscuro } = useTema();
  const colorBorde = esOscuro ? BORDE_TRAMO.temaOscuro : BORDE_TRAMO.temaClaro;

  return (
    <svg width="30" height="10" viewBox="0 0 30 10" className="shrink-0" aria-hidden="true">
      <line
        x1="1"
        y1="5"
        x2="29"
        y2="5"
        stroke={colorBorde}
        strokeOpacity={esOscuro ? 0.62 : 0.55}
        strokeWidth="6"
        strokeDasharray={dashArray || undefined}
        strokeLinecap={dashArray ? 'butt' : 'round'}
      />
      <line
        x1="1"
        y1="5"
        x2="29"
        y2="5"
        stroke={color}
        strokeWidth="3.5"
        strokeDasharray={dashArray || undefined}
        strokeLinecap={dashArray ? 'butt' : 'round'}
      />
    </svg>
  );
}

export default function Leyenda({ colorearPor }) {
  const [abierto, setAbierto] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  );

  if (!abierto) {
    return (
      <div className="absolute bottom-6 left-3 z-[1040] lg:left-[23rem]">
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="tarjeta inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-stone-700 transition hover:bg-white dark:text-stone-200"
          aria-expanded="false"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
            <path d="M12 3a9 9 0 0 0 0 18h1.5a2.5 2.5 0 0 0 0-5H12a2 2 0 0 1 0-4h5a4 4 0 0 0 4-4 5 5 0 0 0-5-5h-4Z" strokeLinejoin="round" />
          </svg>
          Leyenda
        </button>
      </div>
    );
  }

  return (
    <div className="absolute bottom-6 left-3 z-[1040] w-[15.5rem] lg:left-[23rem]">
      <div className="tarjeta animate-aparecer p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-stone-700 dark:text-stone-200">
              Leyenda
            </h2>
            <p className="mt-0.5 text-[10px] text-stone-500 dark:text-stone-400">
              Coloreando por {colorearPor === 'estado' ? 'estado' : 'superficie'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAbierto(false)}
            className="rounded-md p-1 text-stone-400 transition hover:bg-stone-900/5 hover:text-stone-700 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Ocultar leyenda"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <ul className="mt-2.5 space-y-1.5">
          {(colorearPor === 'estado' ? ORDEN_ESTADOS : ORDEN_TIPOS).map((clave) => {
            const item = colorearPor === 'estado' ? ESTADOS[clave] : TIPOS[clave];
            return (
              <li key={clave} className="flex items-center gap-2 text-[11px] font-medium text-stone-700 dark:text-stone-300">
                <MuestraLinea
                  color={item.color}
                  dashArray={colorearPor === 'tipo' ? null : TIPOS[clave]?.dashArray}
                />
                {item.etiqueta}
              </li>
            );
          })}
        </ul>

        {colorearPor === 'estado' ? (
          <div className="mt-2.5 border-t border-arena-200 pt-2 dark:border-white/10">
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-stone-400 dark:text-stone-500">
              La superficie se indica con el trazo
            </p>
            <ul className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-1">
              {ORDEN_TIPOS.map((clave) => (
                <li key={clave} className="flex items-center gap-1.5 text-[10px] text-stone-600 dark:text-stone-400">
                  <MuestraLinea color="#78716c" dashArray={TIPOS[clave].dashArray} />
                  {TIPOS[clave].patron}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-2.5 border-t border-arena-200 pt-2 dark:border-white/10">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-stone-400 dark:text-stone-500">
            Puntos de interés
          </p>
          <ul className="mt-1.5 flex items-center gap-3">
            {ORDEN_CATEGORIAS_POI.map((clave) => {
              const categoria = CATEGORIAS_POI[clave];
              return (
                <li key={clave} className="flex items-center gap-1.5 text-[10px] text-stone-600 dark:text-stone-400">
                  <span
                    className="flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-extrabold text-white"
                    style={{ backgroundColor: categoria.color }}
                    aria-hidden="true"
                  >
                    {categoria.inicial}
                  </span>
                  {categoria.etiqueta}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
