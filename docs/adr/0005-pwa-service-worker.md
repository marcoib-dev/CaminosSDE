# ADR 0005 — PWA con service worker propio

## Estado
Aceptado.

## Contexto
La app de carga debe poder abrirse con conectividad débil. `next-pwa` agrega una capa de configuración frágil sobre Next.js y complica el control del cacheo.

## Decisión
Implementar un service worker manual en `apps/web/public/sw.js`, registrado por `PwaRegister`, con:
- cache del shell y de assets estáticos;
- estrategia network-first para navegación;
- fallback a `offline.html` cuando no hay red.

## Consecuencias
- No se cachean respuestas de la API; los datos offline viven en Dexie.
- El service worker debe versionarse (`VERSION`) al cambiar la estrategia de caché.
- La app sigue siendo instalable mediante `manifest.webmanifest`.
