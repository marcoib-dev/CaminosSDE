# Caminos Rurales SDE — Reglas del proyecto (AGENTS.md)

Sistema web de apoyo a la toma de decisiones sobre caminos rurales de Santiago del Estero.
Todo el texto de la interfaz, mensajes de error y comentarios de negocio va en **español**.

## Stack (no cambiar)
- Monorepo con dos carpetas: `backend/` y `frontend/` (proyectos independientes).
- Frontend: React 18 + Vite + React Router + Tailwind CSS + Leaflet/React-Leaflet. JavaScript (sin TypeScript).
- Backend: Node.js 18+ + Express. JavaScript con ES Modules.
- Base de datos: PostgreSQL con **Prisma** (sin PostGIS). Geometrías guardadas como **GeoJSON en columnas `Json`**.
- Despliegue: BD en Neon, backend en Render, frontend en Vercel.
- Auth: JWT + bcrypt. Validación con zod.
- Librerías geográficas: `@turf/turf` (longitud, distancias), `@ngageoint/geopackage` (leer .gpkg), `@tmcw/togeojson` (leer .kml).

## Reglas de trabajo
1. Trabajá **una etapa a la vez**. No implementes cosas de etapas futuras.
2. Antes de terminar una etapa: el backend debe arrancar, `npx prisma migrate dev` debe funcionar y el frontend debe compilar (`npm run build`).
3. Mantené `README.md` actualizado: la **tabla de endpoints** (método, ruta, rol requerido, body, respuesta) es la fuente de verdad. Si agregás o cambiás un endpoint, actualizá el README en el mismo paso.
4. No inventes endpoints ni campos que no estén en el README o en `schema.prisma`.
5. Variables sensibles solo en `.env` (incluir `.env.example` sin secretos). Nunca commitear `.env`.
6. Código simple y legible. Sin sobre-ingeniería. Un archivo por responsabilidad.
7. Coordenadas siempre en formato GeoJSON: `[longitud, latitud]` (EPSG:4326). Leaflet usa `[lat, lng]`: convertir solo en la capa de mapa.

## Dominio
- **Camino**: nombre, localidad, departamento, descripción, fotos, activo. Tiene varios **Tramos**.
- **Tramo**: geometría (LineString GeoJSON), longitudKm (calculada con turf), `estado`, `tipo`, observaciones.
  - `estado`: `TRANSITABLE` (verde), `REGULAR` (amarillo), `INTRANSITABLE` (rojo), `EN_OBRA` (azul).
  - `tipo`: `TIERRA`, `RIPIO`, `ENRIPIADO_MEJORADO`, `PAVIMENTADO`.
  - El mapa puede colorear por estado o por tipo (selector "Colorear por"). Al colorear por estado, el tipo se distingue con estilo de línea (punteada, etc.).
  - Un `MultiLineString` importado se separa en varios tramos **sin unirlos**.
- **PuntoInteres**: nombre, categoría, ubicación (lat/lng). Las categorías base son `HOSPITAL`, `ESCUELA` y `UPA`; los editores pueden crear categorías propias (nombre, color y peso de prioridad) y eliminarlas si no tienen puntos asociados.
- **Prioridad**: puntaje de 0 a 100 por tramo, calculado en el backend. Sube con peor estado, peor tipo de superficie y cercanía a puntos de interés (ver etapa 2).
- **HistorialTramo**: cada cambio de estado/tipo/geometría guarda fecha, usuario y valores anteriores.
- **Foto**: asociada a un camino (o tramo), guardada en un servicio externo (Cloudinary); en la BD solo la URL.
- **Sugerencia**: enviada por ciudadanos sin login (camino/tramo, texto, contacto opcional), con estado `PENDIENTE`, `REVISADA`, `DESCARTADA`.
- **Auditoria**: quién, qué acción, sobre qué entidad y cuándo.

## Roles
| Rol | Permisos |
|---|---|
| Lector (sin login) | Ver mapa, caminos, tramos y puntos de interés. Enviar sugerencias. |
| EDITOR | Todo lo del lector + crear, editar, borrar caminos/tramos/puntos de interés, importar archivos, subir fotos, revisar sugerencias. |
| ADMIN | Todo lo del editor + crear/desactivar usuarios editores y ver la auditoría. |

## UI
- Responsive (móvil primero), tema claro/oscuro, mapa a pantalla completa con panel de filtros (estado, tipo, departamento, búsqueda por nombre) y leyenda de colores.
- Sin geolocalización del usuario por ahora.
