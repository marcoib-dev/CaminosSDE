import {
  CATEGORIAS_POI,
  ESTADOS,
  ORDEN_CATEGORIAS_POI,
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

export default function PanelFiltros({
  filtros,
  onCambiar,
  departamentos,
  totalTramos,
  tramosVisibles,
  puntosVisibles,
  conteosPoi,
  onAlternarPunto,
  abierto,
  onCerrar,
  onLimpiar,
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
        <span className="etiqueta-campo">Puntos de interés</span>
        <div className="grid grid-cols-3 gap-1.5">
          {ORDEN_CATEGORIAS_POI.map((clave) => {
            const categoria = CATEGORIAS_POI[clave];
            const activo = puntosVisibles[clave];
            return (
              <button
                key={clave}
                type="button"
                onClick={() => onAlternarPunto(clave)}
                aria-pressed={activo}
                className={[
                  'flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-[10px] font-semibold transition',
                  activo
                    ? 'border-arena-300 bg-white text-stone-700 shadow-sm dark:border-white/15 dark:bg-white/10 dark:text-stone-100'
                    : 'border-transparent bg-stone-900/5 text-stone-400 hover:bg-stone-900/10 dark:bg-white/5 dark:text-stone-500 dark:hover:bg-white/10',
                ].join(' ')}
              >
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-extrabold text-white"
                  style={{ backgroundColor: activo ? categoria.color : '#a8a29e' }}
                  aria-hidden="true"
                >
                  {categoria.inicial}
                </span>
                {categoria.etiqueta}
                <span className="text-[9px] font-medium opacity-70">{conteosPoi[clave] ?? 0}</span>
              </button>
            );
          })}
        </div>
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
