# 🧉 JevTruco

**Truco Argentino contra una IA** — juego 1 vs 1 (Humano vs Jev) en el navegador, con un motor de decisiones que expone cada razonamiento del rival en vivo.

Jev evalúa el estado de la partida y devuelve decisiones tipadas mediante inferencia estructurada **System One** (`Choice`, `Noul`, `Score`), con probabilidades calibradas y latencia en milisegundos. Si no hay API key, si la llamada supera los 5 segundos o si falla la red, cae automáticamente a un **simulador heurístico local**: siempre se puede jugar, sin configuración previa.

![Next.js](https://img.shields.io/badge/Next.js-16.3.6-black?logo=next.js)
![React](https://img.shields.io/badge/React-19.2.8-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Tests](https://img.shields.io/badge/tests-92%20passing-22C55E)

---

## ✨ Características

- **Reglas completas del Truco Argentino**: baraja española de 40 cartas, jerarquía de cartas bravas (Ancho de Espada, Ancho de Basto, Sietes bravos…), Envido / Real Envido / Falta Envido, Truco / Retruco / Vale Cuatro, resolución de rondas con parda y mano, tanteador a 15 o 30 puntos.
- **Rival IA proactivo**: Jev no solo responde — inicia cantos en su turno (Truco de primera con cartas grandes o en segunda tras ganar/empardar, Retruco y Vale Cuatro, y Envido según sus tantos o con farol) según heurísticas de teoría de juegos.
- **Tres niveles de dificultad** (Ajustes ⚙️): *Fácil* inyecta errores tácticos (~35%), *Normal* juega la mejor opción, *Difícil* samplea los cantos desde la distribución de probabilidad (estrategia mixta impredecible) y alimenta al modelo un `playerProfile` con las tendencias del rival (cantos, folds, tantos declarados).
- **Estado enriquecido**: antes de consultar, el código calcula hechos deterministas (`computed`): tantos de envido, jerarquías de cartas, bazas ganadas, puntos en juego y presión de score — el modelo juzga estrategia, no aritmética.
- **Composición de respuestas**: las respuestas del modelo se vetan o recalibran en código (raise sin respaldo de `jev_can_win_hand`, fold contra `opponent_likely_bluffing`, decisiones con confianza <45% se reevalúan con la heurística local).
- **Jev Inspector** 🔬: panel lateral con 4 pestañas — *Decisión* (estado, preguntas, resultados), *Esquema* (preguntas enviadas al modelo), *Estado* y *Historial* narrativo ("Se jugó el 4 de oro con 78% de confianza — **¿Por qué?**"), con barras de probabilidad, medidor de farol y fuerza de mano.
- **Tres modos de inferencia**: `live_api` (endpoint System One), `local_simulator` (heurística calibrada) y `deterministic` (jugadas forzadas por regla: última carta, mano matemáticamente ganada), con fallback en cascada y timeout de 5s.
- **UX de mesa**: cartas españolas estilizadas en SVG, tanteador tradicional con fósforos, banner de resolución de Envido (tantos Tú vs Jev, desempate por mano), diálogos de canto contextuales.
- **Audio de cantos**: 8 clips WAV (`truco`, `retruco`, `vale_cuatro`, `envido`, `real_envido`, `falta_envido`, `quiero`, `no_quiero`) con fallback a sintetizador Web Audio si el navegador bloquea autoplay.
- **Mobile-first**: tablero arriba en móvil, controles táctiles ≥ 44px, `touch-manipulation` sin delay de 300ms.
- **Privacidad**: la UI no expone endpoints, modelos ni proveedores; la clave de inferencia vive solo en el servidor.

---

## 🚀 Puesta en marcha

### Requisitos

| Tool | Versión |
| --- | --- |
| Node.js | **≥ 22.18.0** (type stripping de TS habilitado por defecto; probado con 24.x) |
| npm | ≥ 7 (lockfile v3) |

> Los tests importan archivos `.ts` directamente con `node --test`. Eso requiere el *type stripping* nativo de Node, disponible por defecto desde **22.18.0** y **23.6.0**.

### Instalación

```bash
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

**Sin API key también funciona**: el motor cae al simulador local y jugás igual.

### Variables de entorno (`.env.local`)

Nunca se versionan (`.gitignore` bloquea `.env*`). Crealo solo si querés inferencia **live**:

```bash
JEV_API_KEY=tu-clave                       # obligatoria para modo live_api
JEV_ENDPOINT=https://opencode.ai/zen/v1/systemone   # opcional
JEV_MODEL=jev-1.13-free                              # opcional
```

| Variable | Requerida | Descripción |
| --- | --- | --- |
| `JEV_API_KEY` | Solo para live | Clave de inferencia. Sin ella → modo `local_simulator`. |
| `JEV_ENDPOINT` | No | Endpoint System One. Por defecto `https://opencode.ai/zen/v1/systemone`. |
| `JEV_MODEL` | No | Modelo. Por defecto `jev-1.13-free`. |
| `TYPESAFE_API_KEY` | No | Alias legacy: se usa si `JEV_API_KEY` no está definida. |

> **Nota**: la UI no tiene campo de API key (se eliminó a propósito junto al resto de la configuración de servidor). El hook igual lee `localStorage.getItem('JEV_API_KEY' | 'TYPESAFE_API_KEY')` como camino legacy, por si querés setearlo a mano en DevTools. La vía recomendada y segura es `JEV_API_KEY` en `.env.local`, que vive **solo en el servidor** y nunca llega al cliente.

---

## 📜 Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Dev server con **webpack** (`next dev --webpack`). |
| `npm run build` | Build de producción con webpack. |
| `npm run start` | Sirve el build de producción. |
| `npm run lint` | ESLint 9 (`eslint-config-next` core-web-vitals + typescript). |
| `npm test` | `node --test 'test/**/*.test.js'` → **92 tests / 24 suites**. |

---

## 🗂️ Estructura

```
.
├── app/
│   ├── page.tsx                    # Shell de la app: layout, header, modales
│   ├── layout.tsx                  # Metadata (lang="es")
│   └── api/jev/decision/route.ts   # POST — endpoint de decisión de Jev
├── components/
│   ├── GameTable.tsx               # Paño de juego, bazas, banner de Envido
│   ├── CardView.tsx                # Naipe español + iconos SVG de palo
│   ├── ScoreBoard.tsx              # Tanteador con fósforos + log
│   ├── ActionControls.tsx          # Cantos, Quiero/No Quiero, mazo
│   ├── JevInspector.tsx            # Drawer inspector (decisión/schema/state/history)
│   ├── RulesModal.tsx              # Reglamento completo del Truco
│   └── SettingsModal.tsx           # Puntaje objetivo (15/30) y sonido
├── lib/
│   ├── truco/
│   │   ├── cards.ts                # Baraja, jerarquía, cálculo de envido, shuffle, deal
│   │   ├── rules.ts                # resolveTrick / resolveHand / resolveEnvidoWinner, constantes
│   │   ├── game-machine.ts         # Máquina de estados pura: MatchState + transiciones
│   │   ├── useTrucoGame.ts         # Hook React: orquesta turnos, cantos y llamadas a Jev
│   │   └── types.ts                # Tipos del dominio
│   ├── jev/
│   │   ├── types.ts                # JevState, JevDecisionRequest/Response, primitivas
│   │   ├── simulator.ts            # Heurística local calibrada + builder de preguntas
│   │   └── client.ts               # Cliente live (fetch + timeout + fallback)
│   └── sound/audio.ts              # SoundController (WAV + Web Audio fallback)
├── test/                           # node:test — reglas, máquina, motor Jev, UI
├── public/sounds/cantos/*.wav      # Clips de voz de los cantos
└── odd/tasks/                      # Documentos de feature / bitácora de tareas
```

---

## 🏗️ Arquitectura

El motor del juego es **puro y sin React**: `game-machine.ts` expone funciones `(MatchState, …) => MatchState`. El hook `useTrucoGame` es la única capa con estado y efectos, y es quien decide cuándo preguntarle a Jev. Los componentes son presentacionales y reciben callbacks.

```
┌─ UI (GameTable · ActionControls · ScoreBoard)
│        │ callbacks
│        ▼
│  useTrucoGame  ── valida acciones (canPlay / canEnvido / canTruco)
│        │ transición pura
│        ▼
│  game-machine.ts (MatchState)          ◄── startNewMatch · playPlayerCard
│        │                                        callEnvido · respondTruco · foldHand …
│        │ turno de Jev
│        ▼
│  POST /api/jev/decision  { state, context }
│        │
│        ▼
│  getJevDecision()
│        ├── sin key · timeout 5s · error ──► simulateJevDecision()  → mode: local_simulator
│        └── con key ─────────────────────► fetch(endpoint)          → mode: live_api
│        │
│        ▼
│  state.lastJevDecision + decisionHistory ──► JevInspector
```

### Los 4 contextos de decisión

Las decisiones de Jev se agrupan en **4 contextos**. Ojo: en su turno puede encadenar dos llamadas — primero `initiate_call` (si hay canto legal) y después `play_card`.

| `context` | Cuándo | Qué decide | Keys de `choices` (simulador) |
| --- | --- | --- | --- |
| `play_card` | Es turno de Jev y hay carta que jugar | Qué carta tirar (+ canto opcional) | `card`, `action`, `play_card`, `call`, `call_truco` |
| `respond_envido` | Vos cantaste Envido | `quiero` / `no_quiero` / `real_envido` / `falta_envido` | `action`, `envido_response` |
| `respond_truco` | Vos cantaste Truco | `quiero` / `no_quiero` / `retruco` / `vale_cuatro` | `action`, `truco_response` |
| `initiate_call` | Antes de jugar, si hay canto legal | `envido` / `real_envido` / `falta_envido` / `truco` / `retruco` / `vale_cuatro` / `none` | `action`, `call` |

> En modo `live_api` las keys pueden variar según lo que devuelva el modelo — el cliente las normaliza (`card ?? play_card`, `action ?? truco_response ?? envido_response`). Mirá siempre `decisionSummary` para el texto canónico.

### Primitivas System One

| Primitiva | Forma | Uso típico |
| --- | --- | --- |
| **`Choice`** | `{ choice, confidence }` | Carta a jugar, respuesta a un canto |
| **`Noul`** | `{ probability }` | Probabilidad de farol (`bluffing_probability`) |
| **`Score`** | `{ score }` 0–100 | Fuerza de mano (`hand_confidence`) |

---

## 🔌 API: `POST /api/jev/decision`

### Request

```jsonc
{
  "state": {
    "hand": [ /* las 3 cartas de Jev */ ],
    "round": 2,                    // 1 | 2 | 3
    "tableTricks": [ /* bazas */ ],
    "currentBid": { "type": "truco", "offeredBy": "player", "level": 1 },
    "score": { "player": 11, "jev": 9, "target": 30 },
    "mano": "jev",
    "trucoLevel": 1,
    "envidoPlayed": false
  },
  "context": "respond_truco"       // play_card | respond_envido | respond_truco | initiate_call
}
```

**Resolución de credenciales** (en orden): header `x-jev-api-key` → `x-typesafe-api-key` → `Authorization: Bearer …` → `body.apiKey` → `process.env.JEV_API_KEY` → `process.env.TYPESAFE_API_KEY`.

Headers opcionales: `x-jev-endpoint`, `x-jev-model` (también aceptados en el body).

**Errores**: `400` JSON inválido / faltan `state` y `context` / `context` desconocido · `500` error interno.

### Response

```jsonc
{
  "mode": "live_api",              // o "local_simulator"
  "latencyMs": 41,
  "choices":  { "action": { "choice": "quiero", "confidence": 0.82 } },
  "nouls":    { "bluffing_probability": { "probability": 0.35 } },
  "scores":   { "hand_confidence": { "score": 74 } },
  "decisionSummary": "Jev acepta el Truco (¡Quiero!) (82% certeza) • fuerza evaluada en 74/100 [Inferencia live jev-1.13-free en 41ms]",
  "questions": { /* esquema de preguntas enviado, para el inspector */ },
  "model": "jev-1.13-free",
  "context": "respond_truco"
}
```

El inspector renderiza `choices`, `nouls`, `scores`, `questions`, `latencyMs` y `mode`; el `decisionSummary` es el texto narrativo del historial.

---

## 🎴 Reglas implementadas

Resumen (el reglamento completo está en **📜 Reglas** dentro de la app):

- **Baraja española** de 40 cartas (sin 8 ni 9). Jerarquía: 1 de Espada → 1 de Basto → 7 de Espada → 7 de Oro → 3 → 2 → 1 falsos (Oro/Copa) → 12 → 11 → 10 → **7 falsos** (Basto/Copa) → 6 → 5 → 4.
- **Envido**: se suman las dos mejores cartas del mismo palo **+20**; las figuras (10, 11, 12) valen 0. Si no hay dos cartas del mismo palo, cuenta sola la de mayor valor. Gana el mayor, empata la mano.
- **Puntos de Envido**: Envido 2 · Real Envido 3 · Falta Envido = lo que le falta al líder para llegar al target (mínimo 1). Aceptado, se suman los cantos: `envido+envido` = 4 · `envido+real` = 5 · `envido+envido+real` = 7. Rechazado: 1 punto por el primer canto, o los puntos del canto anterior si era una suba.
- **Puntos de Truco**: sin canto, la mano vale **1**. Aceptado: Truco **2** · Retruco **3** · Vale Cuatro **4**. Rechazado: **1 / 2 / 3** según el canto (declina y se queda con lo cantado).
- **Manos**: 3 rondas; gana 2 de 3, con desempate por mano en caso de parda (1ª parda → gana la 2ª; 2ª parda → gana la 1ª; triple parda → la mano).
- **Límite**: tanteador a **15** o **30** puntos (configurable en Ajustes).

---

## 🧪 Testing

```bash
npm test                                # todo
node --test test/truco-rules.test.js    # un archivo
```

| Archivo | Cubre |
| --- | --- |
| `test/truco-rules.test.js` (27) | Baraja, comparación de cartas, combinaciones de Envido, parda y desempates, constantes de puntos. |
| `test/game-machine.test.js` (21) | Init, alternancia de turnos, jugada de carta y resolución de baza, flujo de Envido/Truco completo, rendición, victoria, validadores. |
| `test/jev-engine.test.js` (22) | Builder de preguntas, decisiones del simulador por contexto, cliente con fallback, formato System One y el route handler. |
| `test/ui-components.test.js` (6) | Cobertura de los 40 naipes y robustez del `SoundController` en Node. |

**Total: 92 tests en 24 suites.**

Corren con el runner nativo de Node (`node:test` + `node:assert/strict`) — sin Jest ni Vitest.

---

## 📌 Notas de diseño

- **Imports con extensión `.ts` explícita** (`./types.ts`): habilitado por `allowImportingTsExtensions` en `tsconfig.json`, necesario para que Node importe el TS directamente en los tests. Es consistente en todo el repo; no lo "corrijas" quitando la extensión.
- **webpack, no Turbopack**: los scripts usan `--webpack` explícitamente para mantener el build estable.
- **Tailwind CSS v4** vía `@tailwindcss/postcss` (sin `tailwind.config.js`: se configura con `@theme` en CSS).
- **Sin base de datos ni multiplayer**: todo el estado vive en memoria en el cliente; al refrescar, empieza un partido nuevo.
- **Hidratación**: la app difiere el render con `useSyncExternalStore` para evitar mismatch de SSR (ver `app/page.tsx`).
- **Fallback en cascada de Jev**: primero decide `getJevDecision()` (`lib/jev/client.ts`) — sin key, timeout de 5s o error HTTP → simulador local. Encima, si el `fetch` a `/api/jev/decision` ni siquiera llega (dev server caído, red), el hook reintenta llamando al simulador desde el cliente. La partida nunca se traba por la IA.
- **Orígenes de desarrollo**: `next.config.ts` lista `allowedDevOrigins` para acceder desde una IP local o un túnel de Cloudflare.
- **Bitácora de features**: `odd/tasks/*.md` documenta el alcance, checklist y evidencia de verificación de cada feature.

### Limitaciones conocidas

- **Envido "1-2-3 del mismo palo" = 31**: `calculateEnvido` (`lib/truco/cards.ts`) suma simplemente las dos mejores del palo +20, por lo que 1-2-3 del mismo palo da **25** y no 31. Es el único caso especial de la regla oficial que no está contemplado (ver `test/truco-rules.test.js` para los casos que sí cubre).
- **Props muertas en `SettingsModal`**: `apiKey` y `onSaveApiKey` siguen declaradas en la interfaz y se pasan desde `app/page.tsx`, pero el componente ya no las usa (se eliminó el campo junto a la configuración de servidor). `setApiKey` del hook quedó sin UI que lo llame, salvo escribiendo a mano en `localStorage`.

---

## 📂 Estado

Proyecto en desarrollo activo (v0.1.0). Ver `odd/tasks/` para el detalle de las 16 tareas completadas de la feature principal.
