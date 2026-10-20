# Caminos Rurales SDE — Reglas del proyecto (AGENTS.md)

Sistema de Información Provincial, Módulo Vialidad (Fase 1). Apoya la toma de decisiones sobre los caminos rurales de Santiago del Estero.
Todo el texto de la interfaz, mensajes de error, comentarios de negocio y documentación va en **español**.

## Stack (no cambiar)

- Monorepo con **pnpm workspaces + Turborepo**.
- `apps/web`: **Next.js 14 (App Router) + TypeScript + React 18**, Tailwind CSS, Leaflet, TanStack Query, Zustand, Auth.js.
- `apps/api`: **Node.js 22 + Express 4 + TypeScript** (ES Modules), zod, Pino, Sentry opcional.
- `packages/db`: **PostgreSQL + PostGIS** con **Prisma** (multi-schema `core` / `vialidad`).
- `packages/shared`: enums, esquemas zod y DTO compartidos entre API y web.
- Despliegue: base en **Neon**, API en **Render**, web en **Vercel**.
- Auth: **Auth.js** en la web + **JWT HS256 compartido** (`JWT_SHARED_SECRET`) + bcrypt.
- Librerías geográficas de apoyo en la app: `@turf/turf` (mediciones en cliente), `@ngageoint/geopackage`, `@tmcw/togeojson` y `proj4` (importaciones).

## Reglas de trabajo

1. Trabajá **una etapa a la vez**. No implementes cosas de etapas futuras.
2. Antes de terminar una etapa:
   - la API debe compilar (`pnpm --filter @sde/api build`);
   - la web debe compilar (`pnpm --filter @sde/web build`);
   - el typecheck completo debe pasar (`pnpm typecheck`);
   - los tests unitarios deben pasar (`pnpm test`).
3. La **tabla de endpoints de `README.md` es la fuente de verdad**. Si agregás o cambiás un endpoint, actualizá el README en el mismo paso.
4. No inventes endpoints ni campos que no estén en el README o en `packages/db/prisma/schema.prisma`.
5. Variables sensibles solo en `.env` (incluir `.env.example` sin secretos). Nunca commitear `.env`.
6. Código simple y legible. Sin sobre-ingeniería. Un archivo por responsabilidad.
7. Coordenadas siempre en formato GeoJSON: `[longitud, latitud]` (EPSG:4326). Leaflet usa `[lat, lng]`: convertir solo en la capa de mapa.
8. Las geometrías se leen y escriben con SQL parametrizado y funciones PostGIS. No intentes usar el cliente Prisma para columnas `Unsupported`.

## Estructura

```text
apps/
  api/                  API REST (Express + TypeScript)
    src/modules/        Controladores por recurso
    src/routes/         Rutas, permisos y validación
    src/services/       Reglas de negocio
    src/repositories/   SQL PostGIS
    src/core/           Errores, contexto, auditoría, geo
    src/middleware/     Auth, permisos, validación, rate limit
  web/                  Web pública y app de carga (Next.js)
    src/app/            Rutas del App Router
    src/components/     UI, mapa, formularios, administración
    src/lib/            Cliente API, sesión, stores, offline
packages/
  db/                   Prisma, migraciones, seed, importador
  shared/               Enums, zod, DTO
docs/adr/               Decisiones de arquitectura
```

## Comandos

```bash
pnpm install                 # instalar todo el monorepo
pnpm dev                     # API en :3001 y web en :3000
pnpm build                   # build de todos los paquetes
pnpm typecheck               # TypeScript en todo el monorepo
pnpm test                    # tests unitarios
pnpm db:generate             # generar cliente Prisma
pnpm db:migrate              # aplicar migraciones en desarrollo
pnpm db:seed                 # catálogos, admin y datos demo
pnpm db:deploy               # migraciones en producción
```

## Dominio

- **Camino**: nombre, localidad, departamento, descripción, fotos, activo. Tiene varios **Tramos**. La geometría maestra del camino se recalcula a partir de sus tramos cuando es posible.
- **Tramo**: geometría `LineString` GeoJSON, `longitudKm` calculada en PostGIS, `estado`, observaciones.
  - `estado`: `TRANSITABLE` (verde), `REGULAR` (amarillo), `INTRANSITABLE` (rojo), `EN_OBRA` (azul).
  - **Tipo de vía**: `RUTA`, `CAMINO_RURAL`, `CALLE` (catálogo editable por ADMIN).
  - El mapa puede colorear por estado o por tipo de vía. Al colorear por tipo, el estado se distingue con estilo de línea.
  - Un `MultiLineString` importado se separa en varios tramos **sin unirlos**.
- **Mantenimiento**: tipo `PREVENTIVO` / `CORRECTIVO` / `MEJORA` / `OTRO`, fecha, costo, descripción, usuario.
- **PuntoInteres**: nombre, categoría, ubicación. Las categorías base son `HOSPITAL`, `ESCUELA` y `UPA` (protegidas); los editores pueden crear categorías propias (nombre, color, inicial, peso y orden) y eliminarlas si no tienen puntos asociados.
- **Infraestructura**: alcantarilla, puente o tapa, con geometría puntual y vínculo opcional a un camino.
- **Prioridad**: puntaje de 0 a 100 por tramo calculado en PostGIS. Sube con peor estado, tipo de vía rural y cercanía a puntos de interés ponderados.
- **HistorialTramo**: cada cambio de estado o geometría guarda fecha, usuario y valores anteriores.
- **Foto**: asociada a un camino (y opcionalmente a un tramo o mantenimiento), guardada en Cloudinary; en la BD solo la URL.
- **Sugerencia**: enviada por ciudadanos sin login, con estado `PENDIENTE`, `REVISADA`, `DESCARTADA`.
- **Auditoria**: quién, qué acción, sobre qué entidad, detalle, IP y cuándo.
- **OperacionSync**: registro idempotente de operaciones offline procesadas.

## Roles y permisos

| Rol | Permisos |
|---|---|
| Público (sin login) | Ver mapa, caminos, tramos, puntos de interés, infraestructura y reportes. Enviar sugerencias. |
| EDITOR | Todo lo público + crear/editar/borrar caminos, tramos, puntos de interés e infraestructura; registrar mantenimientos; subir fotos; revisar sugerencias. |
| ADMIN | Todo lo del editor + crear/desactivar usuarios editores, administrar catálogos/capas/departamentos y ver la auditoría. |

Los permisos finos del EDITOR se validan por **capa**: `CAMINOS`, `TRAMOS`, `MANTENIMIENTOS`, `INFRAESTRUCTURA`, `PUNTOS_INTERES`, `FOTOS`, `SUGERENCIAS`.

## UI

- Responsive (móvil primero), tema claro/oscuro.
- Mapa a pantalla completa con panel de filtros (estado, tipo de vía, departamento, búsqueda por nombre) y leyenda de colores.
- Capas base: OpenStreetMap y satélite. Puntos de interés e infraestructura agrupados con clusters.
- App de carga (`/carga`): dibujo de caminos, GPS, medición, edición de estado, división/fusión de tramos, mantenimientos, fotos y cola offline con sincronización.
- Sin geolocalización automática del usuario público por ahora.
