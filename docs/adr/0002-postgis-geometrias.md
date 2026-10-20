# ADR 0002 — PostGIS para geometrías

## Estado
Aceptado.

## Contexto
El relevamiento vial necesita consultas espaciales por bounding box, simplificación por zoom, intersección con departamentos y distancias a puntos de interés. Guardar GeoJSON en columnas `Json` obliga a cargar y procesar todo en la aplicación.

## Decisión
Usar PostgreSQL + PostGIS. Prisma declara las columnas como `Unsupported("geometry(...)")` y los repositorios acceden con SQL parametrizado (`$queryRaw` / `$executeRaw`). Las lecturas usan `ST_AsGeoJSON` y las escrituras `ST_GeomFromGeoJSON`.

## Consecuencias
- Migraciones manuales: la migración inicial crea la extensión `postgis` y los índices GiST.
- Las geometrías se mantienen en EPSG:4326; la conversión a `[lat, lng]` se hace solo en Leaflet.
- No se puede usar el cliente Prisma para leer o escribir geometrías; debe hacerse mediante los repositorios.
- El cálculo de longitud y las operaciones de división/fusión quedan en PostGIS, no en turf.
