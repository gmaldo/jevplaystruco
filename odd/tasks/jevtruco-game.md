# Feature: JevTruco - Truco Argentino en Next.js con Motor de Decisiones Jev

## Objective
Crear una aplicación web completa e interactiva en Next.js (App Router, TypeScript, Tailwind CSS) para jugar al Truco Argentino contra un rival de inteligencia artificial cuyas decisiones sean ejecutadas por el modelo **Jev** (TypeSafe AI) mediante inferencia estructurada (`Choice`, `Noul`, `Score`), con un panel inspector de decisiones en tiempo real y soporte para API key en vivo o simulación local de Jev.

## Problem & Why
El Truco es un juego de cartas con información imperfecta, cálculo de probabilidades (tantos de envido, cartas mayores) y psicología (farol, apuestas escalonadas de Truco/Retruco/Vale Cuatro). Los LLMs convencionales son lentos (1-5s) y propensos a alucinaciones de formato JSON. El modelo Jev de TypeSafe AI ("System One") es ideal para este caso de uso: evalúa el estado del juego (`state`) y emite decisiones tipadas con probabilidades calibradas en milisegundos.

## Scope & Constraints
- **Framework:** Next.js (App Router), React, TypeScript, Tailwind CSS.
- **Reglas del Truco:** Truco Argentino para 2 jugadores (Humano vs Jev). Mano de 3 cartas, 3 rondas por mano, Envido/Real Envido/Falta Envido, Truco/Retruco/Vale Cuatro, tanteador a 15 o 30 puntos.
- **Integración Jev:**
  - Integración con `@typesafe-ai/sdk` y endpoint `/api/jev/decision`.
  - Primitivas: `Choice` (seleccionar carta a jugar, respuesta a Truco/Envido), `Noul` (evaluación booleana de farol / cantar o no), `Score` (fuerza de mano percibida).
  - Inspector Jev en vivo: visualización de estado enviado, preguntas formuladas, probabilidades calibradas y latencia en ms.
  - Fallback local de Jev: motor heurístico calibrado cuando no haya `TYPESAFE_API_KEY` configurada o en modo offline, permitiendo jugar y probar inmediatamente.
- **Diseño y UX:**
  - Tablero de mesa de cartas con diseño moderno e inmersivo.
  - Cartas españolas estilizadas (Espada, Basto, Oro, Copa).
  - Tanteador tradicional con fósforos/porotos.
  - Diálogos de cantos interactivos (Envido, Real Envido, Truco, Quiero, No Quiero, etc.).

## Task Checklist
- [x] Task 1: Inicialización del proyecto Next.js con TypeScript, Tailwind CSS y dependencias base. (Route: direct inline. Verified: `npm run build` succeeds offline in 2.0s).
- [x] Task 2: Motor de reglas del Truco Argentino (baraja española de 40 cartas, jerarquía de cartas, cálculo de envido, resolución de manos y rondas). (Route: delegated direct. Commit: a25115c. Verified: 27/27 unit tests pass in node:test in 72ms).
- [x] Task 3: Motor de decisiones Jev (`/api/jev/decision`, cliente Jev con soporte TypeSafe AI live y simulador heurístico calibrado). (Route: delegated direct. Commit: pending. Verified: 17/17 unit tests in test/jev-engine.test.js pass, total 44/44 tests pass in 3.1s, Next.js production build succeeds).
- [ ] Task 4: Estado del juego y máquina de turnos en React (gestión de manos, cantos de Envido/Truco, respuestas y contabilización de puntos).
- [ ] Task 5: Componentes UI del juego (Tablero, Cartas Españolas con animaciones, Tanteador con fósforos, Controles de Canto y Acciones).
- [ ] Task 6: Panel "Jev Inspector" (visor en vivo de llamadas a Jev: state, questions, choices, nouls, latencia y modo de conexión).
- [ ] Task 7: Verificación completa de jugabilidad, tests unitarios del motor de Truco y build final.

## Verification Evidence & Next Step
- Task 1: Verified via Next.js build compilation (`npm run build --webpack`). Clean exit code 0.
- Task 2: Verified via `node --test test/truco-rules.test.js`. 27 test cases passing (deck creation, hierarchy comparisons, envido combinations, 1st/2nd/3rd parda, ties, point constants). Commit `a25115c`.
- Task 3: Verified via `node --test test/jev-engine.test.js` (17 test cases passing: question building, envido quiero/raise/no-quiero/bluffs, card killing/discarding, leading strategy, truco response, client fallback, and Next.js route handler) and `npm test` (44/44 tests passing). Next.js production build verified with dynamic route `/api/jev/decision`.
- Next Step: Task 4 - Estado del juego y máquina de turnos en React (gestión de manos, cantos de Envido/Truco, respuestas y contabilización de puntos).

