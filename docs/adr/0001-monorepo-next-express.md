# ADR 0001 — Monorepo con Next.js y Express

## Estado
Aceptado.

## Contexto
El sistema tiene dos experiencias distintas: un tablero público de solo lectura y una aplicación de carga para personal de Vialidad. La especificación técnica propone separar la web (Next.js App Router) de la API (Express), compartiendo contratos y tipos.

## Decisión
Organizar el repositorio con pnpm workspaces y Turborepo:

- `apps/web`: Next.js 14 + App Router + TypeScript.
- `apps/api`: Express 4 + TypeScript, empaquetado con tsup.
- `packages/db`: esquema Prisma, migraciones y seed.
- `packages/shared`: enums, esquemas zod y DTO compartidos.

## Consecuencias
- Un solo `pnpm install` y tareas coordinadas con `turbo`.
- Los contratos de entrada se validan en la API con los mismos esquemas que usa la web.
- El despliegue sigue siendo independiente: Vercel para la web y Render para la API.
