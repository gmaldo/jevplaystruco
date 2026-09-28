import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { getCard } from '../lib/truco/cards.ts';
import { simulateJevDecision, buildQuestionsForContext } from '../lib/jev/simulator.ts';
import { getJevDecision } from '../lib/jev/client.ts';
import { POST } from '../app/api/jev/decision/route.ts';

describe('Jev Decision Engine - Questions Builder', () => {
  it('builds structured questions matching TypeSafe AI primitives for all contexts', () => {
    const dummyState = {
      hand: [getCard(7, 'espada'), getCard(6, 'espada'), getCard(1, 'copa')],
      round: 1,
      tableTricks: [],
      currentBid: null,
      score: { player: 0, jev: 0, target: 30 },
      mano: 'player',
    };

    for (const context of ['play_card', 'respond_envido', 'respond_truco', 'initiate_call']) {
      const q = buildQuestionsForContext(context, dummyState);
      assert.ok(q.choices, `Context ${context} must provide choices`);
      assert.ok(q.nouls, `Context ${context} must provide nouls`);
      assert.ok(q.scores, `Context ${context} must provide scores`);
    }
  });
});

describe('Jev Decision Engine - Envido Responses', () => {
  it('responds with quiero or raise when holding high envido points (>= 31)', () => {
    // 7 espada + 6 espada = 33 puntos
    const state = {
      hand: [getCard(7, 'espada'), getCard(6, 'espada'), getCard(4, 'copa')],
      allCardsJev: [getCard(7, 'espada'), getCard(6, 'espada'), getCard(4, 'copa')],
      round: 1,
      tableTricks: [],
      currentBid: { type: 'envido', offeredBy: 'player' },
      score: { player: 0, jev: 0, target: 30 },
      mano: 'player',
    };

    // Run multiple iterations to verify heuristic distribution
    let raisesOrQuiero = 0;
    for (let i = 0; i < 20; i++) {
      const decision = simulateJevDecision({ state, context: 'respond_envido' });
      assert.equal(decision.mode, 'local_simulator');
      assert.ok(decision.latencyMs > 0);
      assert.ok(decision.scores.hand_confidence.score >= 85, 'Hand confidence should be >= 85 for 33 envido');
      assert.ok(decision.nouls.bluffing_probability.probability <= 0.1, 'Bluff probability should be very low');

      const choice = decision.choices.action.choice;
      if (choice === 'quiero' || choice === 'real_envido' || choice === 'falta_envido') {
        raisesOrQuiero++;
      }
    }
    assert.equal(raisesOrQuiero, 20, 'All decisions for 33 envido should accept or raise');
  });

  it('responds with quiero when holding good envido points (27 to 30)', () => {
    // 7 de oro + 1 de oro = 28 puntos
    const state = {
      hand: [getCard(7, 'oro'), getCard(1, 'oro'), getCard(4, 'basto')],
      allCardsJev: [getCard(7, 'oro'), getCard(1, 'oro'), getCard(4, 'basto')],
      round: 1,
      tableTricks: [],
      currentBid: { type: 'envido', offeredBy: 'player' },
      score: { player: 5, jev: 5, target: 30 },
      mano: 'player',
    };

    for (let i = 0; i < 10; i++) {
      const decision = simulateJevDecision({ state, context: 'respond_envido' });
      assert.equal(decision.choices.action.choice, 'quiero');
      assert.ok(decision.scores.hand_confidence.score >= 65);
      assert.ok(decision.nouls.bluffing_probability.probability < 0.15);
    }
  });

  it('responds with no_quiero when holding weak envido (< 27) without high rival pressure', () => {
    // 4 de copa + 5 de espada + 10 de oro = 5 puntos
    const state = {
      hand: [getCard(4, 'copa'), getCard(5, 'espada'), getCard(10, 'oro')],
      allCardsJev: [getCard(4, 'copa'), getCard(5, 'espada'), getCard(10, 'oro')],
      round: 1,
      tableTricks: [],
      currentBid: { type: 'envido', offeredBy: 'player' },
      score: { player: 2, jev: 2, target: 30 },
      mano: 'player',
    };

    const decision = simulateJevDecision({ state, context: 'respond_envido' });
    assert.equal(decision.choices.action.choice, 'no_quiero');
    assert.ok(decision.scores.hand_confidence.score < 50);
  });

  it('can execute calibrated tactical bluffs when rival has high score', () => {
    // Weak hand but rival has 24 points in a 30-point game
    const state = {
      hand: [getCard(4, 'copa'), getCard(5, 'espada'), getCard(10, 'oro')],
      allCardsJev: [getCard(4, 'copa'), getCard(5, 'espada'), getCard(10, 'oro')],
      round: 1,
      tableTricks: [],
      currentBid: { type: 'envido', offeredBy: 'player' },
      score: { player: 24, jev: 12, target: 30 },
      mano: 'player',
    };

    let sawBluff = false;
    // With 15% bluff probability, 100 trials is overwhelmingly likely to produce at least 1 bluff
    for (let i = 0; i < 100; i++) {
      const decision = simulateJevDecision({ state, context: 'respond_envido' });
      if (decision.choices.action.choice === 'quiero') {
        sawBluff = true;
        assert.ok(decision.nouls.bluffing_probability.probability > 0.5, 'Bluff must register elevated bluffing probability');
        break;
      }
    }
    assert.ok(sawBluff, 'Should observe at least one calibrated bluff under rival score pressure in 100 trials');
  });
});

describe('Jev Decision Engine - Card Selection Logic (play_card)', () => {
  it('kills player card with lowest winning card possible', () => {
    // Player played 2 de oro (rank 9)
    // Jev holds: 3 de basto (rank 10), 1 de espada (rank 14), 4 de copa (rank 1)
    // Both 3 (rank 10) and 1 espada (rank 14) can kill 2 (rank 9).
    // Lowest winning card is 3 de basto!
    const state = {
      hand: [getCard(1, 'espada'), getCard(3, 'basto'), getCard(4, 'copa')],
      round: 1,
      tableTricks: [{ trickNumber: 1, playerCard: getCard(2, 'oro') }],
      playerCardOnTable: getCard(2, 'oro'),
      currentBid: null,
      score: { player: 0, jev: 0, target: 30 },
      mano: 'player',
    };

    const decision = simulateJevDecision({ state, context: 'play_card' });
    assert.equal(decision.choices.card.choice, '3_basto', 'Should kill with lowest winning card (3 de basto)');
    assert.ok(decision.decisionSummary.includes('mata'));
  });

  it('discards lowest card when cannot kill player card', () => {
    // Player played 1 de espada (rank 14, unbeatable)
    // Jev holds: 2 de copa (rank 9), 7 de basto (rank 4), 4 de espada (rank 1)
    // None can kill rank 14. Lowest card is 4 de espada (rank 1).
    const state = {
      hand: [getCard(2, 'copa'), getCard(7, 'basto'), getCard(4, 'espada')],
      round: 1,
      tableTricks: [{ trickNumber: 1, playerCard: getCard(1, 'espada') }],
      playerCardOnTable: getCard(1, 'espada'),
      currentBid: null,
      score: { player: 0, jev: 0, target: 30 },
      mano: 'player',
    };

    const decision = simulateJevDecision({ state, context: 'play_card' });
    assert.equal(decision.choices.card.choice, '4_espada', 'Should discard lowest card (4 de espada)');
    assert.ok(decision.decisionSummary.includes('descarta'));
  });

  it('leads with medium card in trick 1 when holding strong backup cards', () => {
    // Jev is mano (1st to play).
    // Holds 1 de espada (rank 14), 2 de copa (rank 9), 4 de oro (rank 1).
    // Leading strategy should lead medium card (2 de copa, rank 9) to probe and reserve 1 espada.
    const state = {
      hand: [getCard(1, 'espada'), getCard(2, 'copa'), getCard(4, 'oro')],
      round: 1,
      tableTricks: [],
      playerCardOnTable: null,
      currentBid: null,
      score: { player: 0, jev: 0, target: 30 },
      mano: 'jev',
    };

    const decision = simulateJevDecision({ state, context: 'play_card' });
    assert.equal(decision.choices.card.choice, '2_copa');
  });

  it('leads lowest card in trick 1 when hand has no strong cards', () => {
    // Jev is mano. Hand: 5 de copa (rank 2), 6 de oro (rank 3), 4 de espada (rank 1).
    const state = {
      hand: [getCard(5, 'copa'), getCard(6, 'oro'), getCard(4, 'espada')],
      round: 1,
      tableTricks: [],
      playerCardOnTable: null,
      currentBid: null,
      score: { player: 0, jev: 0, target: 30 },
      mano: 'jev',
    };

    const decision = simulateJevDecision({ state, context: 'play_card' });
    assert.equal(decision.choices.card.choice, '4_espada');
  });

  it('suggests calling truco when holding strong cards and truco is not yet called', () => {
    // Jev holds 1 de espada (rank 14) and 3 de copa (rank 10)
    const state = {
      hand: [getCard(1, 'espada'), getCard(3, 'copa'), getCard(4, 'oro')],
      round: 1,
      tableTricks: [],
      playerCardOnTable: null,
      currentBid: null,
      trucoLevel: 0,
      score: { player: 0, jev: 0, target: 30 },
      mano: 'jev',
    };

    const decision = simulateJevDecision({ state, context: 'play_card' });
    assert.equal(decision.choices.call.choice, 'truco');
    assert.ok(decision.nouls.call_truco.probability >= 0.7);
  });
});

describe('Jev Decision Engine - Truco Responses', () => {
  it('accepts or raises truco when holding high cards (rank >= 10)', () => {
    // Jev has 1 de espada (rank 14) and 7 de espada (rank 12)
    const state = {
      hand: [getCard(1, 'espada'), getCard(7, 'espada')],
      round: 2,
      tableTricks: [
        { trickNumber: 1, playerCard: getCard(2, 'oro'), jevCard: getCard(3, 'copa'), winner: 'jev' },
      ],
      currentBid: { type: 'truco', offeredBy: 'player' },
      score: { player: 0, jev: 0, target: 30 },
      mano: 'player',
    };

    const decision = simulateJevDecision({ state, context: 'respond_truco' });
    const choice = decision.choices.action.choice;
    assert.ok(choice === 'quiero' || choice === 'retruco', `Expected quiero or retruco, got: ${choice}`);
    assert.ok(decision.scores.hand_confidence.score >= 80);
    assert.ok(decision.nouls.bluffing_probability.probability < 0.1);
  });

  it('declines truco (no_quiero) when hand is weak and lost 1st trick', () => {
    // Jev lost trick 1 to player
    // Remaining cards are weak: 4 de basto (rank 1) and 5 de copa (rank 2)
    const state = {
      hand: [getCard(4, 'basto'), getCard(5, 'copa')],
      round: 2,
      tableTricks: [
        { trickNumber: 1, playerCard: getCard(1, 'espada'), jevCard: getCard(10, 'copa'), winner: 'player' },
      ],
      currentBid: { type: 'truco', offeredBy: 'player' },
      score: { player: 0, jev: 0, target: 30 },
      mano: 'player',
    };

    let noQuieroCount = 0;
    for (let i = 0; i < 20; i++) {
      const decision = simulateJevDecision({ state, context: 'respond_truco' });
      if (decision.choices.action.choice === 'no_quiero') {
        noQuieroCount++;
      }
    }
    // High probability of no_quiero (>= 80%)
    assert.ok(noQuieroCount >= 16, `Expected at least 16/20 no_quiero, got ${noQuieroCount}`);
  });
});

describe('Jev Client & Graceful Fallback', () => {
  it('falls back to local simulator when no API key is provided', async () => {
    const request = {
      state: {
        hand: [getCard(7, 'espada'), getCard(6, 'espada'), getCard(1, 'copa')],
        allCardsJev: [getCard(7, 'espada'), getCard(6, 'espada'), getCard(1, 'copa')],
        round: 1,
        tableTricks: [],
        currentBid: { type: 'envido', offeredBy: 'player' },
        score: { player: 0, jev: 0, target: 30 },
        mano: 'player',
      },
      context: 'respond_envido',
    };

    const decision = await getJevDecision(request);
    assert.equal(decision.mode, 'local_simulator');
    assert.ok(decision.choices.action);
    assert.ok(decision.scores.hand_confidence);
    assert.ok(decision.nouls.bluffing_probability);
    assert.ok(decision.decisionSummary);
  });

  it('falls back to local simulator if API endpoint fails or is unreachable', async () => {
    const request = {
      state: {
        hand: [getCard(1, 'espada'), getCard(4, 'copa'), getCard(5, 'basto')],
        round: 1,
        tableTricks: [],
        currentBid: null,
        score: { player: 0, jev: 0, target: 30 },
        mano: 'jev',
      },
      context: 'play_card',
    };

    // Provide a dummy key that fails/times out
    const decision = await getJevDecision(request, 'dummy_test_api_key_123');
    assert.equal(decision.mode, 'local_simulator');
    assert.ok(decision.choices.card);
  });
});

describe('Next.js API Route - POST /api/jev/decision', () => {
  it('successfully processes decision request and returns JSON', async () => {
    const payload = {
      state: {
        hand: [getCard(7, 'espada'), getCard(6, 'espada'), getCard(4, 'copa')],
        allCardsJev: [getCard(7, 'espada'), getCard(6, 'espada'), getCard(4, 'copa')],
        round: 1,
        tableTricks: [],
        currentBid: { type: 'envido', offeredBy: 'player' },
        score: { player: 0, jev: 0, target: 30 },
        mano: 'player',
      },
      context: 'respond_envido',
    };

    const req = new Request('http://localhost:3000/api/jev/decision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const response = await POST(req);
    assert.equal(response.status, 200);

    const data = await response.json();
    assert.equal(data.mode, 'local_simulator');
    assert.ok(data.choices.action);
    assert.ok(data.scores.hand_confidence);
    assert.ok(data.nouls.bluffing_probability);
    assert.ok(data.decisionSummary);
  });

  it('returns 400 when missing required fields', async () => {
    const req = new Request('http://localhost:3000/api/jev/decision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: {} }),
    });

    const response = await POST(req);
    assert.equal(response.status, 400);
    const data = await response.json();
    assert.ok(data.error);
  });

  it('returns 400 when given invalid context', async () => {
    const req = new Request('http://localhost:3000/api/jev/decision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: { hand: [] }, context: 'invalid_context_xyz' }),
    });

    const response = await POST(req);
    assert.equal(response.status, 400);
    const data = await response.json();
    assert.ok(data.error.includes('Invalid context'));
  });
});
