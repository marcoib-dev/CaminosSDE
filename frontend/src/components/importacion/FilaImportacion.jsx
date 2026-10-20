import { ESTADOS, ORDEN_ESTADOS, ORDEN_TIPOS, TIPOS } from '../../constants/dominio.js';
import { formatearKm } from '../../utils/formato.js';

export default function FilaImportacion({
  feature,
  seleccionada,
  comparteGrupo,
  onAlternar,
  onCambiar,
}) {
  const atributos = Object.entries(feature.atributos ?? {});
  const compartida = feature.partes > 1;
  const idBase = `importar-${feature.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

  const cambiar = (campo, valor) => onCambiar(feature.id, { [campo]: valor });

  return (
    <li
      className={[
        'rounded-2xl border p-3 transition',
        seleccionada
          ? 'border-verde-300/80 bg-white/95 shadow-sm dark:border-verde-700/60 dark:bg-white/5'
          : 'border-arena-200/70 bg-white/40 opacity-70 dark:border-white/10 dark:bg-white/[0.02]',
      ].join(' ')}
      style={{ borderLeftWidth: 4, borderLeftColor: ESTADOS[feature.estado]?.color ?? '#a8a29e' }}
    >
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={seleccionada}
          onChange={() => onAlternar(feature.id)}
          className="mt-1 h-4 w-4 shrink-0 rounded border-arena-400 text-verde-700 focus:ring-verde-500"
          aria-label={`Incluir ${feature.nombre} en la importación`}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-stone-500 dark:text-stone-400">
            <span className="rounded-full bg-arena-100 px-2 py-0.5 font-semibold text-stone-600 dark:bg-white/10 dark:text-stone-300">
              {feature.capa}
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-stone-700 dark:text-stone-200">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: ESTADOS[feature.estado]?.color ?? '#a8a29e' }}
              />
              {ESTADOS[feature.estado]?.etiqueta ?? feature.estado}
            </span>
            <span>·</span>
            <span>{TIPOS[feature.tipo]?.etiqueta ?? feature.tipo}</span>
            <span>·</span>
            <span>{formatearKm(feature.longitudKm)}</span>
            <span>·</span>
            <span>{feature.tipoGeometriaOriginal ?? feature.tipoGeometria}</span>
            {compartida ? (
              <>
                <span>·</span>
                <span className="font-semibold text-verde-700 dark:text-verde-300">
                  Parte {feature.parte} de {feature.partes}
                </span>
              </>
            ) : null}
          </div>

          <div className="mt-2 grid gap-2">
            <div>
              <label htmlFor={`${idBase}-nombre`} className="etiqueta-campo">
                Nombre del camino
              </label>
              <input
                id={`${idBase}-nombre`}
                type="text"
                value={feature.nombre}
                onChange={(evento) => cambiar('nombre', evento.target.value)}
                maxLength={200}
                className="control-campo"
                disabled={!seleccionada}
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label htmlFor={`${idBase}-localidad`} className="etiqueta-campo">
                  Localidad
                </label>
                <input
                  id={`${idBase}-localidad`}
                  type="text"
                  value={feature.localidad}
                  onChange={(evento) => cambiar('localidad', evento.target.value)}
                  maxLength={150}
                  placeholder="Obligatoria"
                  className="control-campo"
                  disabled={!seleccionada}
                />
              </div>
              <div>
                <label htmlFor={`${idBase}-departamento`} className="etiqueta-campo">
                  Departamento
                </label>
                <input
                  id={`${idBase}-departamento`}
                  type="text"
                  value={feature.departamento}
                  onChange={(evento) => cambiar('departamento', evento.target.value)}
                  maxLength={150}
                  placeholder="Obligatorio"
                  className="control-campo"
                  disabled={!seleccionada}
                />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label htmlFor={`${idBase}-estado`} className="etiqueta-campo">
                  Estado
                </label>
                <select
                  id={`${idBase}-estado`}
                  value={feature.estado}
                  onChange={(evento) => cambiar('estado', evento.target.value)}
                  className="control-campo"
                  disabled={!seleccionada}
                >
                  {ORDEN_ESTADOS.map((clave) => (
                    <option key={clave} value={clave}>
                      {ESTADOS[clave].etiqueta}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`${idBase}-tipo`} className="etiqueta-campo">
                  Superficie
                </label>
                <select
                  id={`${idBase}-tipo`}
                  value={feature.tipo}
                  onChange={(evento) => cambiar('tipo', evento.target.value)}
                  className="control-campo"
                  disabled={!seleccionada}
                >
                  {ORDEN_TIPOS.map((clave) => (
                    <option key={clave} value={clave}>
                      {TIPOS[clave].etiqueta}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {compartida || comparteGrupo ? (
            <p className="mt-1.5 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
              {compartida
                ? 'Las partes de este MultiLineString se guardan como tramos separados del mismo camino. '
                : ''}
              El nombre, la localidad y el departamento se comparten con los demás tramos de este
              camino.
            </p>
          ) : null}

          {atributos.length > 0 ? (
            <details className="mt-2 rounded-xl border border-arena-200/70 bg-arena-50/60 px-2.5 py-1.5 text-[11px] dark:border-white/10 dark:bg-white/[0.03]">
              <summary className="cursor-pointer font-semibold text-stone-600 dark:text-stone-300">
                Atributos del archivo ({atributos.length})
              </summary>
              <dl className="mt-1.5 grid gap-x-3 gap-y-1 sm:grid-cols-2">
                {atributos.map(([clave, valor]) => (
                  <div key={clave} className="flex min-w-0 gap-1">
                    <dt className="shrink-0 font-semibold text-stone-500 dark:text-stone-400">
                      {clave}:
                    </dt>
                    <dd className="min-w-0 truncate text-stone-700 dark:text-stone-200" title={String(valor)}>
                      {String(valor)}
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          ) : null}
        </div>
      </div>
    </li>
  );
}
