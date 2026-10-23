# Baseline de seguridad — Etapa 0

- **Fecha:** 23/10/2026
- **Rama:** `seguridad/auditoria-oct-2026`
- **Commit base:** `b165ad1` (`main`)
- **Entorno local:** Windows, Node `v24.20.0`, npm `11.19.0`
- **Objetivo:** registrar el estado previo a los cambios de seguridad para poder comparar después.

> Este documento no contiene secretos. No se copiaron valores de `backend/.env` ni de `.env.produccion`.

---

## 1. Estado del repositorio

| Verificación | Resultado |
|---|---|
| Rama de trabajo | `seguridad/auditoria-oct-2026` (creada desde `main`) |
| Archivos sin trackear | `AUDITORIA_SEGURIDAD.md` (sin secretos) |
| `.env.produccion` en el repo local | No existe (correcto, es del servidor) |
| `backend/.env` | Presente, ignorado por git |
| `frontend/.env` | Presente, ignorado por git |
| `node_modules` backend/frontend | Instalados |

---

## 2. Dependencias (`npm audit`)

### Backend

| Severidad | Cantidad |
|---|---|
| Alta | 3 |
| Moderada | 0 |
| Baja | 0 |
| **Total** | **3** |

Detalle:

| Paquete | Severidad | Origen | Fix disponible |
|---|---|---|---|
| `deepmerge-ts` | Alta | `@prisma/config` → `prisma` | `prisma` 7.10.1 (breaking) |
| `@prisma/config` | Alta | `deepmerge-ts` | `prisma` 7.10.1 (breaking) |
| `prisma` | Alta | `@prisma/config` | `prisma` 7.10.1 (breaking) |

Observaciones:

- La CLI de Prisma viaja en la imagen de runtime porque el contenedor ejecuta `prisma migrate deploy`.
- El vector requiere configuración controlada por el atacante; no se expone la CLI por HTTP.
- No se actualiza Prisma en esta etapa: es un salto mayor y no aporta al riesgo real inmediato. Queda documentado como backlog (mover migraciones a un servicio one-shot y dejar la imagen de runtime sin la CLI).

### Frontend

| Severidad | Cantidad |
|---|---|
| Alta | 6 |
| Moderada | 5 |
| Baja | 0 |
| **Total** | **11** |

Detalle:

| Paquete | Severidad | Alcance | Fix disponible |
|---|---|---|---|
| `react-router-dom` / `react-router` | Moderada | Runtime | `react-router-dom` 7.18.4 (breaking) |
| `vite` (+ `esbuild`) | Alta | Build/dev | `vite` 8.3.5 (breaking) |
| `tailwindcss` (+ `braces`, `chokidar`, `fast-glob`, `micromatch`, `postcss-nested`, `postcss-selector-parser`) | Alta | Build/dev | `tailwindcss` 4.3.3 (breaking) |

**Diferencia con `AUDITORIA_SEGURIDAD.md`:** la auditoría del 22/10 registraba 2 vulnerabilidades moderadas (`react-router`). Al 23/10 el registro público sumó avisos para `vite`, `esbuild` y la cadena de `tailwindcss`. Casi todas son dependencias de build o del servidor de desarrollo (no se sirven en producción); la única de runtime es `react-router`.

### Solo dependencias de runtime (`npm audit --omit=dev`)

| Proyecto | Altas | Moderadas | Total | Detalle |
|---|---|---|---|---|
| Backend | 3 | 0 | 3 | Sigue apareciendo la cadena de `prisma` porque la CLI está en la imagen de runtime |
| Frontend | 0 | 2 | 2 | Solo `react-router-dom` / `react-router` |

Esto confirma que el riesgo real en producción se concentra en:

1. La CLI de Prisma dentro del contenedor (sin exposición HTTP directa).
2. `react-router-dom` en el bundle del navegador.

Las vulnerabilidades de `vite` y `tailwindcss` afectan al entorno de build/desarrollo, no al `dist` que sirve Nginx.

Implicancias para la Etapa 2:

- `react-router-dom` 7.18.4 es un salto mayor (breaking) y hay que probar las rutas.
- `tailwindcss` 4.x y `vite` 8.x son migraciones mayores y no deberían mezclarse con el hardening. Si se hacen, van en commits separados con build y smoke test.
- Mientras tanto, el riesgo en producción es bajo: Nginx sirve el `dist` compilado, no el servidor de Vite.

---

## 3. Build del frontend

```
vite v5.4.21 building for production...
✓ 129 modules transformed.
dist/index.html                 1.55 kB │ gzip:   0.78 kB
dist/assets/index-*.css        77.88 kB │ gzip:  17.12 kB
dist/assets/index-*.js        541.08 kB │ gzip: 158.35 kB
✓ built in 19.60s
```

- **Resultado:** OK.
- **Aviso:** chunk principal de 541 kB (por encima del umbral de 500 kB). No es un problema de seguridad; queda como mejora opcional de rendimiento.

---

## 4. Base de datos, migraciones y arranque del backend

| Verificación | Resultado |
|---|---|
| `npx prisma validate` | **OK**: el schema es válido |
| PostgreSQL local | **OK**: contenedor `caminos-rurales-postgres` levantado, base `caminos_rurales_local` accesible |
| `npx prisma migrate status` | **OK**: 2 migraciones encontradas, `Database schema is up to date!` |
| Migraciones presentes | `20261019233831_init`, `20261020120000_categorias_puntos_interes` |
| Backend (`node src/server.js`) | **OK**: arranca sin errores |
| `GET /api/health` | **200** `{ estado: "ok", fecha: ... }` |

Entorno local listo para generar la migración de `tokenVersion` al inicio de la Etapa 1.

---

## 5. Conclusión de la Etapa 0

- Rama de trabajo creada.
- Baseline de dependencias, build y entorno registrado.
- Sin cambios de código todavía.
- El estado coincide con `AUDITORIA_SEGURIDAD.md` en el backend; el frontend tiene más avisos de los documentados, principalmente por dependencias de build.
