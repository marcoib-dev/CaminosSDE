# Caminos Rurales SDE — Sistema de Información Provincial, Módulo Vialidad (Fase 1)

Sistema de apoyo a la toma de decisiones sobre los caminos rurales de Santiago del Estero.
Incluye un **tablero público** de consulta y una **app de carga** para personal de Vialidad, con soporte offline.

## Arquitectura

Monorepo con pnpm workspaces y Turborepo:

```text
apps/
  api/                  API REST (Express + TypeScript, ESM)
    src/modules/        Controladores por recurso
    src/routes/         Rutas, permisos y validación
    src/services/       Reglas de negocio
    src/repositories/   Consultas SQL con PostGIS
    src/core/           Errores, contexto, auditoría, validaciones geográficas
    src/middleware/     Autenticación, permisos, validación y rate limit
    src/__tests__/      Tests unitarios (Vitest)
  web/                  Next.js 14 App Router + TypeScript
    src/app/            Rutas de la web pública, carga y administración
    src/components/     Mapa, filtros, formularios, reportes y UI
    src/lib/            Cliente API, sesión, stores, cola offline
    public/             Manifest, service worker e iconos PWA

packages/
  db/                   Prisma, migraciones PostGIS, seed e importador
  shared/               Enums, esquemas zod y DTO compartidos

docs/adr/               Decisiones de arquitectura
docker-compose.yaml     PostgreSQL 16 + PostGIS 3.4 para desarrollo
```

### Stack

| Capa | Tecnología |
|---|---|
| Web | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS |
| Mapas | Leaflet + `leaflet.markercluster`, capas OpenStreetMap y satélite |
| Estado y datos | TanStack Query, Zustand, React Hook Form + zod |
| Offline | Dexie (IndexedDB), service worker propio, cola de operaciones idempotentes |
| API | Node.js 22, Express 4, TypeScript, zod, Pino, Sentry opcional |
| Base de datos | PostgreSQL + PostGIS, Prisma multi-schema (`core` / `vialidad`) |
| Auth | Auth.js (Credentials) + JWT HS256 compartido + bcrypt |
| Fotos | Cloudinary (firma de subida desde la API) |
| Tests | Vitest |

## Requisitos

- Node.js 22 o superior.
- pnpm 10 o superior.
- PostgreSQL con PostGIS (local con Docker o Neon con la extensión habilitada).
- Docker (recomendado para desarrollo local).

## Puesta en marcha

### 1. Variables de entorno

```bash
cp .env.example .env
```

Completar como mínimo:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/caminos_rurales
JWT_SHARED_SECRET=<secreto-de-32-o-mas-caracteres>
NEXTAUTH_SECRET=<otro-secreto-de-32-o-mas-caracteres>
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001/api
FRONTEND_URL=http://localhost:3000
```

`JWT_SHARED_SECRET` y `NEXTAUTH_SECRET` deben ser distintos. Nunca commitear `.env`.

### 2. Base de datos local

```bash
docker compose up -d
```

El servicio usa `postgis/postgis:16-3.4` y expone PostgreSQL en `localhost:5432`.
La migración inicial ejecuta `CREATE EXTENSION IF NOT EXISTS postgis;`.

### 3. Instalar dependencias y preparar la base

```bash
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

El seed crea:

- usuario administrador con `ADMIN_EMAIL` / `ADMIN_PASSWORD` (por defecto `admin@ejemplo.com` / `Cambiar123!`);
- catálogos de tipos de vía, estados de tramo, capas y permisos;
- categorías base `HOSPITAL`, `ESCUELA` y `UPA`;
- los 27 departamentos de Santiago del Estero (sin geometría);
- caminos, tramos, puntos de interés e infraestructura de demostración.

Para cargar las geometrías de los departamentos desde un GeoJSON:

```bash
pnpm --filter @sde/db importar-departamentos -- --archivo ./datos/departamentos.geojson
```

### 4. Desarrollo

```bash
pnpm dev
```

- Web: <http://localhost:3000>
- API: <http://localhost:3001/api>
- Salud de la API: <http://localhost:3001/api/health>

### 5. Build y verificación

```bash
pnpm typecheck
pnpm test
pnpm build
```

## Autenticación y roles

1. La web inicia sesión con Auth.js (`/login`).
2. Auth.js valida las credenciales contra `POST /api/auth/login`.
3. La web obtiene un token de API de 15 minutos en `GET /api/token`, firmado con `JWT_SHARED_SECRET`.
4. La API valida el token y consulta el usuario en cada petición para respetar desactivaciones.
5. La API también emite refresh tokens opacos hasheados en `core.RefreshToken`.

| Rol | Permisos |
|---|---|
| Público (sin login) | Ver mapa, caminos, tramos, puntos de interés, infraestructura y reportes. Enviar sugerencias. |
| EDITOR | Todo lo público + crear/editar/borrar caminos, tramos, puntos de interés e infraestructura; registrar mantenimientos; subir fotos; revisar sugerencias. |
| ADMIN | Todo lo del editor + crear/desactivar usuarios editores, administrar catálogos/capas/departamentos y ver la auditoría. |

Los permisos del EDITOR se validan por capa: `CAMINOS`, `TRAMOS`, `MANTENIMIENTOS`, `INFRAESTRUCTURA`, `PUNTOS_INTERES`, `FOTOS` y `SUGERENCIAS`.

## Rutas de la web

| Ruta | Acceso | Descripción |
|---|---|---|
| `/` | Público | Mapa, filtros, leyenda y detalle del tramo con prioridad y fotos. |
| `/reportes` | Público | Resumen, kilómetros por estado/departamento y mantenimientos por año. |
| `/prioridades` | Público | Ranking de tramos y mapa con el desglose del puntaje. |
| `/sugerencias` | EDITOR / ADMIN | Bandeja de sugerencias ciudadanas. |
| `/carga` | EDITOR / ADMIN | App de carga y edición de caminos, tramos, puntos de interés e infraestructura, con cola offline. |
| `/importar` | EDITOR / ADMIN | Importación de GPKG, KML y GeoJSON con vista previa y confirmación. |
| `/categorias` | EDITOR / ADMIN | Alta y baja de categorías propias de puntos de interés. |
| `/admin/usuarios` | ADMIN | Alta y activación/desactivación de editores. |
| `/admin/catalogos` | ADMIN | Alta y edición de estados, tipos de vía, capas y departamentos. |
| `/admin/auditoria` | ADMIN | Consulta de la auditoría. |
| `/login` | Público | Inicio de sesión. |
| `/perfil` | Auth | Datos de la cuenta y cambio de contraseña. |

## App de carga y modo offline

La ruta `/carga` requiere sesión de EDITOR o ADMIN. Permite:

- dibujar un camino y crear su primer tramo;
- navegar, medir distancias y capturar la ubicación GPS;
- seleccionar un tramo y editar estado u observaciones;
- dividir un tramo por kilómetro de corte y fusionar tramos contiguos;
- registrar mantenimientos;
- subir fotos comprimidas a Cloudinary;
- crear, editar y eliminar puntos de interés e infraestructura;
- editar los datos generales del camino o eliminarlo;
- trabajar sin conexión y sincronizar al recuperar la red.

La cola offline vive en IndexedDB (`sde-vial-offline`) y usa un `id` de idempotencia por operación.
`POST /api/sync/batch` procesa hasta 500 operaciones y registra el resultado en `core.OperacionSync`.

Operaciones soportadas:

- `CREAR_CAMINO` (con primer tramo opcional)
- `CREAR_TRAMO`
- `EDITAR_TRAMO`
- `DIVIDIR_TRAMO`
- `FUSIONAR_TRAMO`
- `CREAR_MANTENIMIENTO`
- `CREAR_PUNTO_INTERES`
- `SUBIR_FOTO`

Las fotos y los borrados requieren conexión. La sincronización se dispara al iniciar sesión, al recuperar conexión y cada 30 segundos.

## API

Prefijo: `/api`.

Formato general:

- éxito: `{ "datos": ... }`;
- creación: `{ "datos": ..., "mensaje": "..." }`;
- borrado: `{ "mensaje": "..." }`;
- error: `{ "mensaje": "...", "detalles"?: ... }`.

Excepciones: `GET /health` responde `{ "estado": "ok" }` y `GET /auditoria` responde `{ "datos": [...], "total": n }`.

Roles: **Público** = sin login; **Auth** = cualquier usuario autenticado; **EDITOR** = capa/permiso indicado; **ADMIN** = rol administrador.

### Salud y autenticación

| Método | Ruta | Rol | Body | Respuesta |
|---|---|---|---|---|
| GET | `/health` | Público | — | `{estado, fecha}` o 503 |
| POST | `/auth/login` | Público | `{email, password}` | `{datos:{token, refreshToken, usuario}}` |
| POST | `/auth/refresh` | Público | `{refreshToken}` | `{datos:{token, refreshToken, usuario}}` |
| GET | `/auth/me` | Auth | — | `{datos: usuario}` |
| POST | `/auth/change-password` | Auth | `{passwordActual, passwordNueva}` | `{mensaje}` |

### Usuarios (solo ADMIN)

| Método | Ruta | Rol | Body | Respuesta |
|---|---|---|---|---|
| GET | `/usuarios` | ADMIN | — | `{datos: Usuario[]}` |
| POST | `/usuarios` | ADMIN | `{nombre, email, password, rol?}` | `{datos: Usuario, mensaje}` |
| PATCH | `/usuarios/:id/estado` | ADMIN | `{activo: boolean}` | `{datos: Usuario}` |

El alta fuerza el rol `EDITOR`. No se puede desactivar a un ADMIN.

### Catálogos, capas y departamentos

| Método | Ruta | Rol | Body | Respuesta |
|---|---|---|---|---|
| GET | `/catalogos/tipos-via` | Público | — | `{datos: TipoVia[]}` |
| GET | `/catalogos/estados-tramo` | Público | — | `{datos: EstadoTramo[]}` |
| POST | `/catalogos/tipos-via` | ADMIN | `{nombre, descripcion?, orden?}` | `{datos: TipoVia, mensaje}` |
| PATCH | `/catalogos/tipos-via/:id` | ADMIN | `{nombre?, descripcion?, orden?, activo?}` | `{datos: TipoVia}` |
| POST | `/catalogos/estados-tramo` | ADMIN | `{nombre, colorHex, orden?}` | `{datos: EstadoTramo, mensaje}` |
| PATCH | `/catalogos/estados-tramo/:id` | ADMIN | `{nombre?, colorHex?, orden?, activo?}` | `{datos: EstadoTramo}` |
| GET | `/capas` | Público | — | `{datos: Capa[]}` |
| GET | `/capas/permitidas` | Auth | — | `{datos: CapaConPermisos[]}` |
| POST | `/capas` | ADMIN | `{clave, nombre, organismo, activa?}` | `{datos: Capa, mensaje}` |
| PATCH | `/capas/:id` | ADMIN | `{nombre?, organismo?, activa?}` | `{datos: Capa}` |
| GET | `/departamentos` | Público | — | `{datos: Departamento[]}` |
| POST | `/departamentos` | ADMIN | `{nombre, codigoIndec?, geom?}` | `{datos: Departamento, mensaje}` |
| PATCH | `/departamentos/:id` | ADMIN | `{nombre?, codigoIndec?, geom?}` | `{datos: Departamento}` |

### Caminos y tramos

| Método | Ruta | Rol | Body / Query | Respuesta |
|---|---|---|---|---|
| GET | `/caminos` | Público | Query: `bbox, departamentoId, tipoViaId, q, activo, zoom` | `FeatureCollection` |
| GET | `/caminos/:id` | Público | — | `{datos: Camino + tramos + fotos}` |
| GET | `/caminos/:caminoId/tramos` | Público | — | `FeatureCollection` |
| POST | `/caminos` | EDITOR `CAMINOS:crear` | `{nombre, localidad, tipoViaId, departamentoId?, descripcion?, activo?, geom}` | `{datos: Camino, mensaje}` |
| PATCH | `/caminos/:id` | EDITOR `CAMINOS:editar` | Campos parciales del camino | `{datos: Camino}` |
| DELETE | `/caminos/:id` | EDITOR `CAMINOS:borrar` | — | `{mensaje}` |
| POST | `/caminos/:caminoId/tramos` | EDITOR `TRAMOS:crear` | `{geometria, estadoId?, observaciones?}` | `{datos: Tramo, mensaje}` |
| GET | `/tramos` | Público | Query: `bbox, caminoId, estadoId, tipoViaId, departamentoId, q, zoom` | `FeatureCollection` |
| GET | `/tramos/prioridad` | Público | Query: `limite?` | `{datos: Ranking[]}` |
| GET | `/tramos/:id/historial` | EDITOR `TRAMOS:ver` | — | `{datos: Historial[]}` |
| PATCH | `/tramos/:id` | EDITOR `TRAMOS:editar` | `{geometria?, estadoId?, observaciones?}` | `{datos: Tramo}` |
| POST | `/tramos/:id/dividir` | EDITOR `TRAMOS:editar` | `{kmCorte}` | `{datos: [Tramo, Tramo]}` |
| POST | `/tramos/:id/fusionar` | EDITOR `TRAMOS:editar` | `{tramoAdyacenteId}` | `{datos: Tramo}` |
| POST | `/tramos/:id/mantenimientos` | EDITOR `MANTENIMIENTOS:crear` | `{tipo, fecha, costo?, descripcion?}` | `{datos: Mantenimiento, mensaje}` |
| DELETE | `/tramos/:id` | EDITOR `TRAMOS:borrar` | — | `{mensaje}` |
| POST | `/caminos/importar` | EDITOR `CAMINOS:crear` | `multipart/form-data` con campo `archivo` (.gpkg, .kml, .geojson; máx. 30 MB) | `{datos:{archivo,total,truncado,advertencias,features}}` |
| POST | `/caminos/importar/confirmar` | EDITOR `CAMINOS:crear` + `TRAMOS:crear` | `{features:[{nombre,localidad,tipoViaId,departamentoId?,estadoId?,observaciones?,caminoId?,geometria}]}` | `{datos:{creados,errores}}` |

`geom` y `geometria` son `LineString` GeoJSON con coordenadas `[longitud, latitud]`.
`kmCorte` se mide desde el inicio del tramo y debe ser menor a su longitud.

La importación separa cada parte de un `MultiLineString` en un tramo independiente, sin unirlas.
Si varias geometrías comparten nombre, localidad, tipo de vía y departamento, se agrupan bajo un mismo camino.
El preview no escribe en la base; la confirmación valida provincia, geometría y permisos, y registra auditoría `IMPORTAR`.

### Mantenimientos y fotos

| Método | Ruta | Rol | Body / Query | Respuesta |
|---|---|---|---|---|
| GET | `/mantenimientos` | EDITOR `MANTENIMIENTOS:ver` | Query: `desde, hasta, departamentoId, tramoId, anio` | `{datos: Mantenimiento[]}` |
| DELETE | `/mantenimientos/:id` | EDITOR `MANTENIMIENTOS:borrar` | — | `{mensaje}` |
| POST | `/fotos/upload-url` | EDITOR `FOTOS:crear` | — | `{datos:{cloudName, apiKey, timestamp, folder, firma, urlSubida}}` |
| POST | `/fotos` | EDITOR `FOTOS:crear` | `{url, caminoId, tramoId?, mantenimientoId?, descripcion?}` | `{datos: Foto, mensaje}` |
| DELETE | `/fotos/:id` | EDITOR `FOTOS:borrar` | — | `{mensaje}` |

### Infraestructura y puntos de interés

| Método | Ruta | Rol | Body / Query | Respuesta |
|---|---|---|---|---|
| GET | `/infraestructura` | Público | Query: `bbox, tipo, caminoId` | `{datos: Infraestructura[]}` |
| POST | `/infraestructura` | EDITOR `INFRAESTRUCTURA:crear` | `{tipo, geom, caminoId?, descripcion?}` | `{datos: Infraestructura, mensaje}` |
| PATCH | `/infraestructura/:id` | EDITOR `INFRAESTRUCTURA:editar` | Campos parciales | `{datos: Infraestructura}` |
| DELETE | `/infraestructura/:id` | EDITOR `INFRAESTRUCTURA:borrar` | — | `{mensaje}` |
| GET | `/puntos-interes` | Público | Query: `bbox, categoria` | `{datos: PuntoInteres[]}` |
| POST | `/puntos-interes` | EDITOR `PUNTOS_INTERES:crear` | `{nombre, categoria, latitud, longitud}` | `{datos: PuntoInteres, mensaje}` |
| PATCH | `/puntos-interes/:id` | EDITOR `PUNTOS_INTERES:editar` | Campos parciales | `{datos: PuntoInteres}` |
| DELETE | `/puntos-interes/:id` | EDITOR `PUNTOS_INTERES:borrar` | — | `{mensaje}` |
| GET | `/categorias-puntos` | Público | — | `{datos: CategoriaPunto[]}` |
| POST | `/categorias-puntos` | EDITOR `PUNTOS_INTERES:crear` | `{nombre, color?, inicial?, peso?, orden?}` | `{datos: CategoriaPunto, mensaje}` |
| DELETE | `/categorias-puntos/:id` | EDITOR `PUNTOS_INTERES:borrar` | — | `{mensaje}` |

`geom` de infraestructura es `{type:"Point", coordinates:[longitud, latitud]}`.
Las categorías base (`HOSPITAL`, `ESCUELA`, `UPA`) son protegidas y no se pueden eliminar.

### Sugerencias, reportes, sync y auditoría

| Método | Ruta | Rol | Body / Query | Respuesta |
|---|---|---|---|---|
| POST | `/sugerencias` | Público (rate limit 5/15 min) | `{texto, contacto?, caminoId?, tramoId?}` | `{datos: Sugerencia, mensaje}` |
| GET | `/sugerencias` | EDITOR `SUGERENCIAS:ver` | Query: `estado?, caminoId?` | `{datos: Sugerencia[]}` |
| PATCH | `/sugerencias/:id` | EDITOR `SUGERENCIAS:editar` | `{estado}` | `{datos: Sugerencia}` |
| GET | `/reportes/resumen` | Público | — | `{datos:{caminos, tramos, km, puntos, mantenimientos}}` |
| GET | `/reportes/km-por-estado` | Público | Query: `departamentoId?` | `{datos: KmPorEstado[]}` |
| GET | `/reportes/km-por-departamento` | Público | — | `{datos: KmPorDepartamento[]}` |
| GET | `/reportes/mantenimientos-anuales` | Público | Query: `anio?` | `{datos: MantenimientoMensual[]}` |
| POST | `/sync/batch` | Auth (rate limit 60/15 min) | `{operaciones:[{id, tipo, payload}]}` | `{datos:{resultados}}` |
| GET | `/auditoria` | ADMIN | Query: `accion?, entidad?, usuarioId?, desde?, hasta?, limite?` | `{datos: Auditoria[], total}` |

Tipos de operación de `/sync/batch`: `CREAR_CAMINO`, `CREAR_TRAMO`, `EDITAR_TRAMO`, `DIVIDIR_TRAMO`, `FUSIONAR_TRAMO`, `CREAR_MANTENIMIENTO`, `CREAR_PUNTO_INTERES`, `SUBIR_FOTO`.

## Base de datos

- Esquema `core`: usuarios, refresh tokens, departamentos, capas/permisos, auditoría, operaciones de sync, categorías y puntos de interés.
- Esquema `vialidad`: tipos de vía, estados, caminos, tramos, historial, mantenimientos, fotos, infraestructura y sugerencias.
- Geometrías `geometry(LineString, 4326)` / `geometry(Point, 4326)` / `geometry(Geometry, 4326)`.
- Prisma las declara como `Unsupported`; los repositorios usan `ST_AsGeoJSON`, `ST_GeomFromGeoJSON`, `ST_Length`, `ST_DWithin`, `ST_Intersects`, `ST_LineSubstring` y `ST_LineMerge`.
- La migración inicial crea la extensión PostGIS y los índices GiST de todas las columnas geométricas.
- `pnpm db:migrate` usa el `.env` de la raíz. En producción usar `pnpm db:deploy`.

### Migraciones manuales

La migración `packages/db/prisma/migrations/20261020160000_init/migration.sql` se generó con `prisma migrate diff` y se completó a mano para:

1. crear `EXTENSION IF NOT EXISTS postgis`;
2. agregar índices GiST para `Departamento`, `PuntoInteres`, `Camino`, `Tramo` e `Infraestructura`.

Si se cambia el esquema, regenerar la migración y revisar que las columnas `geometry` y los índices espaciales sigan presentes.

## Despliegue

### Base de datos (Neon)

1. Crear el proyecto y habilitar PostGIS (`CREATE EXTENSION postgis;`).
2. Configurar `DATABASE_URL` en Render.
3. Ejecutar `pnpm db:deploy` y `pnpm db:seed` una vez.

### API (Render)

- Build: `pnpm install --frozen-lockfile && pnpm db:generate && pnpm --filter @sde/api build`
- Start: `pnpm --filter @sde/api start`
- Variables: `DATABASE_URL`, `JWT_SHARED_SECRET`, `JWT_EXPIRES_IN`, `REFRESH_EXPIRES_DAYS`, `FRONTEND_URL`, `NODE_ENV=production`, Cloudinary y Sentry opcionales.

### Web (Vercel)

- Root directory: `apps/web`.
- Install command: `cd ../.. && pnpm install --frozen-lockfile`.
- Build: `pnpm build`.
- Variables: `NEXT_PUBLIC_API_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `JWT_SHARED_SECRET`.
- El paquete `@sde/shared` se transpila con `transpilePackages`; no hace falta publicarlo.

## Tests

```bash
pnpm test
```

Los tests unitarios cubren:

- validaciones geográficas (provincia, puntos mínimos, GeoJSON);
- esquemas zod compartidos;
- serialización de `FeatureCollection`;
- lectura y previsualización de GeoJSON, KML y GeoPackage (incluida la separación de `MultiLineString`).
- Los archivos de ejemplo para probar la importación están en `datos/ejemplos/`.

Los tests de integración con PostGIS requieren una base disponible y se ejecutan contra un entorno real o un contenedor de prueba.

## Limitaciones conocidas

- La geometría maestra de un camino solo se actualiza automáticamente cuando sus tramos forman una línea continua; si están desconectados, se conserva la última geometría y la longitud se calcula por tramo.
- Las fotos se guardan en Cloudinary; sin credenciales, `POST /fotos/upload-url` responde 503.
- La sincronización offline no incluye borrados ni subida de fotos.
- La app usa un service worker manual; al cambiar la estrategia de caché hay que incrementar `VERSION` en `apps/web/public/sw.js`.


## Documentación de decisiones

- [ADR 0001 — Monorepo con Next.js y Express](docs/adr/0001-monorepo-next-express.md)
- [ADR 0002 — PostGIS para geometrías](docs/adr/0002-postgis-geometrias.md)
- [ADR 0003 — Autenticación con Auth.js y JWT compartido](docs/adr/0003-auth-jwt-compartido.md)
- [ADR 0004 — Cola offline y sincronización idempotente](docs/adr/0004-offline-primero.md)
- [ADR 0005 — PWA con service worker propio](docs/adr/0005-pwa-service-worker.md)

