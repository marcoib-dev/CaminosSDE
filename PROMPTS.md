# Prompts para OpenCode — Caminos Rurales SDE

Cómo usarlos: poné `AGENTS.md` en la raíz del proyecto, abrí OpenCode y pegá **un prompt por vez**. No pases a la siguiente etapa hasta probar la anterior.

---

## ETAPA 1 — Esquema Prisma y API base

```
Leé AGENTS.md. Vamos a empezar un proyecto desde cero (ignorá cualquier código anterior).

Tarea de la ETAPA 1: crear el backend base.

1. Crear carpeta `backend/` con Express (ES Modules), Prisma y PostgreSQL (Neon). Archivos `.env.example` con DATABASE_URL, JWT_SECRET, JWT_EXPIRES_IN, PORT, FRONTEND_URL, CLOUDINARY_* .
2. `prisma/schema.prisma` con los modelos: Usuario (rol ADMIN|EDITOR, activo), Camino, Tramo (geometria Json, longitudKm, estado, tipo), HistorialTramo, PuntoInteres, Foto, Sugerencia, Auditoria. Usar enums para estado, tipo, rol, categoría y estado de sugerencia, tal como describe AGENTS.md.
3. Script `prisma/seed.js` que cree un usuario ADMIN inicial desde variables de entorno y unos 3 caminos de ejemplo con tramos de distintos estados y tipos.
4. Rutas REST:
   - Públicas (GET): /api/health, /api/caminos, /api/caminos/:id, /api/tramos, /api/puntos-interes.
   - Público (POST): /api/sugerencias (con rate limit por IP).
   - Auth: POST /api/auth/login, GET /api/auth/me, POST /api/auth/change-password.
   - EDITOR/ADMIN: CRUD de caminos, tramos y puntos de interés; GET/PATCH /api/sugerencias.
   - ADMIN: /api/usuarios (listar, crear editor, activar/desactivar), GET /api/auditoria.
5. Middleware: auth JWT, control de rol, validación con zod, manejo de errores, auditoría (registrar crear/editar/borrar) y registro en HistorialTramo cada vez que cambie estado, tipo o geometría de un tramo.
6. Calcular longitudKm con turf al crear/editar un tramo.
7. Endpoint PATCH /api/tramos/:id/dividir para dividir un tramo entre dos puntos (inicio y fin) y cambiar el estado/tipo solo del segmento intermedio, generando hasta 3 tramos (usar turf.lineSlice).
8. README.md con tabla completa de endpoints (método, ruta, rol, body, respuesta) e instrucciones de instalación.

No hagas frontend todavía. Al terminar, verificá que arranque y que las migraciones funcionen.
```

---

## ETAPA 2 — Mapa, colores, filtros, puntos de interés y priorización

```
Leé AGENTS.md y el README del backend.

Tarea de la ETAPA 2: crear el frontend (React + Vite + Tailwind + Leaflet) con el mapa público.

1. Carpeta `frontend/`, con React Router, tema claro/oscuro y diseño responsive móvil primero. Servicio `src/services/api.js` que use VITE_API_URL.
2. Página principal `/` (sin login): mapa Leaflet con OpenStreetMap que muestra todos los tramos.
   - Selector "Colorear por": estado (verde transitable, amarillo regular, rojo intransitable, azul en obra) o tipo de superficie. Al colorear por estado, distinguir el tipo con estilo de línea.
   - Panel de filtros: estado, tipo, departamento, búsqueda por nombre. Leyenda de colores.
   - Al hacer clic en un tramo: popup con nombre del camino, localidad, longitud del tramo y total, estado, tipo, puntaje de prioridad y fotos.
   - Marcadores con íconos distintos para HOSPITAL, ESCUELA y UPA, con opción de mostrar/ocultar.
3. Priorización (backend, agregar a la etapa): endpoint GET /api/tramos/prioridad que devuelve los tramos ordenados por puntaje 0–100.
   Fórmula inicial (dejarla en un archivo `backend/src/services/prioridad.js` con pesos fáciles de cambiar):
   - Estado: INTRANSITABLE 50, REGULAR 25, EN_OBRA 10, TRANSITABLE 0.
   - Tipo: TIERRA 20, RIPIO 12, ENRIPIADO_MEJORADO 6, PAVIMENTADO 0.
   - Cercanía a puntos de interés (distancia del tramo a cada punto con turf, umbral configurable 1 km): HOSPITAL +30, UPA +20, ESCUELA +15, máximo 30 en total.
   - Normalizar a 100 como máximo.
4. Página `/prioridades`: tabla de tramos ordenada por puntaje, con filtros, y botón para centrar el mapa en el tramo.
5. Formulario público "Sugerir un cambio" en el popup del camino (texto + contacto opcional) que llame a POST /api/sugerencias.

No implementes login ni edición todavía. Verificá que compile con `npm run build`.
```

---

## ETAPA 3 — Login, roles y panel de edición

```
Leé AGENTS.md y los README.

Tarea de la ETAPA 3: autenticación y edición.

1. Página `/login`, contexto de autenticación (JWT en localStorage), rutas protegidas según rol (EDITOR, ADMIN), menú que cambia según el rol.
2. Para EDITOR y ADMIN, en el mapa:
   - Crear camino (nombre, localidad, departamento, descripción) y agregarle tramos dibujando la línea en el mapa (Leaflet Draw o equivalente).
   - Editar un camino: seleccionarlo, tocar "Editar tramo" y marcar punto inicial y punto final sobre la línea; para ese segmento cambiar estado/tipo (usa PATCH /api/tramos/:id/dividir).
   - Borrar caminos y tramos con confirmación.
   - Subir fotos del camino (Cloudinary, subida firmada desde el backend; en la BD solo la URL).
   - Ver el historial de cambios de un tramo.
   - CRUD de puntos de interés (hospital, escuela, UPA) haciendo clic en el mapa.
   - Página `/sugerencias` para revisar y marcar sugerencias ciudadanas.
3. Solo ADMIN: página `/usuarios` (crear editores, activar/desactivar) y página `/auditoria` con filtros por usuario, acción y fecha.
4. Página `/perfil` con cambio de contraseña.

Actualizá el README con cualquier endpoint nuevo.
```

---

## ETAPA 4 — Importación de KML/GPKG

```
Leé AGENTS.md y los README.

Tarea de la ETAPA 4: importación de datos reales del relevamiento (hechos en QGIS, en archivos .kml y .gpkg).

1. Backend: POST /api/caminos/importar (EDITOR/ADMIN, multipart) que lea .gpkg con @ngageoint/geopackage y .kml con @tmcw/togeojson, y devuelva una **previsualización** (no guarda todavía): lista de features con nombre, tipo de geometría, longitud calculada y atributos encontrados.
2. Soportar LineString y MultiLineString. Un MultiLineString se separa en varios tramos independientes **sin unir** las partes. Reproyectar a EPSG:4326 si el GPKG viene en otro sistema de coordenadas.
3. Segundo endpoint POST /api/caminos/importar/confirmar que guarde lo aprobado, creando caminos y tramos con estado y tipo por defecto (o tomados de atributos si existen, con mapeo configurable).
4. Frontend: pantalla de importación con subida de archivo, previsualización en el mapa, selección de qué features importar, asignación de nombre/localidad/estado/tipo, y botón confirmar.
5. Manejo claro de errores (archivo corrupto, sin geometrías de línea, etc.).

Probá con archivos de ejemplo y documentá el formato esperado en el README.
```
