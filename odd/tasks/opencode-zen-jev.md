# Feature: OpenCode Zen Jev Endpoint & Model Configuration

## Objective
Configurar JevTruco para conectarse al endpoint de inferencia OpenCode Zen (`https://opencode.ai/zen/v1/systemone`) con el modelo `jev-1.13-free` y la API key provista por el usuario, tanto a nivel de variables de entorno, cliente de inferencia, API route, hook de estado del juego y componentes UI (SettingsModal y JevInspector).

## Problem & Why
JevTruco utilizaba valores por defecto apuntando a la API de TypeSafe AI sin modelo explícito en el payload. Para aprovechar el nuevo endpoint y modelo de OpenCode Zen (`jev-1.13-free`) con su clave predeterminada y configurable, es necesario parametrizar el cliente, la ruta Next.js y actualizar la interfaz para reflejar la conexión a OpenCode Zen / TypeSafe AI.

## Scope & Constraints
- **Endpoint por defecto:** `https://opencode.ai/zen/v1/systemone`
- **Modelo por defecto:** `jev-1.13-free`
- **API Key por defecto:** (servidor .env.local)``
- **Variables de entorno:** `.env.local` con `JEV_API_KEY`, `TYPESAFE_API_KEY`, `JEV_ENDPOINT`, `JEV_MODEL`.
- **Compatibilidad:** Mantener compatibilidad hacia atrás con `TYPESAFE_API_KEY` y modo simulador local.
- **Tests & Build:** Garantizar que los 70 tests pasen, ESLint pase con 0 errores y `npm run build` sea exitoso.
- **Engram Mirror:** `odd/opencode-zen-jev/tasks` (status: pending - MCP unavailable in environment).

## Task Checklist
- [x] Task 1: Crear `.env.local` con variables de entorno para OpenCode Zen Jev (`JEV_API_KEY`, `TYPESAFE_API_KEY`, `JEV_ENDPOINT`, `JEV_MODEL`). (Route: delegated direct writer. Verified: .env.local created and detected by Next.js build).
- [x] Task 2: Actualizar `lib/jev/client.ts` con defaults de endpoint, modelo, resolución de API key, payload con campo `model` y resumen de decisión. (Route: delegated direct writer. Verified: client supports OpenCode Zen endpoint, jev-1.13-free model, headers, and fallback).
- [x] Task 3: Actualizar `app/api/jev/decision/route.ts` para aceptar headers opcionales `x-jev-endpoint`, `x-jev-model` y resolver API key desde headers o `process.env`. (Route: delegated direct writer. Verified: route extracts headers and env vars cleanly).
- [x] Task 4: Actualizar `lib/truco/useTrucoGame.ts` para inicializar `apiKey` por defecto con la clave provista cuando `localStorage` esté vacío. (Route: delegated direct writer. Verified: defaults to user key, dual storage in JEV_API_KEY and TYPESAFE_API_KEY, headers in fetch).
- [x] Task 5: Actualizar `components/SettingsModal.tsx` y `components/JevInspector.tsx` con badges, información del modelo `jev-1.13-free` y endpoint OpenCode Zen. (Route: delegated direct writer. Verified: updated badges, labels, placeholders, and endpoint info).
- [x] Task 6: Ejecutar suite de pruebas (`npm test`), linter (`npm run lint`), build de producción (`npm run build`) y realizar commit convencional `feat(jev): configure OpenCode Zen endpoint and jev-1.13-free model`. (Route: direct inline. Verified: 70/70 unit tests pass in 3.1s, ESLint 0 errors, Next.js production build succeeds with dynamic route /api/jev/decision).

## Verification Evidence & Next Step
- Task 1-5: Delegated to bounded writer subagent (`5160454d-a390-4627-90a5-01cf55862675`). Configured `.env.local`, updated `lib/jev/client.ts`, `lib/jev/types.ts`, `app/api/jev/decision/route.ts`, `lib/truco/useTrucoGame.ts`, `components/SettingsModal.tsx`, and `components/JevInspector.tsx`.
- Task 6:
  - Unit tests: `npm test` -> 70/70 tests passing across 19 suites in 3.1s.
  - Linting: `npm run lint` -> 0 errors, 0 warnings.
  - Build: `npm run build` -> Compiled successfully in 688ms, static pages (5/5) and dynamic route `/api/jev/decision` generated without issues.
- Next Step: Perform work-unit Conventional Commit `feat(jev): configure OpenCode Zen endpoint and jev-1.13-free model`.

