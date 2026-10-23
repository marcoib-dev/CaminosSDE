import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Polyline, Popup, TileLayer, ZoomControl, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { ESTADOS, TIPOS } from '../constants/dominio.js';
import { BORDE_TRAMO, GROSOR_BORDE_TRAMO } from '../constants/estilosMapa.js';
import { useTema } from '../context/TemaContext.jsx';
import CapaEditor from './editor/CapaEditor.jsx';
import PopupTramo from './PopupTramo.jsx';

const CENTRO_INICIAL = [-28.3, -63.5];
const ZOOM_INICIAL = 8;

const ATRIBUCION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';

function crearIconoPoi(categoria) {
  const claseCategoria = `marcador-poi--${categoria.clave.toLowerCase()}`;
  return L.divIcon({
    className: 'marcador-poi-contenedor',
    html: `<span class="marcador-poi ${claseCategoria}" style="background-color:${categoria.color}" aria-hidden="true">${categoria.inicial}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -14],
  });
}

/**
 * Agrupa los puntos cercanos en un círculo con la cantidad. El tamaño crece
 * con el número de puntos para que los conjuntos grandes se lean mejor.
 */
function crearIconoCluster(cluster) {
  const cantidad = cluster.getChildCount();
  const tamano = cantidad < 10 ? 34 : cantidad < 100 ? 42 : 50;

  return L.divIcon({
    className: 'cluster-poi-contenedor',
    html: `<span class="cluster-poi" title="${cantidad} puntos de interés">${cantidad}</span>`,
    iconSize: L.point(tamano, tamano),
  });
}

function patronTramo(tramo, colorearPor) {
  if (colorearPor !== 'estado') return undefined;
  return TIPOS[tramo.tipo]?.dashArray ?? undefined;
}

function estiloTramo(tramo, colorearPor, seleccionado) {
  const dashArray = patronTramo(tramo, colorearPor);
  const color =
    colorearPor === 'tipo'
      ? TIPOS[tramo.tipo]?.color
      : ESTADOS[tramo.estado]?.color;

  return {
    color: color ?? '#57534e',
    weight: seleccionado ? 8 : 5,
    opacity: 1,
    dashArray,
    lineCap: dashArray ? 'butt' : 'round',
    lineJoin: 'round',
  };
}

function estiloBorde(tramo, colorearPor, seleccionado, esOscuro) {
  const dashArray = patronTramo(tramo, colorearPor);

  return {
    color: esOscuro ? BORDE_TRAMO.temaOscuro : BORDE_TRAMO.temaClaro,
    weight: (seleccionado ? 8 : 5) + GROSOR_BORDE_TRAMO,
    opacity: esOscuro ? 0.62 : 0.55,
    dashArray,
    lineCap: 'round',
    lineJoin: 'round',
  };
}

function AjustarVista({ tramos, tramoDestacadoId, capasRef }) {
  const mapa = useMap();
  const ajusteInicialHecho = useRef(false);
  const tramoEnfocado = useRef(null);

  useEffect(() => {
    if (ajusteInicialHecho.current || tramos.length === 0) return;

    const puntos = tramos.flatMap((tramo) =>
      (tramo.geometria?.coordinates ?? []).map(([longitud, latitud]) => [latitud, longitud])
    );

    if (puntos.length > 0) {
      mapa.fitBounds(L.latLngBounds(puntos), { padding: [42, 42], maxZoom: 12 });
    }

    ajusteInicialHecho.current = true;
  }, [tramos, mapa]);

  useEffect(() => {
    if (!tramoDestacadoId || tramoEnfocado.current === tramoDestacadoId) return;

    const capa = capasRef.current[tramoDestacadoId];
    if (!capa) return;

    tramoEnfocado.current = tramoDestacadoId;

    if (typeof capa.getBounds === 'function') {
      mapa.flyToBounds(capa.getBounds(), {
        padding: [60, 60],
        maxZoom: 15,
        duration: 0.9,
      });
    } else if (typeof capa.getLatLng === 'function') {
      mapa.flyTo(capa.getLatLng(), 15, { duration: 0.9 });
    }

    let temporizador;
    const abrirPopup = () => {
      window.clearTimeout(temporizador);
      capa.openPopup();
    };

    mapa.once('moveend', abrirPopup);
    temporizador = window.setTimeout(abrirPopup, 1200);

    return () => {
      window.clearTimeout(temporizador);
      mapa.off('moveend', abrirPopup);
    };
  }, [tramoDestacadoId, tramos, capasRef, mapa]);

  useEffect(() => {
    const contenedor = mapa.getContainer();
    const observador = new ResizeObserver(() => mapa.invalidateSize());
    observador.observe(contenedor);
    return () => observador.disconnect();
  }, [mapa]);

  return null;
}

export default function Mapa({
  tramos,
  puntos,
  colorearPor,
  puntosVisibles,
  categoriasPorClave,
  prioridades,
  tramoDestacadoId,
  tramoSeleccionadoId,
  edicion,
  onEditarTramo,
  onEditarPunto,
  onEliminarPunto,
}) {
  const capasRef = useRef({});
  const { esOscuro } = useTema();
  const iconos = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(categoriasPorClave).map(([clave, categoria]) => [
          clave,
          crearIconoPoi(categoria),
        ])
      ),
    [categoriasPorClave]
  );
  const tramosDibujables = useMemo(
    () =>
      tramos
        .map((tramo) => ({
          tramo,
          posiciones: (tramo.geometria?.coordinates ?? []).map(([longitud, latitud]) => [
            latitud,
            longitud,
          ]),
        }))
        .filter(({ posiciones }) => posiciones.length >= 2),
    [tramos]
  );

  const editando = Boolean(edicion?.herramienta);

  return (
    <MapContainer
      center={CENTRO_INICIAL}
      zoom={ZOOM_INICIAL}
      minZoom={5}
      maxZoom={18}
      zoomControl={false}
      className={`h-full w-full${editando ? ' mapa-editando' : ''}`}
      scrollWheelZoom
      worldCopyJump
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution={ATRIBUCION}
        maxZoom={19}
      />

      <ZoomControl position="bottomright" />

      {/* Todos los bordes van debajo de todas las líneas para no tapar los cruces. */}
      {tramosDibujables.map(({ tramo, posiciones }) => (
        <Polyline
          key={`borde-${tramo.id}`}
          positions={posiciones}
          pathOptions={estiloBorde(
            tramo,
            colorearPor,
            tramo.id === tramoSeleccionadoId,
            esOscuro
          )}
          interactive={false}
        />
      ))}

      {tramosDibujables.map(({ tramo, posiciones }) => (
        <Polyline
          key={tramo.id}
          positions={posiciones}
          pathOptions={estiloTramo(tramo, colorearPor, tramo.id === tramoSeleccionadoId)}
          interactive={!editando}
          ref={(capa) => {
            if (capa) {
              capasRef.current[tramo.id] = capa;
            } else {
              delete capasRef.current[tramo.id];
            }
          }}
        >
          <Popup maxWidth={340} minWidth={280} autoPanPadding={[26, 26]} className="popup-tramo-contenedor">
            <PopupTramo
              tramo={tramo}
              prioridad={prioridades[tramo.id]}
              onEditar={onEditarTramo}
            />
          </Popup>
        </Polyline>
      ))}

      <MarkerClusterGroup
        chunkedLoading
        maxClusterRadius={60}
        showCoverageOnHover={false}
        iconCreateFunction={crearIconoCluster}
      >
        {puntos
          .filter((punto) => Boolean(puntosVisibles[punto.categoria]))
          .map((punto) => {
            const categoria = categoriasPorClave[punto.categoria];
            return (
              <Marker
                key={punto.id}
                position={[punto.latitud, punto.longitud]}
                icon={iconos[punto.categoria]}
                title={punto.nombre}
                interactive={!editando}
              >
                <Popup maxWidth={260} minWidth={200} autoPanPadding={[24, 24]}>
                  <div className="px-3 py-2.5">
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.14em]"
                      style={{ color: categoria?.color ?? '#57534e' }}
                    >
                      {categoria?.etiqueta ?? punto.categoria}
                    </p>
                    <p className="mt-0.5 font-display text-sm font-semibold leading-tight text-stone-900 dark:text-white">
                      {punto.nombre}
                    </p>
                    {onEditarPunto ? (
                      <div className="mt-2 flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEditarPunto(punto)}
                          className="rounded-lg bg-verde-700 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-verde-800 dark:bg-verde-600"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => onEliminarPunto(punto)}
                          className="rounded-lg px-2.5 py-1 text-[11px] font-semibold text-red-700 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
                        >
                          Eliminar
                        </button>
                      </div>
                    ) : null}
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MarkerClusterGroup>

      <AjustarVista tramos={tramos} tramoDestacadoId={tramoDestacadoId} capasRef={capasRef} />

      {edicion ? (
        <CapaEditor
          herramienta={edicion.herramienta}
          dibujo={edicion.dibujo ?? []}
          onClickMapa={edicion.onClickMapa}
        />
      ) : null}
    </MapContainer>
  );
}
