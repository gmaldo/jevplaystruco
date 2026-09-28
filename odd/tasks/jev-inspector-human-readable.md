# Feature: Jev Inspector legible para humanos

## Objective
Reescribir la presentación del Jev Inspector para que un jugador sin conocimiento técnico entienda qué pensó Jev: etiquetas en lenguaje natural, sin jerga System One (Choice/Noul/Score, ids crudos), estado de la mesa en palabras, y deduplicación de respuestas alias.

## Problem & Why
Hoy el inspector expone internals del motor: nombres de primitivas, ids de preguntas en inglés, JSON crudo del estado, y un bug donde el Score 0-100 se muestra como "X / 10.0". Además las keys alias (action + truco_response, card + play_card) se muestran duplicadas.

## Scope & Constraints
- Solo `components/JevInspector.tsx` (y doc de tareas). Sin tocar el motor ni el hook.
- Mantener la info técnica accesible pero secundaria (JSON colapsable en pestaña Estado).
- Checks: `npm test`, `npm run lint`, `npm run build`.
- Engram mirror: PENDIENTE (mem_* no disponible).

## Task Checklist
- [x] Task 1: Pestaña Decisión + badges + tabs: etiquetas humanas para choices/nouls/scores, dedupe de alias, fix del score /10, modo "En vivo/Local/Regla". (Route: direct inline — commit `75d0215`)
- [x] Task 2: Pestañas "Qué evaluó Jev" (preguntas en lenguaje natural con opciones legibles) y "La Mesa" (resumen del estado en palabras + JSON colapsable). (Route: direct inline — commit pending)
- [x] Task 3: Historial: cada entrada muestra la llamada al modelo (contexto, preguntas enviadas, distribución completa de probabilidades, nouls y scores) en bloque colapsable. (Route: direct inline)

## Verification Evidence & Next Step
- `npm run lint` → clean (un warning menor corregido en Task 1).
- `npm test` → 92 tests / 24 suites / 0 fail.
- `npm run build --webpack` → OK.
- Error de tipeo detectado en build (EnvidoState.status no incluye 'none') — corregido antes del cierre.
- Commits: `75d0215` feat(ui) decisión/badges; Task 2 commit siguiente.
- Next step: feature cerrada; sin push ni PR solicitados.
