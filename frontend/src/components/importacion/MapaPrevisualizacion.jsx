import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, Polyline, TileLayer, Tooltip, ZoomControl, useMap } from 'react-leaflet';
import { ESTADOS, TIPOS } from '../../constants/dominio.js';
import { BORDE_TRAMO, GROSOR_BORDE_TRAMO } from '../../constants/estilosMapa.js';
import { useTema } from '../../context/TemaContext.jsx';

const CENTRO_INICIAL = [-28.3, -63.5];
const ZOOM_INICIAL = 8;

const ATRIBUCION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';

function AjustarVista({ features }) {
  const mapa = useMap();
  const firma = useMemo(() => features.map((feature) => feature.id).join('|'), [features]);

  useEffect(() => {
    const puntos = features.flatMap((feature) =>
      (feature.geometria?.coordinates ?? []).map(([longitud, latitud]) => [latitud, longitud])
    );

    if (puntos.length > 0) {
      mapa.fitBounds(L.latLngBounds(puntos), { padding: [32, 32], maxZoom: 14 });
    }
    // Solo se reajusta cuando cambia el conjunto de features, no en cada edición.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firma, mapa]);

  return null;
}

function estilo(feature, seleccionada) {
  if (!seleccionada) {
    return {
      color: '#a8a29e',
      weight: 3,
      opacity: 0.55,
      lineCap: 'round',
      lineJoin: 'round',
    };
  }

  return {
    color: ESTADOS[feature.estado]?.color ?? '#166534',
    weight: 6,
    opacity: 1,
    dashArray: TIPOS[feature.tipo]?.dashArray ?? undefined,
    lineCap: TIPOS[feature.tipo]?.dashArray ? 'butt' : 'round',
    lineJoin: 'round',
  };
}

function estiloBorde(feature, esOscuro) {
  return {
    color: esOscuro ? BORDE_TRAMO.temaOscuro : BORDE_TRAMO.temaClaro,
    weight: 6 + GROSOR_BORDE_TRAMO,
    opacity: esOscuro ? 0.62 : 0.55,
    dashArray: TIPOS[feature.tipo]?.dashArray ?? undefined,
    lineCap: 'round',
    lineJoin: 'round',
  };
}

export default function MapaPrevisualizacion({ features, seleccionadas, onAlternar }) {
  const { esOscuro } = useTema();
  const dibujables = useMemo(
    () =>
      features
        .map((feature) => ({
          feature,
          posiciones: (feature.geometria?.coordinates ?? []).map(([longitud, latitud]) => [
            latitud,
            longitud,
          ]),
        }))
        .filter(({ posiciones }) => posiciones.length >= 2),
    [features]
  );

  return (
    <MapContainer
      center={CENTRO_INICIAL}
      zoom={ZOOM_INICIAL}
      minZoom={5}
      maxZoom={18}
      zoomControl={false}
      className="h-full w-full"
      scrollWheelZoom
      worldCopyJump
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution={ATRIBUCION}
        maxZoom={19}
      />

      <ZoomControl position="bottomright" />

      {/* El borde solo acompaña a los tramos incluidos; los excluidos quedan atenuados. */}
      {dibujables.map(({ feature, posiciones }) =>
        seleccionadas.has(feature.id) ? (
          <Polyline
            key={`borde-${feature.id}`}
            positions={posiciones}
            pathOptions={estiloBorde(feature, esOscuro)}
            interactive={false}
          />
        ) : null
      )}

      {dibujables.map(({ feature, posiciones }) => {
        const activa = seleccionadas.has(feature.id);

        return (
          <Polyline
            key={feature.id}
            positions={posiciones}
            pathOptions={estilo(feature, activa)}
            eventHandlers={{ click: () => onAlternar(feature.id) }}
          >
            <Tooltip sticky>
              <span className="font-semibold">{feature.nombre}</span>
              <br />
              {feature.longitudKm.toLocaleString('es-AR', { maximumFractionDigits: 3 })} km
              {feature.partes > 1 ? ` · parte ${feature.parte} de ${feature.partes}` : ''}
              <br />
              <span className="text-[11px] text-stone-500">
                {activa ? 'Clic para excluir' : 'Clic para incluir'}
              </span>
            </Tooltip>
          </Polyline>
        );
      })}

      <AjustarVista features={features} />
    </MapContainer>
  );
}
