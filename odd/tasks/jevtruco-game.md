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
- [x] Task 3: Motor de decisiones Jev (`/api/jev/decision`, cliente Jev con soporte TypeSafe AI live y simulador heurístico calibrado). (Route: delegated direct. Commit: a6adb24. Verified: 17/17 unit tests in test/jev-engine.test.js pass, total 44/44 tests pass in 3.1s, Next.js production build succeeds).
- [x] Task 4: Estado del juego y máquina de turnos en React (gestión de manos, cantos de Envido/Truco, respuestas y contabilización de puntos). (Route: delegated direct. Commit: 922ba58. Verified: 20/20 unit tests in test/game-machine.test.js pass, total 64/64 tests pass in 3.1s, Next.js production build succeeds).
- [x] Task 5: Componentes UI del juego (Tablero, Cartas Españolas con animaciones, Tanteador con fósforos, Controles de Canto y Acciones). (Route: delegated direct. Commit: b26591d. Verified: 70/70 unit tests pass, Next.js production build succeeds, ESLint passes with 0 errors).
- [x] Task 6: Panel "Jev Inspector" (visor en vivo de llamadas a Jev: state, questions, choices, nouls, latencia y modo de conexión). (Route: delegated direct. Commit: b26591d. Verified: drawer panel with Choice confidence, Noul bluffing gauge, Score hand meter, questions schema, and decision history).
- [x] Task 7: Verificación completa de jugabilidad, tests unitarios del motor de Truco y build final. (Route: direct inline. Verified: 70/70 unit tests pass, ESLint 0 errors, Next.js production build succeeds with static pages and dynamic route `/api/jev/decision`).

## Verification Evidence & Next Step
- Task 1: Verified via Next.js build compilation (`npm run build --webpack`). Clean exit code 0. Commit `7bd8585`.
- Task 2: Verified via `node --test test/truco-rules.test.js`. 27 test cases passing (deck creation, hierarchy comparisons, envido combinations, 1st/2nd/3rd parda, ties, point constants). Commit `a25115c`.
- Task 3: Verified via `node --test test/jev-engine.test.js` (17 test cases passing: question building, envido quiero/raise/no-quiero/bluffs, card killing/discarding, leading strategy, truco response, client fallback, and Next.js route handler) and `npm test` (44/44 tests passing). Next.js production build verified with dynamic route `/api/jev/decision`. Commit `a6adb24`.
- Task 4: Verified via `node --test test/game-machine.test.js` (20 test cases passing: match initialization, turn alternation, card play & trick resolution, parda turn handoff, envido flow quiero/no-quiero/raises, truco flow quiero/no-quiero/retruco/vale-cuatro, fold hand, match victory at target score 15/30, and action validators) and `npm test` (64/64 tests passing in 3.1s). Next.js production build verified with 0 errors. Commit `922ba58`.
- Task 5 & 6: Verified via `npm run build` (production build compiled successfully in 1.3s with static page generation and dynamic route `/api/jev/decision`), `npm run lint` (ESLint 0 errors, 0 warnings), and `npm test` (70/70 tests passing across 19 suites). Created `CardView.tsx`, `ScoreBoard.tsx`, `ActionControls.tsx`, `GameTable.tsx`, `JevInspector.tsx`, `SettingsModal.tsx`, `RulesModal.tsx`, procedural sound controller `audio.ts`, and updated `app/page.tsx`. Commit `b26591d`.
- Task 7: Verified entire test suite with 70/70 tests passing (`npm test`), ESLint clean (`npm run lint`), and Next.js production build passing with 0 errors (`npm run build`). Feature implementation fully complete and verified.



