import { getJevDecision } from '../../../../lib/jev/client.ts';
import type { JevDecisionRequest } from '../../../../lib/jev/types.ts';

export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { error: 'Invalid JSON body in request' },
        { status: 400 }
      );
    }

    if (!body || typeof body !== 'object') {
      return Response.json(
        { error: 'Invalid request body: expected an object' },
        { status: 400 }
      );
    }

    const requestObj = body as Record<string, unknown>;

    if (!requestObj.state || !requestObj.context) {
      return Response.json(
        { error: 'Missing required fields: state and context are required' },
        { status: 400 }
      );
    }

    const validContexts = ['play_card', 'respond_envido', 'respond_truco', 'initiate_call'];
    if (typeof requestObj.context !== 'string' || !validContexts.includes(requestObj.context)) {
      return Response.json(
        { error: `Invalid context: must be one of ${validContexts.join(', ')}` },
        { status: 400 }
      );
    }

    const apiKey =
      req.headers.get('x-jev-api-key') ||
      req.headers.get('x-typesafe-api-key') ||
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
      (typeof requestObj.apiKey === 'string' && requestObj.apiKey ? requestObj.apiKey : undefined) ||
      process.env.JEV_API_KEY ||
      process.env.TYPESAFE_API_KEY ||
      undefined;

    const endpoint =
      req.headers.get('x-jev-endpoint') ||
      (typeof requestObj.endpoint === 'string' && requestObj.endpoint ? requestObj.endpoint : undefined) ||
      undefined;

    const model =
      req.headers.get('x-jev-model') ||
      (typeof requestObj.model === 'string' && requestObj.model ? requestObj.model : undefined) ||
      undefined;

    const stateObj = requestObj.state as Record<string, unknown> | undefined;
    console.log(
      `[Server /api/jev/decision] 📨 Petición recibida: context="${requestObj.context}", round=${stateObj?.round}, mano=${stateObj?.mano}`
    );

    const decision = await getJevDecision(
      requestObj as unknown as JevDecisionRequest,
      apiKey,
      { endpoint, model }
    );

    console.log(
      `[Server /api/jev/decision] 📤 Decisión devuelta (${decision.mode}, ${decision.latencyMs}ms): ${decision.decisionSummary}`
    );

    return Response.json(decision);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return Response.json({ error: message }, { status: 500 });
  }
}
