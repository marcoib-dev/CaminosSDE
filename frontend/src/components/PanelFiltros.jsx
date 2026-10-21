import {
  ESTADOS,
  ORDEN_ESTADOS,
  ORDEN_TIPOS,
  TIPOS,
} from '../constants/dominio.js';

function IconoBuscar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

function IconoOjo({ tachado = false }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12S18 18.5 12 18.5 2.5 12 2.5 12Z" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.6" />
      {tachado ? <path d="m4 4 16 16" strokeLinecap="round" /> : null}
    </svg>
  );
}

export default function PanelFiltros({
  filtros,
  onCambiar,
  departamentos,
  totalTramos,
  tramosVisibles,
  categorias,
  puntosVisibles,
  conteosPoi,
  algunPuntoVisible,
  onAlternarPunto,
  onAlternarTodosPuntos,
  onAdministrarCategorias,
  abierto,
  onCerrar,
  onOcultarPanel,
  onLimpiar,
  cargandoPuntos = false,
}) {
  const hayFiltros =
    Boolean(filtros.estado) || Boolean(filtros.tipo) || Boolean(filtros.departamento) || Boolean(filtros.busqueda);

  return (
    <aside
      id="panel-filtros"
      className={[
        'panel-filtros panel-desplazable absolute inset-x-0 bottom-0 z-[1100] max-h-full overflow-y-auto rounded-t-3xl border-t border-gray-200 bg-white p-4 shadow-panel',
        'dark:border-slate-800 dark:bg-slate-900',
        'lg:inset-x-auto lg:bottom-auto lg:left-4 lg:top-4 lg:max-h-[calc(100%-2rem)] lg:w-[21.5rem] lg:rounded-2xl lg:border',
        abierto
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-full opacity-0 lg:pointer-events-auto lg:translate-y-0 lg:opacity-100',
      ].join(' ')}
      aria-label="Filtros del mapa"
    >
      <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-stone-300 dark:bg-white/20 lg:hidden" aria-hidden="true" />

      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold leading-tight text-stone-900 dark:text-white">
            Explorar caminos
          </h2>
          <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
            {tramosVisibles} de {totalTramos} tramos visibles
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg p-1.5 text-stone-500 transition hover:bg-stone-900/5 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-white/10 dark:hover:text-white lg:hidden"
            aria-label="Cerrar filtros"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
          {onOcultarPanel ? (
            <button
              type="button"
              onClick={onOcultarPanel}
              className="hidden rounded-lg p-1.5 text-stone-500 transition hover:bg-stone-900/5 hover:text-stone-800 lg:inline-flex dark:text-stone-400 dark:hover:bg-white/10 dark:hover:text-white"
              aria-label="Ocultar panel de filtros"
              title="Ocultar panel"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
                <path d="m14 7-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        <span className="etiqueta-campo">Colorear por</span>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-stone-900/5 p-1 dark:bg-white/10">
          {[
            { valor: 'estado', etiqueta: 'Estado' },
            { valor: 'tipo', etiqueta: 'Superficie' },
          ].map((opcion) => (
            <button
              key={opcion.valor}
              type="button"
              onClick={() => onCambiar('colorearPor', opcion.valor)}
              aria-pressed={filtros.colorearPor === opcion.valor}
              className={[
                'rounded-lg px-2 py-2 text-xs font-semibold transition',
                filtros.colorearPor === opcion.valor
                  ? 'bg-white text-verde-800 shadow-sm dark:bg-slate-800 dark:text-verde-200'
                  : 'text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white',
              ].join(' ')}
            >
              {opcion.etiqueta}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <label htmlFor="filtro-busqueda" className="etiqueta-campo">
          Buscar camino
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
            <IconoBuscar />
          </span>
          <input
            id="filtro-busqueda"
            type="search"
            value={filtros.busqueda}
            onChange={(evento) => onCambiar('busqueda', evento.target.value)}
            placeholder="Nombre o localidad…"
            className="control-campo pl-9"
          />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="filtro-estado" className="etiqueta-campo">
            Estado
          </label>
          <select
            id="filtro-estado"
            value={filtros.estado}
            onChange={(evento) => onCambiar('estado', evento.target.value)}
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
          <label htmlFor="filtro-tipo" className="etiqueta-campo">
            Superficie
          </label>
          <select
            id="filtro-tipo"
            value={filtros.tipo}
            onChange={(evento) => onCambiar('tipo', evento.target.value)}
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
      </div>

      <div className="mt-3">
        <label htmlFor="filtro-departamento" className="etiqueta-campo">
          Departamento
        </label>
        <select
          id="filtro-departamento"
          value={filtros.departamento}
          onChange={(evento) => onCambiar('departamento', evento.target.value)}
          className="control-campo"
        >
          <option value="">Todos los departamentos</option>
          {departamentos.map((departamento) => (
            <option key={departamento} value={departamento}>
              {departamento}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 border-t border-arena-200 pt-3 dark:border-white/10">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="etiqueta-campo mb-0">Puntos de interés</span>
            <p className="mt-0.5 text-[11px] leading-snug text-stone-500 dark:text-stone-400">
              {algunPuntoVisible
                ? 'Tocá una categoría para ocultarla o mostrarla en el mapa.'
                : 'Están ocultos. Tocá una categoría para verla en el mapa.'}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {onAdministrarCategorias ? (
              <button
                type="button"
                onClick={onAdministrarCategorias}
                className="rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-cyan-700 transition hover:bg-cyan-50 hover:text-cyan-900 dark:text-cyan-300 dark:hover:bg-cyan-950/40 dark:hover:text-cyan-100"
              >
                Administrar
              </button>
            ) : null}
            <button
              type="button"
              onClick={onAlternarTodosPuntos}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-stone-600 transition hover:bg-stone-900/5 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <IconoOjo tachado={algunPuntoVisible} />
              {algunPuntoVisible ? 'Ocultar todos' : 'Mostrar todos'}
            </button>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {cargandoPuntos ? (
            <div className="col-span-3 flex justify-center py-3">
              <div className="inline-flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray="31.4 31.4"
                    strokeLinecap="round"
                    style={{ strokeDashoffset: '31.4' }}
                  />
                </svg>
                Cargando puntos de interés…
              </div>
            </div>
          ) : (
            categorias.map((categoria) => {
              const activo = Boolean(puntosVisibles[categoria.clave]);
              return (
                <button
                  key={categoria.clave}
                  type="button"
                  onClick={() => onAlternarPunto(categoria.clave)}
                  aria-pressed={activo}
                  aria-label={`${activo ? 'Ocultar' : 'Mostrar'} ${categoria.etiqueta} en el mapa`}
                  title={`${activo ? 'Ocultar' : 'Mostrar'} ${categoria.etiqueta} en el mapa`}
                  className={[
                    'group flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-[10px] font-semibold transition',
                    activo
                      ? 'border-arena-300 bg-white text-stone-700 shadow-sm hover:border-cyan-300 hover:bg-cyan-50/60 dark:border-white/15 dark:bg-white/10 dark:text-stone-100 dark:hover:border-cyan-700 dark:hover:bg-cyan-950/30'
                      : 'border-dashed border-arena-300 bg-stone-900/[0.03] text-stone-400 hover:border-cyan-400 hover:bg-cyan-50 hover:text-cyan-800 dark:border-white/15 dark:bg-white/5 dark:text-stone-500 dark:hover:border-cyan-600 dark:hover:bg-cyan-950/30 dark:hover:text-cyan-200',
                  ].join(' ')}
                >
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-extrabold text-white"
                    style={{ backgroundColor: activo ? categoria.color : '#a8a29e' }}
                    aria-hidden="true"
                  >
                    {categoria.inicial}
                  </span>
                  <span className="w-full truncate" title={categoria.etiqueta}>
                    {categoria.etiqueta}
                  </span>
                  <span
                    className={[
                      'flex items-center gap-1 text-[9px] font-medium',
                      activo ? 'text-verde-700 dark:text-verde-300' : 'opacity-70',
                    ].join(' ')}
                  >
                    <IconoOjo tachado={!activo} />
                    {activo ? 'Visible' : 'Oculto'} · {conteosPoi[categoria.clave] ?? 0}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {categorias.length === 0 && !cargandoPuntos ? (
          <p className="mt-2 text-[11px] text-stone-500 dark:text-stone-400">
            Todavía no hay categorías de puntos de interés.
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-arena-200 pt-3 dark:border-white/10">
        <button
          type="button"
          onClick={onLimpiar}
          disabled={!hayFiltros}
          className="boton-fantasma px-2 py-1.5 text-xs disabled:opacity-40"
        >
          Limpiar filtros
        </button>
        <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-stone-400 dark:text-stone-500">
          Santiago del Estero
        </span>
      </div>
    </aside>
  );
}
