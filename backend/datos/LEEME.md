# Establecimientos de Santiago del Estero

Carga inicial de hospitales y escuelas desde OpenStreetMap, hecha el 20/10/2026.

| Archivo | Contenido |
|---|---|
| `establecimientos-sde-osm.geojson` | Descarga cruda de Overpass API: 1878 puntos (68 hospitales y 1810 escuelas). |
| `establecimientos-sde.geojson` | Archivo depurado que se importó: 1705 puntos (66 hospitales y 1639 escuelas). |

De los 1705 puntos depurados se crearon 1666 en la base: los 39 restantes no tienen nombre en OSM y el importador los omite.

## Consulta usada

```overpass
[out:json][timeout:180];
area["name"="Santiago del Estero"]["admin_level"="4"]["boundary"="administrative"]->.sde;
(
  nwr["amenity"="hospital"](area.sde);
  nwr["healthcare"="hospital"](area.sde);
  nwr["amenity"="school"](area.sde);
);
out center;
```

`out center` devuelve el centro de los hospitales y escuelas dibujados como polígonos, así que todo queda como puntos.

## Depuración aplicada

- **Límite provincial:** se verificaron los 1878 puntos contra el polígono de la provincia del IGN (WFS `ign:provincia`). Todos quedan dentro; una escuela queda 21 m afuera por la simplificación del límite y se conservó.
- **Duplicados de OSM:** se quitaron 173 entradas repetidas en el mismo lugar con variantes del nombre, por ejemplo `Agrupamiento 86083 Escuela 662` vs `Escuela 662`, `Escuela N° 1036 "Gobernador Adolfo Ruiz"` vs `Escuela 1036 Gobernador Adolfo Ruiz`, o un nodo y un polígono con el mismo nombre.
- **Revisión manual:** se quitaron dos hospitales repetidos que no cumplían la regla anterior: `Hospital zonal Doctor Rudecindo Cazzaniga` (nodo incompleto en Fernández) y `Hospital Zonal Sumampa` (sin dirección ni código SISA). Se conservaron las fichas completas.
- **Agrupamientos:** quedan 229 establecimientos cuyo único nombre en OSM empieza con `Agrupamiento`. No se renombraron para no inventar datos.

## Cómo volver a importar

```bash
cd backend
npm run puntos:importar -- --archivo datos/establecimientos-sde.geojson
npm run puntos:importar -- --archivo datos/establecimientos-sde.geojson --aplicar
```

El importador omite los puntos que ya existen con el mismo nombre, categoría y ubicación (150 m), así que volver a ejecutarlo no duplica datos.

## Licencia

Datos de OpenStreetMap, © colaboradores de OpenStreetMap, disponibles bajo la [licencia ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/). Si se muestran en el mapa o se redistribuyen, corresponde indicar la fuente.
