import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import http from 'node:http';
import { getCard } from '../lib/truco/cards.ts';
import { simulateJevDecision, buildQuestionsForContext } from '../lib/jev/simulator.ts';
import { computeJevContext, sampleChoiceFromProbabilities } from '../lib/jev/analysis.ts';
import { getJevDecision, formatQuestionsForSystemOne } from '../lib/jev/client.ts';
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

      // Verify formatQuestionsForSystemOne produces a valid flat dictionary
      const flat = formatQuestionsForSystemOne(q);
      for (const item of Object.values(flat)) {
        assert.ok(['choice', 'noul', 'score'].includes(item.type));
        assert.ok(typeof item.instructions === 'string' && item.instructions.length > 0);
        if (item.type === 'choice') {
          assert.ok(typeof item.criteria === 'object' && item.criteria !== null);
        } else if (item.type === 'score') {
          assert.ok(Array.isArray(item.criteria));
        }
      }
    }
  });

  it('writes instructions in English with backticked state paths', () => {
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
      const all = [
        ...Object.values(q.choices || {}),
        ...Object.values(q.nouls || {}),
        ...Object.values(q.scores || {}),
      ];
      for (const item of all) {
        assert.ok(
          /`[a-zA-Z]/.test(item.instructions),
          `Context ${context} instructions must reference state with backticked paths: "${item.instructions}"`
        );
      }
    }
  });
});

describe('Jev Decision Engine - Computed State', () => {
  it('computes envido points, card ranks and trick record', () => {
    const state = {
      hand: [getCard(7, 'espada'), getCard(6, 'espada'), getCard(4, 'copa')],
      allCardsJev: [getCard(7, 'espada'), getCard(6, 'espada'), getCard(4, 'copa')],
      round: 2,
      tableTricks: [
        { trickNumber: 1, playerCard: getCard(2, 'oro'), jevCard: getCard(3, 'copa'), winner: 'jev' },
      ],
      currentBid: { type: 'truco', offeredBy: 'player' },
      score: { player: 10, jev: 14, target: 30 },
      mano: 'player',
    };

    const computed = computeJevContext(state);
    assert.equal(computed.envidoPoints, 33); // 7+6 espada + 20
    assert.equal(computed.maxRank, 12); // 7 de espada
    assert.equal(computed.strongCardCount, 1);
    assert.equal(computed.cardRanks.length, 3);
    assert.equal(computed.cardRanks[0].id, '7_espada');
    assert.deepEqual(computed.trickRecord, { jev: 1, player: 0, ties: 0 });
    assert.equal(computed.pointsAtStake, 2);
    assert.equal(computed.inBuenas, false);
    assert.equal(computed.scorePressure, 'low');
  });

  it('detects canBeatPlayerCard and lowestWinningCardId', () => {
    const state = {
      hand: [getCard(1, 'espada'), getCard(3, 'basto'), getCard(4, 'copa')],
      round: 1,
      tableTricks: [{ trickNumber: 1, playerCard: getCard(2, 'oro') }],
      playerCardOnTable: getCard(2, 'oro'),
      currentBid: null,
      score: { player: 0, jev: 0, target: 30 },
      mano: 'player',
    };

    const computed = computeJevContext(state);
    assert.equal(computed.canBeatPlayerCard, true);
    assert.equal(computed.lowestWinningCardId, '3_basto'); // lowest card that still kills rank 9
  });

  it('marks scorePressure critical when points at stake decide the match', () => {
    const state = {
      hand: [getCard(4, 'copa')],
      round: 3,
      tableTricks: [],
      currentBid: { type: 'vale_cuatro', offeredBy: 'player' },
      score: { player: 28, jev: 27, target: 30 },
      mano: 'player',
    };

    const computed = computeJevContext(state);
    assert.equal(computed.pointsAtStake, 4);
    assert.equal(computed.inBuenas, true);
    assert.equal(computed.scorePressure, 'critical');
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
    const trials = 50;
    for (let i = 0; i < trials; i++) {
      const decision = simulateJevDecision({ state, context: 'respond_truco' });
      if (decision.choices.action.choice === 'no_quiero') {
        noQuieroCount++;
      }
    }
    // High probability of no_quiero (>= 75%)
    assert.ok(noQuieroCount >= 38, `Expected at least 38/50 no_quiero, got ${noQuieroCount}`);
  });
});

describe('Jev Decision Engine - Probabilities & Composition', () => {
  it('emits a probability distribution over choice options', () => {
    const state = {
      hand: [getCard(1, 'espada'), getCard(3, 'copa'), getCard(4, 'oro')],
      round: 1,
      tableTricks: [],
      currentBid: null,
      trucoLevel: 0,
      score: { player: 0, jev: 0, target: 30 },
      mano: 'jev',
    };

    const decision = simulateJevDecision({ state, context: 'play_card' });
    const cardResult = decision.choices.card;
    assert.ok(cardResult.probabilities, 'card choice must carry probabilities');
    const total = Object.values(cardResult.probabilities).reduce((s, p) => s + p, 0);
    assert.ok(Math.abs(total - 1) < 0.001, `probabilities must sum to ~1, got ${total}`);
    assert.equal(cardResult.probabilities[cardResult.choice], cardResult.confidence);
  });

  it('emits atomic nouls for respond_truco', () => {
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
    assert.ok(decision.nouls.jev_can_win_hand, 'must emit jev_can_win_hand');
    assert.ok(decision.nouls.opponent_likely_bluffing, 'must emit opponent_likely_bluffing');
    assert.ok(decision.nouls.jev_can_win_hand.probability > 0.5);
  });

  it('sampleChoiceFromProbabilities respects the distribution', () => {
    const result = {
      choice: 'a',
      confidence: 0.9,
      probabilities: { a: 0.9, b: 0.1 },
    };
    const always = sampleChoiceFromProbabilities(result, () => 0.5);
    assert.equal(always, 'a');
    const tail = sampleChoiceFromProbabilities(result, () => 0.95);
    assert.equal(tail, 'b');
    const noProbs = sampleChoiceFromProbabilities({ choice: 'x', confidence: 0.8 });
    assert.equal(noProbs, 'x');
  });

  it('composes live answers: vetoes a raise when jev_can_win_hand is low', async () => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          choices: {
            action: { choice: 'retruco', confidence: 0.9 },
          },
          nouls: {
            jev_can_win_hand: { noul: 0.1 },
            opponent_likely_bluffing: { noul: 0.1 },
          },
          scores: { hand_confidence: { score: 80 } },
        })
      );
    });
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    try {
      const state = {
        hand: [getCard(4, 'copa'), getCard(5, 'basto')],
        round: 2,
        tableTricks: [
          { trickNumber: 1, playerCard: getCard(1, 'espada'), jevCard: getCard(6, 'oro'), winner: 'player' },
        ],
        currentBid: { type: 'truco', offeredBy: 'player' },
        score: { player: 0, jev: 0, target: 30 },
        mano: 'player',
      };
      const decision = await getJevDecision(
        { state, context: 'respond_truco' },
        'test-key',
        { endpoint: `http://127.0.0.1:${port}/systemone` }
      );
      assert.equal(decision.mode, 'live_api');
      assert.equal(
        decision.choices.action.choice,
        'quiero',
        'raise must be vetoed when win probability is low'
      );
      assert.equal(decision.choices.truco_response.choice, 'quiero');
    } finally {
      server.close();
    }
  });

  it('recalibrates a low-confidence live answer with the local heuristic', async () => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          choices: { action: { choice: 'no_quiero', confidence: 0.2 } },
          nouls: {},
          scores: {},
        })
      );
    });
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    try {
      // Strong hand + won trick 1 → local heuristic accepts/raises.
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
      const decision = await getJevDecision(
        { state, context: 'respond_truco' },
        'test-key',
        { endpoint: `http://127.0.0.1:${port}/systemone` }
      );
      assert.equal(decision.mode, 'live_api');
      assert.notEqual(
        decision.choices.action.choice,
        'no_quiero',
        'a 20%-confidence fold on a strong hand must be recalibrated'
      );
    } finally {
      server.close();
    }
  });
});

describe('Jev Decision Engine - Unified Opening Call (single request)', () => {
  it('emits opening_call question and decision when availableCalls are provided', () => {
    // Strong hand: 1 espada + 3 copa, truco legal → should sing truco in the same request
    const state = {
      hand: [getCard(1, 'espada'), getCard(3, 'copa'), getCard(4, 'oro')],
      allCardsJev: [getCard(1, 'espada'), getCard(3, 'copa'), getCard(4, 'oro')],
      round: 1,
      envidoPlayed: true,
      trucoLevel: 0,
      tableTricks: [],
      currentBid: null,
      score: { player: 0, jev: 0, target: 30 },
      mano: 'jev',
      availableCalls: ['truco'],
    };

    let trucoCalls = 0;
    for (let i = 0; i < 20; i++) {
      const decision = simulateJevDecision({ state, context: 'play_card' });
      assert.ok(decision.choices.opening_call, 'play_card must emit opening_call when calls are legal');
      assert.ok(decision.questions.choices.opening_call.criteria.truco);
      assert.ok(decision.questions.choices.opening_call.criteria.none);
      if (decision.choices.opening_call.choice === 'truco') trucoCalls++;
    }
    assert.ok(trucoCalls >= 15, `Expected mostly truco openings with a strong hand, got ${trucoCalls}/20`);
  });

  it('emits no opening_call when availableCalls is empty or absent', () => {
    const state = {
      hand: [getCard(4, 'copa'), getCard(5, 'espada'), getCard(10, 'oro')],
      round: 1,
      tableTricks: [],
      currentBid: null,
      score: { player: 0, jev: 0, target: 30 },
      mano: 'player',
    };

    const withoutField = simulateJevDecision({ state, context: 'play_card' });
    assert.equal(withoutField.choices.opening_call, undefined);
    assert.equal(withoutField.questions.choices.opening_call, undefined);

    const empty = simulateJevDecision({
      state: { ...state, availableCalls: [] },
      context: 'play_card',
    });
    assert.equal(empty.choices.opening_call, undefined);
  });

  it('opens envido through play_card when it is legal and tantos are high', () => {
    const state = {
      hand: [getCard(7, 'espada'), getCard(6, 'espada'), getCard(4, 'copa')],
      allCardsJev: [getCard(7, 'espada'), getCard(6, 'espada'), getCard(4, 'copa')],
      round: 1,
      envidoPlayed: false,
      trucoLevel: 0,
      tableTricks: [],
      currentBid: null,
      score: { player: 0, jev: 0, target: 30 },
      mano: 'jev',
      availableCalls: ['envido', 'real_envido', 'falta_envido', 'truco'],
    };

    let envidoCalls = 0;
    for (let i = 0; i < 20; i++) {
      const decision = simulateJevDecision({ state, context: 'play_card' });
      const choice = decision.choices.opening_call.choice;
      if (choice === 'envido' || choice === 'real_envido') envidoCalls++;
    }
    assert.ok(envidoCalls >= 18, `Expected envido/real_envido openings with 33 tantos, got ${envidoCalls}/20`);
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

describe('Jev Decision Engine - Proactive Canto Initiation (initiate_call)', () => {
  it('builds dynamic criteria based on round, envidoPlayed, and trucoLevel', () => {
    const baseState = {
      hand: [getCard(7, 'espada'), getCard(6, 'espada'), getCard(4, 'copa')],
      score: { player: 0, jev: 0, target: 30 },
      mano: 'jev',
      tableTricks: [],
    };

    // Round 1, envido not played, truco level 0
    const q1 = buildQuestionsForContext('initiate_call', {
      ...baseState,
      round: 1,
      envidoPlayed: false,
      trucoLevel: 0,
    });
    const crit1 = q1.choices.action.criteria;
    assert.ok(crit1.envido, 'Must offer envido in round 1');
    assert.ok(crit1.real_envido, 'Must offer real_envido in round 1');
    assert.ok(crit1.falta_envido, 'Must offer falta_envido in round 1');
    assert.ok(crit1.truco, 'Must offer truco when level is 0');
    assert.ok(crit1.none, 'Must offer none');
    assert.equal(crit1.retruco, undefined);
    assert.equal(crit1.vale_cuatro, undefined);

    // Round 2, envido played, truco level 0
    const q2 = buildQuestionsForContext('initiate_call', {
      ...baseState,
      round: 2,
      envidoPlayed: true,
      trucoLevel: 0,
    });
    const crit2 = q2.choices.action.criteria;
    assert.equal(crit2.envido, undefined, 'Envido must not be offered in round 2');
    assert.ok(crit2.truco, 'Must offer truco in round 2 when level is 0');

    // Round 2, truco accepted (level 1), player offered truco
    const q3 = buildQuestionsForContext('initiate_call', {
      ...baseState,
      round: 2,
      envidoPlayed: true,
      trucoLevel: 1,
      trucoOfferedBy: 'player',
    });
    const crit3 = q3.choices.action.criteria;
    assert.ok(crit3.retruco, 'Must offer retruco when truco was accepted from player');
    assert.equal(crit3.truco, undefined);
    assert.equal(crit3.vale_cuatro, undefined);

    // Round 2, retruco accepted (level 2), player offered retruco
    const q4 = buildQuestionsForContext('initiate_call', {
      ...baseState,
      round: 2,
      envidoPlayed: true,
      trucoLevel: 2,
      trucoOfferedBy: 'player',
    });
    const crit4 = q4.choices.action.criteria;
    assert.ok(crit4.vale_cuatro, 'Must offer vale_cuatro when retruco was accepted from player');
    assert.equal(crit4.retruco, undefined);
  });

  it('initiates envido in round 1 with high tantos (33 puntos)', () => {
    const state = {
      hand: [getCard(7, 'espada'), getCard(6, 'espada'), getCard(4, 'copa')],
      allCardsJev: [getCard(7, 'espada'), getCard(6, 'espada'), getCard(4, 'copa')],
      round: 1,
      envidoPlayed: false,
      trucoLevel: 0,
      tableTricks: [],
      score: { player: 0, jev: 0, target: 30 },
      mano: 'jev',
    };

    let calledEnvido = 0;
    for (let i = 0; i < 20; i++) {
      const decision = simulateJevDecision({ state, context: 'initiate_call' });
      const choice = decision.choices.action.choice;
      if (choice === 'envido' || choice === 'real_envido') {
        calledEnvido++;
      }
      assert.ok(decision.scores.hand_confidence.score >= 90);
    }
    assert.equal(calledEnvido, 20, 'Should always initiate envido or real_envido with 33 as mano');
  });

  it('initiates truco in round 2 when Jev won trick 1', () => {
    const state = {
      hand: [getCard(2, 'espada'), getCard(4, 'copa')],
      round: 2,
      envidoPlayed: true,
      trucoLevel: 0,
      tableTricks: [
        { trickNumber: 1, playerCard: getCard(4, 'espada'), jevCard: getCard(7, 'espada'), winner: 'jev' },
      ],
      score: { player: 0, jev: 0, target: 30 },
      mano: 'player',
    };

    let trucoCalls = 0;
    for (let i = 0; i < 30; i++) {
      const decision = simulateJevDecision({ state, context: 'initiate_call' });
      if (decision.choices.action.choice === 'truco') {
        trucoCalls++;
      }
    }
    assert.ok(trucoCalls >= 20, 'Jev should shout truco majority of the time after winning trick 1 (el que hace primera manda)');
  });

  it('initiates retruco when truco level is 1 and Jev has strong position', () => {
    const state = {
      hand: [getCard(1, 'espada'), getCard(4, 'copa')],
      round: 2,
      envidoPlayed: true,
      trucoLevel: 1,
      trucoOfferedBy: 'player',
      tableTricks: [
        { trickNumber: 1, playerCard: getCard(4, 'espada'), jevCard: getCard(7, 'espada'), winner: 'jev' },
      ],
      score: { player: 0, jev: 0, target: 30 },
      mano: 'player',
    };

    let retrucoCalls = 0;
    for (let i = 0; i < 30; i++) {
      const decision = simulateJevDecision({ state, context: 'initiate_call' });
      if (decision.choices.action.choice === 'retruco') {
        retrucoCalls++;
      }
    }
    assert.ok(retrucoCalls >= 15, 'Jev should shout retruco when holding Ancho de Espada and winning trick 1');
  });

  it('initiates vale cuatro when truco level is 2 and Jev has cartas bravas', () => {
    const state = {
      hand: [getCard(1, 'espada')],
      round: 3,
      envidoPlayed: true,
      trucoLevel: 2,
      trucoOfferedBy: 'player',
      tableTricks: [
        { trickNumber: 1, playerCard: getCard(4, 'espada'), jevCard: getCard(7, 'espada'), winner: 'jev' },
        { trickNumber: 2, playerCard: getCard(3, 'copa'), jevCard: getCard(4, 'copa'), winner: 'player' },
      ],
      score: { player: 0, jev: 0, target: 30 },
      mano: 'player',
    };

    let valeCuatroCalls = 0;
    for (let i = 0; i < 30; i++) {
      const decision = simulateJevDecision({ state, context: 'initiate_call' });
      if (decision.choices.action.choice === 'vale_cuatro') {
        valeCuatroCalls++;
      }
    }
    assert.ok(valeCuatroCalls >= 15, 'Jev should shout vale cuatro with Ancho de Espada in trick 3');
  });
});

