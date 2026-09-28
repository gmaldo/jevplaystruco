import type { JevDecisionRequest, JevDecisionResponse } from './types.ts';
import { simulateJevDecision, buildQuestionsForContext } from './simulator.ts';

/**
 * Gets a decision from Jev:
 * - If apiKey or process.env.TYPESAFE_API_KEY is available, calls TypeSafe AI API with 3-second timeout.
 * - If fetch fails, times out, or no API key, falls back gracefully to simulateJevDecision.
 */
export async function getJevDecision(
  request: JevDecisionRequest,
  apiKey?: string
): Promise<JevDecisionResponse> {
  const key = apiKey || (typeof process !== 'undefined' ? process.env.TYPESAFE_API_KEY : undefined);

  if (!key) {
    return simulateJevDecision(request);
  }

  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const questions = buildQuestionsForContext(request.context, request.state);

    const res = await fetch('https://api.typesafe.ai/v1/systemone', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
        'x-api-key': key,
      },
      body: JSON.stringify({
        state: request.state,
        context: request.context,
        questions,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`TypeSafe API responded with status ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    const latencyMs = Date.now() - startTime;

    return {
      mode: 'live_api',
      latencyMs,
      choices: data.choices || {},
      nouls: data.nouls || {},
      scores: data.scores || {},
      decisionSummary: data.decisionSummary || `Decisión TypeSafe AI live en ${latencyMs}ms`,
      questions: data.questions || questions,
    };
  } catch {
    // Graceful fallback to calibrated local simulator
    const fallback = simulateJevDecision(request);
    return {
      ...fallback,
      mode: 'local_simulator',
    };
  }
}
