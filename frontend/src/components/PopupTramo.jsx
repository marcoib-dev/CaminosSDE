import { ESTADOS, TIPOS } from '../constants/dominio.js';
import { useCategorias } from '../context/CategoriasContext.jsx';
import { formatearKm, nivelPrioridad } from '../utils/formato.js';
import PuntajePrioridad from './PuntajePrioridad.jsx';
// import SugerenciaForm from './SugerenciaForm.jsx'; // Oculto temporalmente

function Insignia({ children, color }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-bold"
      style={{ color, backgroundColor: `${color}1c` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
      {children}
    </span>
  );
}

export default function PopupTramo({ tramo, prioridad, onEditar }) {
  const { porClave: categoriasPorClave } = useCategorias();
  const camino = tramo.camino ?? {};
  const estado = ESTADOS[tramo.estado];
  const tipo = TIPOS[tramo.tipo];
  const fotos = camino.fotos ?? [];
  const tramosDelCamino = camino.tramos ?? [];
  const longitudTotal = tramosDelCamino.length
    ? tramosDelCamino.reduce((total, item) => total + (item.longitudKm || 0), 0)
    : tramo.longitudKm;
  const nivel = prioridad ? nivelPrioridad(prioridad.puntaje) : null;
  const puntosCercanos = prioridad?.puntosCercanos ?? [];

  return (
    <div className="popup-tramo text-stone-700 dark:text-stone-200">
      <div className="border-b border-arena-200/80 px-4 py-3 pr-10 dark:border-white/10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500 dark:text-stone-400">
          {camino.localidad}
          {camino.departamento ? ` · ${camino.departamento}` : ''}
        </p>
        <h3 className="mt-0.5 font-display text-[17px] font-semibold leading-tight text-stone-900 dark:text-white">
          {camino.nombre || 'Camino sin nombre'}
        </h3>
      </div>

      <div className="space-y-3 px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {estado ? <Insignia color={estado.color}>{estado.etiqueta}</Insignia> : null}
          {tipo ? <Insignia color={tipo.color}>{tipo.etiqueta}</Insignia> : null}
        </div>

        <dl className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-arena-100/80 px-2.5 py-2 dark:bg-white/5">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              Este tramo
            </dt>
            <dd className="mt-0.5 font-bold text-stone-900 dark:text-white">{formatearKm(tramo.longitudKm)}</dd>
          </div>
          <div className="rounded-xl bg-arena-100/80 px-2.5 py-2 dark:bg-white/5">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              Camino completo
            </dt>
            <dd className="mt-0.5 font-bold text-stone-900 dark:text-white">{formatearKm(longitudTotal)}</dd>
          </div>
        </dl>

        <div className="rounded-xl border border-arena-200/80 px-3 py-2.5 dark:border-white/10">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500 dark:text-stone-400">
              Prioridad de intervención
            </span>
            {prioridad ? <PuntajePrioridad valor={prioridad.puntaje} compacto /> : <span className="text-xs text-stone-400">—</span>}
          </div>

          {prioridad ? (
            <>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-200 dark:bg-white/10">
                <div
                  className={`h-full rounded-full ${nivel.barra}`}
                  style={{ width: `${Math.min(100, Math.max(0, prioridad.puntaje))}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-stone-500 dark:text-stone-400">
                {nivel.etiqueta} · Estado +{prioridad.estado} · Superficie +{prioridad.tipo} · Cercanía +
                {prioridad.cercania}
              </p>
              {puntosCercanos.length > 0 ? (
                <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">
                  Cerca de:{' '}
                  <span className="font-medium text-stone-700 dark:text-stone-200">
                    {puntosCercanos
                      .slice(0, 2)
                      .map((punto) => `${punto.nombre} (${categoriasPorClave[punto.categoria]?.etiqueta ?? punto.categoria})`)
                      .join(', ')}
                    {puntosCercanos.length > 2 ? ` y ${puntosCercanos.length - 2} más` : ''}
                  </span>
                </p>
              ) : null}
            </>
          ) : (
            <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">
              El puntaje no está disponible en este momento.
            </p>
          )}
        </div>

        {tramo.observaciones ? (
          <p className="rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] leading-relaxed text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            {tramo.observaciones}
          </p>
        ) : null}

        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500 dark:text-stone-400">
            Fotos del camino
          </p>
          {fotos.length > 0 ? (
            <div className="panel-desplazable flex gap-2 overflow-x-auto pb-1">
              {fotos.slice(0, 6).map((foto) => (
                <a
                  key={foto.id}
                  href={foto.url}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 overflow-hidden rounded-lg ring-1 ring-black/5 dark:ring-white/10"
                  title={foto.descripcion || 'Ampliar foto'}
                >
                  <img
                    src={foto.url}
                    alt={foto.descripcion || `Foto de ${camino.nombre}`}
                    loading="lazy"
                    className="h-16 w-24 object-cover transition duration-200 hover:scale-105"
                  />
                </a>
              ))}
            </div>
          ) : (
            <p className="text-[11px] italic text-stone-400 dark:text-stone-500">Sin fotos cargadas.</p>
          )}
        </div>

        {/* <SugerenciaForm caminoId={tramo.caminoId} tramoId={tramo.id} /> */} {/* Oculto temporalmente */}
      </div>

      {onEditar ? (
        <div className="border-t border-arena-200/80 px-4 py-3 dark:border-white/10">
          <button
            type="button"
            onClick={() => onEditar(tramo)}
            className="boton-primario w-full py-2 text-xs"
          >
            Editar tramo
          </button>
          <p className="mt-1 text-center text-[10px] text-stone-500 dark:text-stone-400">
            Desde el panel también se editan los datos del camino.
          </p>
        </div>
      ) : null}
    </div>
  );
}
