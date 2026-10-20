# ADR 0003 — Autenticación con Auth.js y JWT compartido

## Estado
Aceptado.

## Contexto
La web necesita sesión persistente y la API es un servicio separado. La especificación exige un secreto JWT compartido y roles `ADMIN` / `EDITOR`.

## Decisión
- Auth.js (Credentials provider) autentica contra `POST /api/auth/login`.
- La web emite un token de API de 15 minutos en `GET /api/token`, firmado con `JWT_SHARED_SECRET`.
- La API valida el token con el mismo secreto y consulta el usuario en cada petición para respetar desactivaciones.
- La API también emite refresh tokens opacos, hasheados en base de datos, para clientes que los necesiten.

## Consecuencias
- `NEXTAUTH_SECRET` y `JWT_SHARED_SECRET` son secretos diferentes y obligatorios.
- El token de la web no se guarda en la sesión de Auth.js; se solicita al endpoint interno y se cachea en memoria.
- Los permisos finos se validan por capa (`CAMINOS`, `TRAMOS`, etc.), no solo por rol.
