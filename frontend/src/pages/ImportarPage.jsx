import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import FilaImportacion from '../components/importacion/FilaImportacion.jsx';
import MapaPrevisualizacion from '../components/importacion/MapaPrevisualizacion.jsx';
import { ESTADOS, ORDEN_ESTADOS, ORDEN_TIPOS, TIPOS } from '../constants/dominio.js';
import { confirmarImportacion, previsualizarImportacion } from '../services/api.js';
import { formatearKm, formatearNumero } from '../utils/formato.js';

const TAMANO_MAXIMO_MB = 25;
const EXTENSIONES = ['.kml', '.gpkg'];

const MAPEO_INICIAL = {
  estado: '',
  tipo: '',
  estadoPorDefecto: 'REGULAR',
  tipoPorDefecto: 'TIERRA',
};

const COMUNES_INICIAL = {
  nombre: '',
  localidad: '',
  departamento: '',
  unificar: false,
};

/** Grupo compartido por los tramos que el usuario decide unificar en un camino. */
const GRUPO_UNICO = 'importacion-camino-unico';

/**
 * Arma un mensaje legible con el detalle de los campos que rechazó el backend.
 */
function describirError(err, porDefecto) {
  const mensaje = err?.message || porDefecto;
  const detalles = Array.isArray(err?.detalles) ? err.detalles : [];

  if (detalles.length === 0) return mensaje;

  const lista = detalles.slice(0, 5).map((detalle) => {
    const partes = String(detalle.campo ?? '').split('.');
    const campo =
      partes[0] === 'features' && partes[1] !== undefined
        ? `Tramo ${Number(partes[1]) + 1}${
            partes.length > 2 ? ` (${partes.slice(2).join('.')})` : ''
          }`
        : detalle.campo;

    return campo ? `${campo}: ${detalle.mensaje}` : detalle.mensaje;
  });

  return `${mensaje} ${lista.join(' · ')}`;
}

function prepararFeatures(datos) {
  return datos.features.map((feature) => ({
    ...feature,
    localidad: feature.localidadSugerida ?? '',
    departamento: feature.departamentoSugerido ?? '',
    estado: feature.estadoSugerido,
    tipo: feature.tipoSugerido,
  }));
}

function extensionDe(nombreArchivo) {
  const punto = nombreArchivo.lastIndexOf('.');
  return punto >= 0 ? nombreArchivo.slice(punto).toLowerCase() : '';
}

export default function ImportarPage() {
  const inputRef = useRef(null);

  const [archivo, setArchivo] = useState(null);
  const [vista, setVista] = useState(null);
  const [features, setFeatures] = useState([]);
  const [seleccionadas, setSeleccionadas] = useState(() => new Set());
  const [mapeo, setMapeo] = useState(MAPEO_INICIAL);
  const [mostrarMapeo, setMostrarMapeo] = useState(false);
  const [comunes, setComunes] = useState(COMUNES_INICIAL);

  const [cargando, setCargando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState(null);

  const limpiarVista = () => {
    setVista(null);
    setFeatures([]);
    setSeleccionadas(new Set());
    setComunes(COMUNES_INICIAL);
  };

  const cargarPrevisualizacion = async (mapeoAplicado) => {
    if (!archivo) {
      setError('Seleccioná un archivo .kml o .gpkg.');
      return;
    }

    setCargando(true);
    setError('');
    setResultado(null);

    try {
      const datos = await previsualizarImportacion(archivo, mapeoAplicado);
      const preparadas = prepararFeatures(datos);

      setVista(datos);
      setFeatures(preparadas);
      setSeleccionadas(new Set(preparadas.map((feature) => feature.id)));
      setComunes((actual) => {
        const nombres = new Set(
          preparadas.map((feature) => feature.nombre?.trim()).filter(Boolean)
        );

        return {
          ...actual,
          nombre: nombres.size === 1 ? [...nombres][0] : '',
          localidad: preparadas.find((feature) => feature.localidad)?.localidad ?? '',
          departamento:
            preparadas.find((feature) => feature.departamento)?.departamento ?? '',
        };
      });
    } catch (err) {
      limpiarVista();
      setError(describirError(err, 'No se pudo leer el archivo.'));
    } finally {
      setCargando(false);
    }
  };

  const cambiarArchivo = (evento) => {
    const elegido = evento.target.files?.[0] ?? null;

    setError('');
    setResultado(null);
    limpiarVista();

    if (!elegido) {
      setArchivo(null);
      return;
    }

    if (!EXTENSIONES.includes(extensionDe(elegido.name))) {
      setError('El archivo debe tener extensión .kml o .gpkg.');
      setArchivo(null);
      evento.target.value = '';
      return;
    }

    if (elegido.size > TAMANO_MAXIMO_MB * 1024 * 1024) {
      setError(`El archivo supera el límite de ${TAMANO_MAXIMO_MB} MB.`);
      setArchivo(null);
      evento.target.value = '';
      return;
    }

    setArchivo(elegido);
  };

  const enviarArchivo = (evento) => {
    evento.preventDefault();
    cargarPrevisualizacion();
  };

  const aplicarMapeo = () => {
    cargarPrevisualizacion({
      estado: {
        ...(mapeo.estado ? { campo: mapeo.estado } : {}),
        porDefecto: mapeo.estadoPorDefecto,
      },
      tipo: {
        ...(mapeo.tipo ? { campo: mapeo.tipo } : {}),
        porDefecto: mapeo.tipoPorDefecto,
      },
    });
  };

  /**
   * Copia el nombre, la localidad y el departamento a varios tramos.
   * Si `unificar` está activo, todos los tramos alcanzados comparten camino.
   */
  const aplicarComunes = (alcance) => {
    const nombre = comunes.nombre.trim();
    const localidad = comunes.localidad.trim();
    const departamento = comunes.departamento.trim();

    if (!localidad || !departamento) {
      setError('Completá la localidad y el departamento para aplicarlos a los tramos.');
      return;
    }

    if (comunes.unificar && !nombre) {
      setError('Para unificar los tramos en un solo camino, indicá el nombre del camino.');
      return;
    }

    const objetivo = alcance === 'seleccionados' ? seleccionadas : null;
    // Cada aplicación crea su propio grupo para no mezclar caminos distintos.
    const grupoUnico = `${GRUPO_UNICO}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    setError('');
    setFeatures((actuales) =>
      actuales.map((feature) => {
        if (objetivo && !objetivo.has(feature.id)) return feature;

        return {
          ...feature,
          nombre: nombre || feature.nombre,
          localidad,
          departamento,
          grupo: comunes.unificar ? grupoUnico : feature.origen,
        };
      })
    );
  };

  const alternarSeleccion = (id) => {
    setSeleccionadas((actual) => {
      const nuevo = new Set(actual);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });
  };

  const cambiarFeature = (id, cambios) => {
    const camposCompartidos = ['nombre', 'localidad', 'departamento'].some(
      (campo) => campo in cambios
    );

    setFeatures((actuales) => {
      const objetivo = actuales.find((feature) => feature.id === id);
      if (!objetivo) return actuales;

      return actuales.map((feature) => {
        if (feature.id === id) return { ...feature, ...cambios };
        if (camposCompartidos && feature.grupo === objetivo.grupo) {
          return { ...feature, ...cambios };
        }
        return feature;
      });
    });
  };

  const confirmar = async () => {
    setError('');
    const elegidas = features.filter((feature) => seleccionadas.has(feature.id));

    if (elegidas.length === 0) {
      setError('Seleccioná al menos un tramo para importar.');
      return;
    }

    const incompleta = elegidas.find(
      (feature) => !feature.nombre.trim() || !feature.localidad.trim() || !feature.departamento.trim()
    );

    if (incompleta) {
      setError(
        `Completá el nombre, la localidad y el departamento de "${
          incompleta.nombre || incompleta.id
        }" antes de confirmar.`
      );
      return;
    }

    setConfirmando(true);

    try {
      const respuesta = await confirmarImportacion({
        features: elegidas.map((feature) => ({
          id: feature.id,
          grupo: feature.grupo,
          nombre: feature.nombre.trim(),
          localidad: feature.localidad.trim(),
          departamento: feature.departamento.trim(),
          estado: feature.estado,
          tipo: feature.tipo,
          atributos: feature.atributos,
          geometria: feature.geometria,
        })),
      });

      setResultado(respuesta?.datos ?? null);
      setArchivo(null);
      limpiarVista();
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      setError(describirError(err, 'No se pudo confirmar la importación.'));
    } finally {
      setConfirmando(false);
    }
  };

  const tramosPorGrupo = features.reduce((mapa, feature) => {
    mapa.set(feature.grupo, (mapa.get(feature.grupo) ?? 0) + 1);
    return mapa;
  }, new Map());

  return (
    <div className="h-full overflow-y-auto bg-arena-50 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-verde-700 dark:text-verde-300">
            Relevamiento
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-stone-900 dark:text-white sm:text-4xl">
            Importar caminos
          </h1>
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            Subí un archivo de QGIS en formato KML o GeoPackage, revisá la previsualización y
            confirmá qué tramos querés incorporar. Las geometrías se guardan en EPSG:4326 y una
            MultiLineString se separa en tramos independientes.
          </p>
        </div>

        {error ? (
          <p
            className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {resultado ? (
          <section className="tarjeta mt-4 border-verde-300/70 p-4 sm:p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-verde-700 dark:text-verde-300">
              Importación completada
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold text-stone-900 dark:text-white">
              Se importaron {formatearNumero(resultado.resumen.tramosCreados)} tramo(s) en{' '}
              {formatearNumero(resultado.resumen.caminosCreados)} camino(s)
            </h2>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
              Longitud total: {formatearKm(resultado.resumen.longitudTotalKm)}.
            </p>

            {resultado.caminos.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {resultado.caminos.map((camino) => (
                  <li
                    key={camino.id}
                    className="rounded-full bg-verde-50 px-2.5 py-1 text-[11px] font-semibold text-verde-800 dark:bg-verde-950/40 dark:text-verde-200"
                  >
                    {camino.nombre} · {camino.localidad}, {camino.departamento}
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/" className="boton-primario">
                Ver en el mapa
              </Link>
              <button type="button" onClick={() => setResultado(null)} className="boton-suave">
                Importar otro archivo
              </button>
            </div>
          </section>
        ) : null}

        <section className="tarjeta mt-4 p-4 sm:p-5">
          <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-white">
            1. Archivo de origen
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
            Formatos admitidos: <strong>.kml</strong> y <strong>.gpkg</strong>. Tamaño máximo{' '}
            {TAMANO_MAXIMO_MB} MB. El GPKG puede tener varias capas y venir en otro sistema de
            coordenadas: se reproyecta automáticamente a EPSG:4326.
          </p>

          <form onSubmit={enviarArchivo} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              ref={inputRef}
              id="archivo-importacion"
              type="file"
              accept=".kml,.gpkg"
              aria-label="Archivo KML o GeoPackage"
              onChange={cambiarArchivo}
              className="block w-full cursor-pointer rounded-xl border border-dashed border-arena-300 bg-white/70 px-3 py-2.5 text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-verde-700 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:border-verde-400 dark:border-white/15 dark:bg-white/5 dark:text-stone-300 dark:file:bg-verde-600"
            />
            <button type="submit" className="boton-primario shrink-0" disabled={cargando || !archivo}>
              {cargando ? 'Analizando…' : 'Previsualizar'}
            </button>
          </form>

          {archivo ? (
            <p className="mt-2 text-[11px] text-stone-500 dark:text-stone-400">
              {archivo.name} · {(archivo.size / (1024 * 1024)).toLocaleString('es-AR', {
                maximumFractionDigits: 2,
              })}{' '}
              MB
            </p>
          ) : null}
        </section>

        {vista ? (
          <>
            <section className="tarjeta mt-4 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-white">
                    2. Resumen del archivo
                  </h2>
                  <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                    {vista.archivo}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMostrarMapeo((actual) => !actual)}
                  className="boton-suave px-3 py-1.5 text-xs"
                >
                  {mostrarMapeo ? 'Ocultar mapeo' : 'Configurar mapeo'}
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                <span className="rounded-full bg-arena-100 px-2.5 py-1 font-semibold text-stone-700 dark:bg-white/10 dark:text-stone-200">
                  Formato: {vista.formato}
                </span>
                <span className="rounded-full bg-arena-100 px-2.5 py-1 font-semibold text-stone-700 dark:bg-white/10 dark:text-stone-200">
                  Capas: {vista.capas.join(', ') || '—'}
                </span>
                <span className="rounded-full bg-arena-100 px-2.5 py-1 font-semibold text-stone-700 dark:bg-white/10 dark:text-stone-200">
                  Coordenadas: {vista.sistemasCoordenadas.join(', ') || '—'}
                  {vista.reproyectado ? ' · reproyectado a EPSG:4326' : ''}
                </span>
                <span className="rounded-full bg-verde-100 px-2.5 py-1 font-semibold text-verde-800 dark:bg-verde-950/50 dark:text-verde-200">
                  {formatearNumero(vista.total)} tramo(s)
                </span>
                {vista.descartados > 0 ? (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                    {formatearNumero(vista.descartados)} descartado(s)
                  </span>
                ) : null}
              </div>

              {vista.advertencias.length > 0 ? (
                <ul className="mt-3 space-y-1 rounded-xl bg-amber-50 px-3 py-2.5 text-[11px] leading-relaxed text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                  {vista.advertencias.map((advertencia, indice) => (
                    <li key={indice}>{advertencia}</li>
                  ))}
                </ul>
              ) : null}

              {mostrarMapeo ? (
                <div className="mt-4 rounded-xl border border-arena-200/80 bg-arena-50/60 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-300">
                    Los valores de estado y superficie se detectan automáticamente a partir de
                    atributos habituales (<code>estado</code>, <code>condicion</code>,{' '}
                    <code>superficie</code>, <code>tipo</code>, etc.). Si tu archivo usa otros
                    nombres, elegí el campo y el valor por defecto.
                  </p>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="mapeo-estado-campo" className="etiqueta-campo">
                        Estado desde el atributo
                      </label>
                      <select
                        id="mapeo-estado-campo"
                        value={mapeo.estado}
                        onChange={(evento) =>
                          setMapeo((actual) => ({ ...actual, estado: evento.target.value }))
                        }
                        className="control-campo"
                      >
                        <option value="">Detección automática</option>
                        {vista.clavesAtributos.map((clave) => (
                          <option key={clave} value={clave}>
                            {clave}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="mapeo-estado-defecto" className="etiqueta-campo">
                        Estado por defecto
                      </label>
                      <select
                        id="mapeo-estado-defecto"
                        value={mapeo.estadoPorDefecto}
                        onChange={(evento) =>
                          setMapeo((actual) => ({ ...actual, estadoPorDefecto: evento.target.value }))
                        }
                        className="control-campo"
                      >
                        {ORDEN_ESTADOS.map((clave) => (
                          <option key={clave} value={clave}>
                            {ESTADOS[clave].etiqueta}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="mapeo-tipo-campo" className="etiqueta-campo">
                        Superficie desde el atributo
                      </label>
                      <select
                        id="mapeo-tipo-campo"
                        value={mapeo.tipo}
                        onChange={(evento) =>
                          setMapeo((actual) => ({ ...actual, tipo: evento.target.value }))
                        }
                        className="control-campo"
                      >
                        <option value="">Detección automática</option>
                        {vista.clavesAtributos.map((clave) => (
                          <option key={clave} value={clave}>
                            {clave}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="mapeo-tipo-defecto" className="etiqueta-campo">
                        Superficie por defecto
                      </label>
                      <select
                        id="mapeo-tipo-defecto"
                        value={mapeo.tipoPorDefecto}
                        onChange={(evento) =>
                          setMapeo((actual) => ({ ...actual, tipoPorDefecto: evento.target.value }))
                        }
                        className="control-campo"
                      >
                        {ORDEN_TIPOS.map((clave) => (
                          <option key={clave} value={clave}>
                            {TIPOS[clave].etiqueta}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={aplicarMapeo}
                      disabled={cargando}
                      className="boton-suave px-3 py-1.5 text-xs"
                    >
                      Volver a analizar
                    </button>
                    <span className="text-[11px] text-stone-500 dark:text-stone-400">
                      Se descartan las asignaciones manuales que hayas hecho.
                    </span>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-[11px] text-stone-500 dark:text-stone-400">
                  Valores sugeridos: estado desde <code>estado/condicion</code> y superficie desde{' '}
                  <code>superficie/tipo</code>. Si no hay coincidencia se usa REGULAR y TIERRA.
                </p>
              )}
            </section>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:items-start">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-white">
                    3. Tramos ({formatearNumero(seleccionadas.size)} de {formatearNumero(features.length)})
                  </h2>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSeleccionadas(new Set(features.map((feature) => feature.id)))}
                      className="boton-fantasma px-2.5 py-1.5 text-xs"
                    >
                      Seleccionar todos
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeleccionadas(new Set())}
                      className="boton-fantasma px-2.5 py-1.5 text-xs"
                    >
                      Quitar selección
                    </button>
                  </div>
                </div>

                <div className="mt-2.5 rounded-2xl border border-verde-200/70 bg-verde-50/50 p-3 dark:border-verde-800/50 dark:bg-verde-950/20">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="text-xs font-semibold text-stone-800 dark:text-stone-100">
                      Datos comunes
                    </p>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      Completalos una vez y aplicalos a varios tramos.
                    </p>
                  </div>

                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    <div>
                      <label htmlFor="comunes-localidad" className="etiqueta-campo">
                        Localidad
                      </label>
                      <input
                        id="comunes-localidad"
                        type="text"
                        value={comunes.localidad}
                        onChange={(evento) =>
                          setComunes((actual) => ({ ...actual, localidad: evento.target.value }))
                        }
                        maxLength={150}
                        className="control-campo"
                      />
                    </div>
                    <div>
                      <label htmlFor="comunes-departamento" className="etiqueta-campo">
                        Departamento
                      </label>
                      <input
                        id="comunes-departamento"
                        type="text"
                        value={comunes.departamento}
                        onChange={(evento) =>
                          setComunes((actual) => ({ ...actual, departamento: evento.target.value }))
                        }
                        maxLength={150}
                        className="control-campo"
                      />
                    </div>
                    <div>
                      <label htmlFor="comunes-nombre" className="etiqueta-campo">
                        Nombre del camino (opcional)
                      </label>
                      <input
                        id="comunes-nombre"
                        type="text"
                        value={comunes.nombre}
                        onChange={(evento) =>
                          setComunes((actual) => ({ ...actual, nombre: evento.target.value }))
                        }
                        maxLength={200}
                        placeholder="Mantener el de cada tramo"
                        className="control-campo"
                      />
                    </div>
                  </div>

                  <label className="mt-2.5 flex items-start gap-2 text-[11px] leading-relaxed text-stone-600 dark:text-stone-300">
                    <input
                      type="checkbox"
                      checked={comunes.unificar}
                      onChange={(evento) =>
                        setComunes((actual) => ({ ...actual, unificar: evento.target.checked }))
                      }
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-arena-400 text-verde-700 focus:ring-verde-500"
                    />
                    <span>
                      Unificar en un solo camino los tramos alcanzados (por ejemplo, los 10 tramos de
                      una misma ruta). Necesita el nombre del camino.
                    </span>
                  </label>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => aplicarComunes('seleccionados')}
                      className="boton-suave px-3 py-1.5 text-xs"
                      disabled={seleccionadas.size === 0}
                    >
                      Aplicar a seleccionados ({formatearNumero(seleccionadas.size)})
                    </button>
                    <button
                      type="button"
                      onClick={() => aplicarComunes('todos')}
                      className="boton-suave px-3 py-1.5 text-xs"
                    >
                      Aplicar a todos ({formatearNumero(features.length)})
                    </button>
                  </div>
                </div>

                <ul className="mt-2.5 space-y-2.5">
                  {features.map((feature) => (
                    <FilaImportacion
                      key={feature.id}
                      feature={feature}
                      seleccionada={seleccionadas.has(feature.id)}
                      comparteGrupo={(tramosPorGrupo.get(feature.grupo) ?? 0) > 1}
                      onAlternar={alternarSeleccion}
                      onCambiar={cambiarFeature}
                    />
                  ))}
                </ul>
              </div>

              <div className="lg:sticky lg:top-4">
                <div className="tarjeta overflow-hidden">
                  <div className="h-[360px] lg:h-[calc(100dvh-10rem)]">
                    <MapaPrevisualizacion
                      features={features}
                      seleccionadas={seleccionadas}
                      onAlternar={alternarSeleccion}
                    />
                  </div>
                </div>
                <p className="mt-1.5 text-[11px] text-stone-500 dark:text-stone-400">
                  Hacé clic en una línea del mapa para incluirla o excluirla. Las líneas grises no
                  se van a importar.
                </p>
              </div>
            </div>

            <div className="tarjeta mt-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-300">
                Se van a crear{' '}
                <strong>{formatearNumero(seleccionadas.size)} tramo(s)</strong> y los caminos que
                hagan falta. Los tramos de un mismo MultiLineString, o los que unificaste, comparten
                camino.
              </p>
              <button
                type="button"
                onClick={confirmar}
                className="boton-primario shrink-0"
                disabled={confirmando || seleccionadas.size === 0}
              >
                {confirmando ? 'Importando…' : `Confirmar importación (${seleccionadas.size})`}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
