import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Leyenda from '../components/Leyenda.jsx';
import Mapa from '../components/Mapa.jsx';
import PanelFiltros from '../components/PanelFiltros.jsx';
import BarraEditor from '../components/editor/BarraEditor.jsx';
import FormCamino from '../components/editor/FormCamino.jsx';
import FormPuntoInteres from '../components/editor/FormPuntoInteres.jsx';
import FormTramo from '../components/editor/FormTramo.jsx';
import ListaCaminos from '../components/editor/ListaCaminos.jsx';
import PanelHerramienta from '../components/editor/PanelHerramienta.jsx';
import PanelTramo from '../components/editor/PanelTramo.jsx';
import { ORDEN_CATEGORIAS_POI } from '../constants/dominio.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  crearTramo,
  dividirTramo,
  eliminarCamino,
  eliminarPuntoInteres,
  obtenerCaminos,
  obtenerPuntosInteres,
  obtenerTramosPrioridad,
} from '../services/api.js';
import { normalizarTexto } from '../utils/formato.js';
import { aGeometriaLineString, puntoMasCercanoEnLinea } from '../utils/geometria.js';

const FILTROS_INICIALES = {
  colorearPor: 'estado',
  estado: '',
  tipo: '',
  departamento: '',
  busqueda: '',
};

const PUNTOS_VISIBLES_INICIALES = {
  HOSPITAL: true,
  ESCUELA: true,
  UPA: true,
};

const MENSAJE_DURACION_MS = 6000;

export default function MapaPage() {
  const [parametros] = useSearchParams();
  const tramoDestacadoId = parametros.get('tramo');
  const { esEditor } = useAuth();

  const [caminos, setCaminos] = useState([]);
  const [puntos, setPuntos] = useState([]);
  const [prioridades, setPrioridades] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [puntosVisibles, setPuntosVisibles] = useState(PUNTOS_VISIBLES_INICIALES);
  const [panelAbierto, setPanelAbierto] = useState(false);

  const [herramienta, setHerramienta] = useState('');
  const [dibujo, setDibujo] = useState([]);
  const [borradorTramo, setBorradorTramo] = useState(null);
  const [tramoDivisionId, setTramoDivisionId] = useState(null);
  const [tramoSeleccionadoId, setTramoSeleccionadoId] = useState(null);
  const [modalCamino, setModalCamino] = useState(null);
  const [modalTramo, setModalTramo] = useState(null);
  const [modalPunto, setModalPunto] = useState(null);
  const [modalLista, setModalLista] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const cargar = useCallback(async (opciones = {}) => {
    const silencioso = opciones?.silencioso === true;

    if (!silencioso) setCargando(true);
    setError('');

    try {
      const [caminosData, puntosData] = await Promise.all([obtenerCaminos(), obtenerPuntosInteres()]);
      setCaminos(caminosData);
      setPuntos(puntosData);

      try {
        setPrioridades(await obtenerTramosPrioridad());
      } catch {
        setPrioridades([]);
      }
    } catch (err) {
      setError(err?.message || 'No se pudieron cargar los datos del mapa.');
    } finally {
      if (!silencioso) setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (!mensaje) return undefined;
    const temporizador = window.setTimeout(() => setMensaje(''), MENSAJE_DURACION_MS);
    return () => window.clearTimeout(temporizador);
  }, [mensaje]);

  useEffect(() => {
    if (!esEditor) {
      setHerramienta('');
      setDibujo([]);
      setBorradorTramo(null);
      setTramoDivisionId(null);
      setTramoSeleccionadoId(null);
    }
  }, [esEditor]);

  const tramos = useMemo(
    () =>
      caminos.flatMap((camino) =>
        (camino.tramos ?? []).map((tramo) => ({
          ...tramo,
          camino,
        }))
      ),
    [caminos]
  );

  const prioridadesPorTramo = useMemo(
    () =>
      Object.fromEntries(
        prioridades.map((tramo) => [tramo.id, tramo.prioridad]).filter(([, prioridad]) => Boolean(prioridad))
      ),
    [prioridades]
  );

  const departamentos = useMemo(
    () =>
      [...new Set(caminos.map((camino) => camino.departamento).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, 'es')
      ),
    [caminos]
  );

  const conteosPoi = useMemo(() => {
    const conteos = Object.fromEntries(ORDEN_CATEGORIAS_POI.map((clave) => [clave, 0]));
    puntos.forEach((punto) => {
      if (conteos[punto.categoria] !== undefined) conteos[punto.categoria] += 1;
    });
    return conteos;
  }, [puntos]);

  const tramosVisibles = useMemo(() => {
    const busqueda = normalizarTexto(filtros.busqueda);

    return tramos.filter((tramo) => {
      if (filtros.estado && tramo.estado !== filtros.estado) return false;
      if (filtros.tipo && tramo.tipo !== filtros.tipo) return false;
      if (filtros.departamento && tramo.camino.departamento !== filtros.departamento) return false;

      if (busqueda) {
        const texto = normalizarTexto(
          `${tramo.camino.nombre} ${tramo.camino.localidad} ${tramo.camino.departamento}`
        );
        if (!texto.includes(busqueda)) return false;
      }

      return true;
    });
  }, [tramos, filtros]);

  const tramoSeleccionado = useMemo(
    () => tramos.find((tramo) => tramo.id === tramoSeleccionadoId) ?? null,
    [tramos, tramoSeleccionadoId]
  );

  const tramoDivision = useMemo(
    () => tramos.find((tramo) => tramo.id === tramoDivisionId) ?? null,
    [tramos, tramoDivisionId]
  );

  const cambiarFiltro = (campo, valor) => {
    setFiltros((actual) => ({ ...actual, [campo]: valor }));
  };

  const limpiarFiltros = () => {
    setFiltros((actual) => ({
      ...actual,
      estado: '',
      tipo: '',
      departamento: '',
      busqueda: '',
    }));
  };

  const alternarPunto = (categoria) => {
    setPuntosVisibles((actual) => ({ ...actual, [categoria]: !actual[categoria] }));
  };

  const filtrosActivos = [filtros.estado, filtros.tipo, filtros.departamento, filtros.busqueda].filter(
    Boolean
  ).length;

  /* ---------- Herramientas de edición ---------- */

  const limpiarHerramienta = () => {
    setHerramienta('');
    setDibujo([]);
    setBorradorTramo(null);
    setTramoDivisionId(null);
  };

  const abrirNuevoCamino = () => setModalCamino({});

  const guardarCamino = async (camino, texto) => {
    const esNuevo = !modalCamino?.camino;
    setModalCamino(null);
    await cargar({ silencioso: true });
    setMensaje(texto || 'Camino guardado correctamente.');

    if (esNuevo && camino?.id) {
      setModalTramo({ caminoIdInicial: camino.id });
    }
  };

  const abrirDibujarTramo = () => {
    if (caminos.length === 0) {
      setMensaje('Primero creá un camino para poder dibujar sus tramos.');
      return;
    }

    setModalTramo({ caminoIdInicial: tramoSeleccionado?.caminoId });
  };

  const abrirListaCaminos = () => setModalLista(true);

  const editarCaminoDesdeLista = (camino) => {
    setModalLista(false);
    setModalCamino({ camino });
  };

  const dibujarTramoDesdeLista = (camino) => {
    setModalLista(false);
    setModalTramo({ caminoIdInicial: camino.id });
  };

  const eliminarCaminoDesdeLista = async (camino) => {
    const confirmado = window.confirm(
      `¿Eliminar el camino "${camino.nombre}" con todos sus tramos, fotos e historial? Esta acción no se puede deshacer.`
    );

    if (!confirmado) return null;

    await eliminarCamino(camino.id);

    if (camino.id === tramoSeleccionado?.caminoId) {
      setTramoSeleccionadoId(null);
      setHerramienta('');
    }

    await cargar({ silencioso: true });
    setMensaje('Camino eliminado correctamente.');
    return 'Camino eliminado correctamente.';
  };

  const comenzarDibujo = (borrador) => {
    const camino = caminos.find((item) => item.id === borrador.caminoId);

    setModalTramo(null);
    setTramoSeleccionadoId(null);
    setBorradorTramo({ ...borrador, caminoNombre: camino?.nombre ?? 'Camino' });
    setDibujo([]);
    setHerramienta('dibujar');
  };

  const terminarDibujo = async () => {
    if (!borradorTramo || dibujo.length < 2) return;

    try {
      const respuesta = await crearTramo({
        caminoId: borradorTramo.caminoId,
        geometria: aGeometriaLineString(dibujo),
        estado: borradorTramo.estado,
        tipo: borradorTramo.tipo,
        ...(borradorTramo.observaciones ? { observaciones: borradorTramo.observaciones } : {}),
      });

      const nuevoId = respuesta?.datos?.id;
      limpiarHerramienta();
      await cargar({ silencioso: true });
      setMensaje(respuesta?.mensaje || 'Tramo creado correctamente.');
      if (nuevoId) setTramoSeleccionadoId(nuevoId);
    } catch (err) {
      setMensaje(err?.message || 'No se pudo crear el tramo.');
    }
  };

  const iniciarPunto = () => {
    setTramoSeleccionadoId(null);
    setBorradorTramo(null);
    setDibujo([]);
    setHerramienta('punto');
  };

  const iniciarDivision = (tramo) => {
    setTramoSeleccionadoId(tramo.id);
    setTramoDivisionId(tramo.id);
    setDibujo([]);
    setHerramienta('dividir');
  };

  const confirmarDivision = async (datos) => {
    if (!tramoDivision) return;

    try {
      const respuesta = await dividirTramo(tramoDivision.id, {
        desde: [datos.desde[1], datos.desde[0]],
        hasta: [datos.hasta[1], datos.hasta[0]],
        ...(datos.estado ? { estado: datos.estado } : {}),
        ...(datos.tipo ? { tipo: datos.tipo } : {}),
        ...(datos.observaciones ? { observaciones: datos.observaciones } : {}),
      });

      limpiarHerramienta();
      setTramoSeleccionadoId(null);
      await cargar({ silencioso: true });
      setMensaje(respuesta?.mensaje || 'Tramo dividido correctamente.');
    } catch (err) {
      setMensaje(err?.message || 'No se pudo dividir el tramo.');
    }
  };

  const alHacerClicMapa = (latlng) => {
    const posicion = [latlng.lat, latlng.lng];

    if (herramienta === 'punto') {
      setHerramienta('');
      setModalPunto({ coordenada: { lat: latlng.lat, lng: latlng.lng } });
      return;
    }

    if (herramienta === 'dibujar') {
      setDibujo((actual) => [...actual, posicion]);
      return;
    }

    if (herramienta === 'dividir' && tramoDivision) {
      setDibujo((actual) => {
        if (actual.length >= 2) return actual;
        const ajustado = puntoMasCercanoEnLinea(
          tramoDivision.geometria?.coordinates ?? [],
          posicion
        );
        return [...actual, ajustado];
      });
    }
  };

  const editarPunto = (punto) => setModalPunto({ punto });

  const guardarPunto = async (punto, texto) => {
    setModalPunto(null);
    await cargar({ silencioso: true });
    setMensaje(texto || 'Punto de interés guardado correctamente.');
  };

  const borrarPunto = async (punto) => {
    const confirmado = window.confirm(`¿Eliminar el punto de interés "${punto.nombre}"?`);
    if (!confirmado) return;

    try {
      await eliminarPuntoInteres(punto.id);
      await cargar({ silencioso: true });
      setMensaje('Punto de interés eliminado correctamente.');
    } catch (err) {
      setMensaje(err?.message || 'No se pudo eliminar el punto de interés.');
    }
  };

  const editarTramo = (tramo) => {
    setTramoSeleccionadoId(tramo.id);
    setHerramienta('');
    setDibujo([]);
  };

  const mostrarPanelTramo =
    Boolean(tramoSeleccionado) && !['dividir', 'dibujar', 'punto'].includes(herramienta);

  return (
    <div className="flex h-full flex-col bg-arena-50 dark:bg-slate-950">
      <header className="flex flex-col gap-3 px-4 pb-4 pt-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 ring-1 ring-cyan-100 dark:bg-cyan-950/40 dark:text-cyan-300 dark:ring-cyan-900/60">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6" aria-hidden="true">
              <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z" strokeLinejoin="round" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
              Mapa de Caminos Rurales
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
              {cargando
                ? 'Cargando caminos…'
                : `${tramosVisibles.length} de ${tramos.length} tramos visibles`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={cargar} disabled={cargando} className="boton-suave">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
              <path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Actualizar
          </button>
          <button
            type="button"
            onClick={() => setPanelAbierto(true)}
            aria-expanded={panelAbierto}
            aria-controls="panel-filtros"
            className="boton-suave lg:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
              <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
            </svg>
            Filtros
            {filtrosActivos > 0 ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-600 px-1 text-[10px] font-bold text-white">
                {filtrosActivos}
              </span>
            ) : null}
          </button>
          {esEditor ? (
            <button type="button" onClick={abrirNuevoCamino} className="boton-primario w-full sm:w-auto">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              Nuevo camino
            </button>
          ) : null}
        </div>
      </header>

      <div className="relative min-h-0 flex-1 px-4 pb-4 sm:px-6 lg:px-8 lg:pb-6">
        <div className="relative h-full min-h-[26rem] overflow-hidden rounded-xl border border-gray-200 bg-[#e8f1ea] shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <Mapa
            tramos={tramosVisibles}
            puntos={puntos}
            colorearPor={filtros.colorearPor}
            puntosVisibles={puntosVisibles}
            prioridades={prioridadesPorTramo}
            tramoDestacadoId={tramoDestacadoId}
            tramoSeleccionadoId={tramoSeleccionadoId}
            edicion={esEditor ? { herramienta, dibujo, onClickMapa: alHacerClicMapa } : null}
            onEditarTramo={esEditor ? editarTramo : undefined}
            onEditarPunto={esEditor ? editarPunto : undefined}
            onEliminarPunto={esEditor ? borrarPunto : undefined}
          />

          {!cargando && !error ? (
            <>
              {mensaje ? (
            <div className="pointer-events-none absolute inset-x-0 top-3 z-[1070] flex justify-center px-16">
              <p
                className="pointer-events-auto max-w-md rounded-xl border border-cyan-200 bg-white/95 px-3.5 py-2 text-center text-xs font-medium text-cyan-900 shadow-lg backdrop-blur dark:border-cyan-800 dark:bg-slate-900/95 dark:text-cyan-100"
                role="status"
              >
                {mensaje}
              </p>
            </div>
          ) : null}

          {esEditor ? (
            <BarraEditor
              onNuevoCamino={abrirNuevoCamino}
              onDibujarTramo={abrirDibujarTramo}
              onNuevoPunto={iniciarPunto}
              onAdministrarCaminos={abrirListaCaminos}
              activo={
                modalLista
                  ? 'lista'
                  : modalTramo
                    ? 'tramo'
                    : herramienta === 'punto'
                      ? 'punto'
                      : modalCamino
                        ? 'camino'
                        : ''
              }
              deshabilitado={Boolean(herramienta)}
            />
          ) : null}

          {panelAbierto ? (
            <button
              type="button"
              onClick={() => setPanelAbierto(false)}
              className="absolute inset-0 z-[1050] bg-stone-950/35 backdrop-blur-[1px] lg:hidden"
              aria-label="Cerrar filtros"
            />
          ) : null}

          <PanelFiltros
            filtros={filtros}
            onCambiar={cambiarFiltro}
            departamentos={departamentos}
            totalTramos={tramos.length}
            tramosVisibles={tramosVisibles.length}
            puntosVisibles={puntosVisibles}
            conteosPoi={conteosPoi}
            onAlternarPunto={alternarPunto}
            abierto={panelAbierto}
            onCerrar={() => setPanelAbierto(false)}
            onLimpiar={limpiarFiltros}
          />

          <Leyenda colorearPor={filtros.colorearPor} />

          {tramos.length > 0 && tramosVisibles.length === 0 ? (
            <div className="pointer-events-none absolute inset-x-4 top-20 z-[1030] flex justify-center">
              <p className="tarjeta px-4 py-2.5 text-center text-xs font-medium text-stone-600 dark:text-stone-300">
                No hay tramos que coincidan con los filtros seleccionados.
              </p>
            </div>
          ) : null}

          {tramos.length === 0 ? (
            <div className="pointer-events-none absolute inset-x-4 top-20 z-[1030] flex justify-center">
              <p className="tarjeta px-4 py-2.5 text-center text-xs font-medium text-stone-600 dark:text-stone-300">
                Todavía no hay caminos cargados. Los tramos aparecerán acá cuando se den de alta.
              </p>
            </div>
          ) : null}
        </>
      ) : null}

      {herramienta ? (
        <PanelHerramienta
          key={`${herramienta}-${tramoDivisionId ?? 'dibujo'}`}
          modo={herramienta}
          dibujo={dibujo}
          tramo={tramoDivision}
          borrador={borradorTramo}
          onDeshacer={() => setDibujo((actual) => actual.slice(0, -1))}
          onTerminar={terminarDibujo}
          onCancelar={limpiarHerramienta}
          onReiniciar={() => setDibujo([])}
          onConfirmarDivision={confirmarDivision}
        />
      ) : null}

      {mostrarPanelTramo ? (
        <PanelTramo
          key={tramoSeleccionado.id}
          tramo={tramoSeleccionado}
          onCerrar={() => setTramoSeleccionadoId(null)}
          onEditarCamino={() => setModalCamino({ camino: tramoSeleccionado.camino })}
          onIniciarDivision={iniciarDivision}
          onRecargar={() => cargar({ silencioso: true })}
          onMensaje={setMensaje}
        />
      ) : null}

      {modalCamino ? (
        <FormCamino
          camino={modalCamino.camino}
          onGuardar={guardarCamino}
          onCerrar={() => setModalCamino(null)}
        />
      ) : null}

      {modalLista ? (
        <ListaCaminos
          caminos={caminos}
          onCerrar={() => setModalLista(false)}
          onEditar={editarCaminoDesdeLista}
          onEliminar={eliminarCaminoDesdeLista}
          onDibujarTramo={dibujarTramoDesdeLista}
        />
      ) : null}

      {modalTramo ? (
        <FormTramo
          caminos={caminos}
          caminoIdInicial={modalTramo.caminoIdInicial}
          onComenzar={comenzarDibujo}
          onCerrar={() => setModalTramo(null)}
        />
      ) : null}

      {modalPunto ? (
        <FormPuntoInteres
          punto={modalPunto.punto}
          coordenada={modalPunto.coordenada}
          onGuardar={guardarPunto}
          onCerrar={() => setModalPunto(null)}
        />
      ) : null}

      {cargando ? (
        <div className="absolute inset-0 z-[1200] flex items-center justify-center bg-arena-50/70 backdrop-blur-sm dark:bg-slate-950/70">
          <div className="tarjeta flex items-center gap-3 px-5 py-4">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-600/30 border-t-cyan-600 dark:border-cyan-300/30 dark:border-t-cyan-300" />
            <span className="text-sm font-medium text-stone-700 dark:text-stone-200">Cargando mapa…</span>
          </div>
        </div>
      ) : null}

      {!cargando && error ? (
        <div className="absolute inset-0 z-[1200] flex items-center justify-center bg-arena-50/80 p-4 backdrop-blur-sm dark:bg-slate-950/80">
          <div className="tarjeta w-full max-w-sm p-5 text-center">
            <p className="text-lg font-semibold text-stone-900 dark:text-white">
              No se pudo cargar el mapa
            </p>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{error}</p>
            <button type="button" onClick={cargar} className="boton-primario mt-4">
              Reintentar
            </button>
          </div>
        </div>
      ) : null}
        </div>
      </div>
    </div>
  );
}
