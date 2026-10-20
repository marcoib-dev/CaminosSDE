import { useEffect } from 'react';
import { CircleMarker, Polyline, Tooltip, useMap, useMapEvents } from 'react-leaflet';

export default function CapaEditor({ herramienta, dibujo, onClickMapa }) {
  const mapa = useMap();

  useEffect(() => {
    const contenedor = mapa.getContainer();
    contenedor.classList.toggle('mapa-modo-edicion', Boolean(herramienta));

    if (herramienta) {
      mapa.doubleClickZoom.disable();
    } else {
      mapa.doubleClickZoom.enable();
    }

    return () => {
      contenedor.classList.remove('mapa-modo-edicion');
      mapa.doubleClickZoom.enable();
    };
  }, [herramienta, mapa]);

  useMapEvents({
    click(evento) {
      if (!herramienta) return;
      onClickMapa(evento.latlng);
    },
  });

  return (
    <>
      {dibujo.length >= 2 ? (
        <Polyline
          positions={dibujo}
          pathOptions={{
            color: '#1e553d',
            weight: 4,
            opacity: 0.95,
            dashArray: '8 6',
            lineCap: 'round',
          }}
        />
      ) : null}

      {dibujo.map((posicion, indice) => (
        <CircleMarker
          key={`${posicion[0]}-${posicion[1]}-${indice}`}
          center={posicion}
          radius={7}
          pathOptions={{
            color: '#ffffff',
            weight: 2,
            fillColor: '#1e553d',
            fillOpacity: 1,
          }}
        >
          <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
            {indice + 1}
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  );
}
