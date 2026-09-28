# Feature: Jev Stronger Opponent (motor de decisiones más desafiante)

## Objective
Hacer que jugar contra Jev sea realmente desafiante aplicando las guías de TypeSafe System One: estado enriquecido con features calculados en código, instrucciones en inglés con paths backticked, preguntas atómicas compuestas en código, estrategia mixta desde `probabilities`, routing por `confidence`, modelado del rival (`playerProfile`), niveles de dificultad y short-circuits deterministas.

## Problem & Why
Hoy `JevState` envía cartas crudas y el modelo debe inferir jerarquía de truco y tantos de envido por sí mismo; las instrucciones son genéricas en español (Jev está entrenado principalmente en inglés); cada contexto hace una sola pregunta amplia; el código toma siempre el argmax (predecible); no hay memoria del jugador; y `play_card` hace dos requests seriales (`initiate_call` + `play_card`).

## Scope & Constraints
- Sin tocar reglas del juego (`lib/truco/rules.ts`, `cards.ts`, `game-machine.ts` solo lectura de exports públicos).
- Mantener compatibilidad: contextos existentes (`play_card`, `respond_envido`, `respond_truco`, `initiate_call`), keys de respuesta (`action`, `card`, `call`, `call_truco`, `bluffing_probability`, `hand_confidence`) y 76 tests actuales.
- Fallback en cascada intacto: sin key → simulador; error/timeout → simulador.
- TDD mode: off (no configurado); checks funcionales: `npm test`, `npm run lint`, `npm run build`.
- Delivery: work-unit commits Conventional Commits en `main`; forecast ~700 líneas autoradas → estrategia `single-pr` implícita (repo sin PRs, commits directos).
- Engram mirror `odd/jev-stronger-opponent/tasks`: PENDIENTE (mem_* tools no disponibles en este entorno).

## Task Checklist
- [x] Task 1: Estado computado (`computed` en JevState: envidoPoints, cardRanks, maxRank, canBeatPlayerCard, trickRecord, pointsAtStake, scorePressure, inBuenas) calculado en `lib/jev/analysis.ts`; instrucciones en inglés con paths backticked; `ScoreQuestion.levels` por pregunta en vez de leyenda hardcodeada. (Route: direct inline. Commit: dcfe221. Verified: 80/80 tests, ESLint limpio, build exitoso)
- [x] Task 2: `probabilities` preservadas en respuestas (parseo live + emisión en simulador), `sampleChoice` para estrategia mixta, routing por confidence baja al simulador, preguntas atómicas extra (`opponent_likely_bluffing`, `jev_can_win_hand`) y composición de respuestas en código para `respond_*`. (Route: direct inline. Commit: 755cc9f. Verified: 85/85 tests incl. servidor HTTP local que valida veto de raises y recalibración por baja confianza)
- [x] Task 3: Fusión de requests: `availableCalls` en JevState + `opening_call` choice dentro de `play_card`; hook hace una sola consulta y aplica canto + carta. `initiate_call` queda soportado para compatibilidad. (Route: direct inline. Commit: 14e7f4e. Verified: 88/88 tests, ESLint limpio, build exitoso)
- [x] Task 4: Dificultad (`easy`/`normal`/`hard`) con selector en SettingsModal, `playerProfile` trackeado en el hook y enviado en hard, estrategia mixta solo en hard (acciones/cantos; carta sigue argmax), inyección de errores en easy, short-circuits deterministas (una sola carta; mano ganada con ancho tras ganar primera) con mode `deterministic`. (Route: direct inline. Commit: 4c566f4. Verified: 92/92 tests, ESLint limpio, build exitoso)
- [x] Task 5: README (dificultad, arquitectura, nuevas preguntas) + verificación final completa. (Route: direct inline. Verified: 92/92 tests / 24 suites, lint 0 errores, build exitoso)

## Verification Evidence & Next Step
- Suite completa: 92/92 tests en 24 suites (`npm test`), ESLint 0 errores (`npm run lint`), build de producción exitoso (`npm run build`).
- Commits: dcfe221 (computed state + instrucciones), 755cc9f (composición + probabilidades), 14e7f4e (single-request), 4c566f4 (dificultad + perfil rival + determinista).
- Engram mirror `odd/jev-stronger-opponent/tasks`: PENDIENTE — las herramientas mem_* no están disponibles en este entorno; el progreso quedó persistido en este archivo.
- Next step sugerido: jugar una partida en modo Difícil con `JEV_API_KEY` configurada para validar en vivo la composición de respuestas y la estrategia mixta; calibrar umbrales (confidence <45%, veto <30%) con decisiones logueadas.
