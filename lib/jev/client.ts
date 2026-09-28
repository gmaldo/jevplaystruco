import type {
  JevDecisionRequest,
  JevDecisionResponse,
  JevDecisionQuestions,
  SystemOneQuestion,
} from './types.ts';
import { simulateJevDecision, buildQuestionsForContext } from './simulator.ts';

const DEFAULT_ENDPOINT = 'https://opencode.ai/zen/v1/systemone';
const DEFAULT_MODEL = 'jev-1.13-free';

export interface JevDecisionOptions {
  endpoint?: string;
  model?: string;
}

/**
 * Transforms grouped questions into TypeSafe AI / OpenCode Zen System One flat question schema:
 * { [questionId]: { type: 'choice' | 'noul' | 'score', instructions: string, criteria?: ... } }
 */
export function formatQuestionsForSystemOne(
  grouped: JevDecisionQuestions
): Record<string, SystemOneQuestion> {
  const flat: Record<string, SystemOneQuestion> = {};

  if (grouped.choices) {
    for (const [id, q] of Object.entries(grouped.choices)) {
      const criteria: Record<string, string> = {};
      for (const [key, desc] of Object.entries(q.criteria || {})) {
        criteria[key] = desc || key;
      }
      flat[id] = {
        type: 'choice',
        instructions: q.instructions,
        criteria,
      };
    }
  }

  if (grouped.nouls) {
    for (const [id, q] of Object.entries(grouped.nouls)) {
      flat[id] = {
        type: 'noul',
        instructions: q.instructions,
      };
    }
  }

  if (grouped.scores) {
    for (const [id, q] of Object.entries(grouped.scores)) {
      flat[id] = {
        type: 'score',
        instructions: q.instructions,
        criteria: [
          '0-25: Mano débil o baja probabilidad de ganar',
          '26-50: Mano regular con opciones defensivas',
          '51-75: Mano competitiva con buenas chances',
          '76-100: Mano dominante o ganadora',
        ],
      };
    }
  }

  return flat;
}

/**
 * Gets a decision from Jev:
 * - If apiKey or process.env (JEV_API_KEY || TYPESAFE_API_KEY) is available, calls OpenCode Zen / TypeSafe AI API with 5-second timeout.
 * - If fetch fails, times out, or no API key, falls back gracefully to simulateJevDecision.
 */
export async function getJevDecision(
  request: JevDecisionRequest,
  apiKey?: string,
  optionsOrEndpoint?: JevDecisionOptions | string,
  modelOverride?: string
): Promise<JevDecisionResponse> {
  let customEndpoint: string | undefined;
  let customModel: string | undefined;

  if (typeof optionsOrEndpoint === 'object' && optionsOrEndpoint !== null) {
    customEndpoint = optionsOrEndpoint.endpoint;
    customModel = optionsOrEndpoint.model;
  } else if (typeof optionsOrEndpoint === 'string') {
    customEndpoint = optionsOrEndpoint;
    customModel = modelOverride;
  }

  const endpoint =
    customEndpoint ||
    (typeof process !== 'undefined' ? process.env.JEV_ENDPOINT : undefined) ||
    DEFAULT_ENDPOINT;

  const model =
    customModel ||
    (typeof process !== 'undefined' ? process.env.JEV_MODEL : undefined) ||
    DEFAULT_MODEL;

  const key =
    apiKey ||
    (typeof process !== 'undefined'
      ? process.env.JEV_API_KEY || process.env.TYPESAFE_API_KEY
      : undefined);

  if (!key) {
    return simulateJevDecision(request);
  }

  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const questions = buildQuestionsForContext(request.context, request.state);
    const flatQuestions = formatQuestionsForSystemOne(questions);

    console.log(`[Jev Client] 🚀 Conectando a ${endpoint} (modelo: ${model})...`);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
        'x-api-key': key,
      },
      body: JSON.stringify({
        model,
        state: request.state,
        questions: flatQuestions,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      throw new Error(
        `Jev API responded with status ${res.status}: ${res.statusText}${
          errorText ? ` - ${errorText}` : ''
        }`
      );
    }

    const data = await res.json();
    const latencyMs = Date.now() - startTime;
    console.log(`[Jev Client] ✅ Respuesta live exitosa de ${endpoint} en ${latencyMs}ms`);

    // Parse choices
    const choices: Record<string, { choice: string; confidence: number }> = {};
    if (data.choices && typeof data.choices === 'object') {
      for (const [k, val] of Object.entries(data.choices)) {
        const item = val as { choice?: string; confidence?: number };
        choices[k] = {
          choice: item?.choice || '',
          confidence: typeof item?.confidence === 'number' ? item.confidence : 1.0,
        };
      }
    }

    // Parse nouls (supports both { noul: 0.8 } and { probability: 0.8 })
    const nouls: Record<string, { probability: number }> = {};
    if (data.nouls && typeof data.nouls === 'object') {
      for (const [k, val] of Object.entries(data.nouls)) {
        const item = val as { noul?: number; probability?: number };
        nouls[k] = {
          probability:
            typeof item?.probability === 'number'
              ? item.probability
              : typeof item?.noul === 'number'
              ? item.noul
              : 0.5,
        };
      }
    }

    // Parse scores
    const scores: Record<string, { score: number }> = {};
    if (data.scores && typeof data.scores === 'object') {
      for (const [k, val] of Object.entries(data.scores)) {
        const item = val as { score?: number };
        scores[k] = {
          score: typeof item?.score === 'number' ? item.score : 50,
        };
      }
    }

function formatCardDisplay(cardId: string): string {
  const match = cardId.match(/(?:card[-_])?(\d+)[-_](\w+)/);
  if (match) {
    const [, val, suit] = match;
    if (val === '1' && suit === 'espada') return 'Ancho de espada ⚔️';
    if (val === '1' && suit === 'basto') return 'Ancho de basto 🌿';
    const suitEmoji =
      suit === 'espada' ? '⚔️' : suit === 'basto' ? '🌿' : suit === 'oro' ? '🪙' : '🍷';
    return `${val} de ${suit} ${suitEmoji}`;
  }
  return cardId;
}

function generateLiveDecisionSummary(
  request: JevDecisionRequest,
  choices: Record<string, { choice: string; confidence: number }>,
  nouls: Record<string, { probability: number }>,
  scores: Record<string, { score: number }>,
  latencyMs: number,
  model: string
): string {
  const cardChoice = choices.card || choices.play_card;
  const actionChoice = choices.action || choices.envido_response || choices.truco_response;
  const callChoice = choices.call || choices.call_truco;
  const handStrength = scores.hand_confidence?.score ?? scores.hand_strength?.score;
  const bluffProb = nouls.bluffing_probability?.probability ?? nouls.bluff_call?.probability;

  const strengthPart =
    typeof handStrength === 'number'
      ? `fuerza evaluada en ${Math.round(handStrength)}/100`
      : '';
  const bluffPart =
    typeof bluffProb === 'number' && bluffProb >= 0.4
      ? `farol táctico ${Math.round(bluffProb * 100)}%`
      : '';
  const metaDetail = [strengthPart, bluffPart].filter(Boolean).join(', ');

  if (request.context === 'play_card' && cardChoice) {
    const cardName = formatCardDisplay(cardChoice.choice);
    const conf = Math.round((cardChoice.confidence || 1) * 100);
    const callPrefix =
      callChoice && callChoice.choice !== 'none'
        ? `canta ¡${callChoice.choice.toUpperCase()}! y `
        : '';
    return `Jev ${callPrefix}juega ${cardName} (${conf}% certeza) en ronda ${request.state.round}${
      metaDetail ? ` • ${metaDetail}` : ''
    } [Inferencia live ${model} en ${latencyMs}ms]`;
  }

  if (request.context === 'respond_truco' && actionChoice) {
    const conf = Math.round((actionChoice.confidence || 1) * 100);
    const act = actionChoice.choice;
    const actionLabel =
      act === 'quiero'
        ? 'acepta el Truco (¡Quiero!)'
        : act === 'no_quiero'
        ? 'se va al mazo (No Quiero)'
        : act === 'retruco'
        ? 'redobla la apuesta a ¡Retruco!'
        : act === 'vale_cuatro'
        ? 'redobla al máximo con ¡Vale Cuatro!'
        : `decide ${act}`;
    return `Jev ${actionLabel} (${conf}% certeza)${
      metaDetail ? ` • ${metaDetail}` : ''
    } [Inferencia live ${model} en ${latencyMs}ms]`;
  }

  if (request.context === 'respond_envido' && actionChoice) {
    const conf = Math.round((actionChoice.confidence || 1) * 100);
    const act = actionChoice.choice;
    const actionLabel =
      act === 'quiero'
        ? 'acepta el Envido (¡Quiero!)'
        : act === 'no_quiero'
        ? 'declina el Envido (No Quiero)'
        : act === 'real_envido'
        ? 'sube la apuesta a ¡Real Envido!'
        : act === 'falta_envido'
        ? 'sube la apuesta a ¡Falta Envido!'
        : `decide ${act}`;
    return `Jev ${actionLabel} (${conf}% certeza)${
      metaDetail ? ` • ${metaDetail}` : ''
    } [Inferencia live ${model} en ${latencyMs}ms]`;
  }

  if (request.context === 'initiate_call' && actionChoice) {
    const act = actionChoice.choice;
    if (act === 'none') {
      return `Jev decide pasar sin cantar en este turno [Inferencia live ${model} en ${latencyMs}ms]`;
    }
    const conf = Math.round((actionChoice.confidence || 1) * 100);
    return `Jev canta ¡${act.toUpperCase()}! (${conf}% certeza)${
      metaDetail ? ` • ${metaDetail}` : ''
    } [Inferencia live ${model} en ${latencyMs}ms]`;
  }

  return `Decisión Jev (${model}) resuelta en ${latencyMs}ms mediante inferencia System One.`;
}

    let decisionSummary = data.decisionSummary;
    if (!decisionSummary || decisionSummary.startsWith('Decisión Jev')) {
      decisionSummary = generateLiveDecisionSummary(
        request,
        choices,
        nouls,
        scores,
        latencyMs,
        model
      );
    }

    return {
      mode: 'live_api',
      latencyMs,
      choices: Object.keys(choices).length > 0 ? choices : (data.choices || {}),
      nouls: Object.keys(nouls).length > 0 ? nouls : (data.nouls || {}),
      scores: Object.keys(scores).length > 0 ? scores : (data.scores || {}),
      decisionSummary,
      questions,
      model: data.model || model,
      context: request.context,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn(
      `[Jev Client] ⚠️ No se pudo obtener respuesta live de ${endpoint} (${errorMsg}). Activando simulador local calibrado.`
    );
    // Graceful fallback to calibrated local simulator
    const fallback = simulateJevDecision(request);
    return {
      ...fallback,
      mode: 'local_simulator',
      model,
      context: request.context,
    };
  }
}
