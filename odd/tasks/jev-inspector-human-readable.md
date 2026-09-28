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
- [ ] Task 1: Pestaña Decisión + badges + tabs: etiquetas humanas para choices/nouls/scores, dedupe de alias, fix del score /10, modo "En vivo/Local/Regla". (Route: direct inline)
- [ ] Task 2: Pestañas "Qué evaluó Jev" (preguntas en lenguaje natural con opciones legibles) y "La Mesa" (resumen del estado en palabras + JSON colapsable). (Route: direct inline)

## Verification Evidence & Next Step
(pending)
