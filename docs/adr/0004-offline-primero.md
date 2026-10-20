# ADR 0004 — Cola offline y sincronización idempotente

## Estado
Aceptado.

## Contexto
La app de carga se usa en zonas rurales con conectividad intermitente. El editor debe poder registrar cambios sin conexión y enviarlos después sin duplicar datos.

## Decisión
- La cola local vive en IndexedDB mediante Dexie (`sde-vial-offline`).
- Cada operación tiene un `id` de idempotencia generado en el cliente.
- `POST /api/sync/batch` procesa hasta 500 operaciones y guarda el resultado en `core.OperacionSync`.
- Los conflictos 404/409 se marcan como resueltos con error para evitar reintentos infinitos.
- La sincronización se dispara al recuperar conexión, al iniciar sesión y cada 30 segundos.

## Consecuencias
- Las operaciones offline incluyen crear camino + primer tramo, editar tramo, dividir, fusionar, mantenimiento y crear punto de interés.
- Las fotos requieren conexión porque la subida a Cloudinary es un servicio externo.
- Borrar caminos o tramos requiere conexión.
