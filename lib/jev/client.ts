import type { JevDecisionRequest, JevDecisionResponse } from './types.ts';
import { simulateJevDecision, buildQuestionsForContext } from './simulator.ts';

const DEFAULT_ENDPOINT = 'https://opencode.ai/zen/v1/systemone';
const DEFAULT_MODEL = 'jev-1.13-free';
const DEFAULT_API_KEY = '';

export interface JevDecisionOptions {
  endpoint?: string;
  model?: string;
}

/**
 * Gets a decision from Jev:
 * - If apiKey or process.env (JEV_API_KEY || TYPESAFE_API_KEY) is available, calls OpenCode Zen / TypeSafe AI API with 3-second timeout.
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
      : undefined) ||
    DEFAULT_API_KEY;

  if (!key) {
    return simulateJevDecision(request);
  }

  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const questions = buildQuestionsForContext(request.context, request.state);

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
        context: request.context,
        questions,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Jev API responded with status ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    const latencyMs = Date.now() - startTime;
    console.log(`[Jev Client] ✅ Respuesta live exitosa de ${endpoint} en ${latencyMs}ms`);

    return {
      mode: 'live_api',
      latencyMs,
      choices: data.choices || {},
      nouls: data.nouls || {},
      scores: data.scores || {},
      decisionSummary: data.decisionSummary || `Decisión Jev (${model}) live en ${latencyMs}ms`,
      questions: data.questions || questions,
      model: data.model || model,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn(`[Jev Client] ⚠️ No se pudo obtener respuesta live de ${endpoint} (${errorMsg}). Activando simulador local calibrado.`);
    // Graceful fallback to calibrated local simulator
    const fallback = simulateJevDecision(request);
    return {
      ...fallback,
      mode: 'local_simulator',
      model,
    };
  }
}
