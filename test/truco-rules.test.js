import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  createDeck,
  getCard,
  compareCards,
  calculateEnvido,
  shuffleDeck,
  dealHand,
  SUITS,
  VALUES,
} from '../lib/truco/cards.ts';

import {
  resolveTrick,
  resolveHand,
  resolveEnvidoWinner,
  calculateFaltaEnvidoPoints,
  TRUCO_POINTS,
  ENVIDO_POINTS,
} from '../lib/truco/rules.ts';

describe('Deck generation and structure', () => {
  it('creates exactly 40 Spanish cards with no 8s or 9s', () => {
    const deck = createDeck();
    assert.equal(deck.length, 40);

    const values = new Set(deck.map((c) => c.value));
    assert.equal(values.has(8), false);
    assert.equal(values.has(9), false);

    for (const v of VALUES) {
      assert.equal(values.has(v), true);
    }
  });

  it('generates 40 unique card IDs and 10 cards per suit', () => {
    const deck = createDeck();
    const ids = new Set(deck.map((c) => c.id));
    assert.equal(ids.size, 40);

    for (const suit of SUITS) {
      const suitCards = deck.filter((c) => c.suit === suit);
      assert.equal(suitCards.length, 10);
    }
  });

  it('correctly populates all Card properties', () => {
    const anchoEspada = getCard(1, 'espada');
    assert.equal(anchoEspada.id, '1_espada');
    assert.equal(anchoEspada.suit, 'espada');
    assert.equal(anchoEspada.value, 1);
    assert.equal(anchoEspada.rank, 14);
    assert.equal(anchoEspada.envidoValue, 1);
    assert.equal(anchoEspada.name, '1 de espada');

    const sotaCopa = getCard(10, 'copa');
    assert.equal(sotaCopa.envidoValue, 0);
    assert.equal(sotaCopa.rank, 5);

    const reyOro = getCard(12, 'oro');
    assert.equal(reyOro.envidoValue, 0);
    assert.equal(reyOro.rank, 7);
  });

  it('shuffles the deck preserving all 40 cards', () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);
    assert.equal(shuffled.length, 40);

    const originalIds = deck.map((c) => c.id).sort();
    const shuffledIds = shuffled.map((c) => c.id).sort();
    assert.deepEqual(shuffledIds, originalIds);
  });

  it('deals 3 cards to player and 3 cards to jev with 34 remaining', () => {
    const deck = createDeck();
    const { player, jev, remainingDeck } = dealHand(deck);

    assert.equal(player.length, 3);
    assert.equal(jev.length, 3);
    assert.equal(remainingDeck.length, 34);

    const allDealt = [...player, ...jev, ...remainingDeck];
    const uniqueIds = new Set(allDealt.map((c) => c.id));
    assert.equal(uniqueIds.size, 40);
  });

  it('throws an error if attempting to deal with fewer than 6 cards', () => {
    assert.throws(() => dealHand([]), /Deck must have at least 6 cards/);
  });
});

describe('Card hierarchy and comparisons', () => {
  it('correctly verifies full Truco hierarchy from 1 de espada down to 4s', () => {
    const anchoEspada = getCard(1, 'espada');   // rank 14
    const anchoBasto = getCard(1, 'basto');     // rank 13
    const sieteEspada = getCard(7, 'espada');   // rank 12
    const sieteOro = getCard(7, 'oro');         // rank 11
    const tres = getCard(3, 'copa');            // rank 10
    const dos = getCard(2, 'espada');           // rank 9
    const anchoFalsoOro = getCard(1, 'oro');    // rank 8
    const anchoFalsoCopa = getCard(1, 'copa');  // rank 8
    const doce = getCard(12, 'basto');          // rank 7
    const once = getCard(11, 'oro');            // rank 6
    const diez = getCard(10, 'espada');         // rank 5
    const sieteFalsoBasto = getCard(7, 'basto');// rank 4
    const sieteFalsoCopa = getCard(7, 'copa');  // rank 4
    const seis = getCard(6, 'oro');             // rank 3
    const cinco = getCard(5, 'copa');           // rank 2
    const cuatro = getCard(4, 'espada');        // rank 1

    assert.equal(compareCards(anchoEspada, anchoBasto), 1);
    assert.equal(compareCards(anchoBasto, sieteEspada), 1);
    assert.equal(compareCards(sieteEspada, sieteOro), 1);
    assert.equal(compareCards(sieteOro, tres), 1);
    assert.equal(compareCards(tres, dos), 1);
    assert.equal(compareCards(dos, anchoFalsoOro), 1);
    assert.equal(compareCards(dos, anchoFalsoCopa), 1);
    assert.equal(compareCards(anchoFalsoOro, doce), 1);
    assert.equal(compareCards(anchoFalsoCopa, doce), 1);
    assert.equal(compareCards(doce, once), 1);
    assert.equal(compareCards(once, diez), 1);
    assert.equal(compareCards(diez, sieteFalsoBasto), 1);
    assert.equal(compareCards(diez, sieteFalsoCopa), 1);
    assert.equal(compareCards(sieteFalsoBasto, seis), 1);
    assert.equal(compareCards(sieteFalsoCopa, seis), 1);
    assert.equal(compareCards(seis, cinco), 1);
    assert.equal(compareCards(cinco, cuatro), 1);

    // Inverted checks
    assert.equal(compareCards(anchoBasto, anchoEspada), -1);
    assert.equal(compareCards(cuatro, cinco), -1);
  });

  it('correctly handles ties between cards of identical rank', () => {
    // 3 espada vs 3 basto -> tie
    const tresEspada = getCard(3, 'espada');
    const tresBasto = getCard(3, 'basto');
    assert.equal(compareCards(tresEspada, tresBasto), 0);

    // 2 oro vs 2 copa -> tie
    assert.equal(compareCards(getCard(2, 'oro'), getCard(2, 'copa')), 0);

    // 1 oro vs 1 copa (anchos falsos) -> tie
    assert.equal(compareCards(getCard(1, 'oro'), getCard(1, 'copa')), 0);

    // 12s -> tie
    assert.equal(compareCards(getCard(12, 'espada'), getCard(12, 'oro')), 0);

    // 11s -> tie
    assert.equal(compareCards(getCard(11, 'basto'), getCard(11, 'copa')), 0);

    // 10s -> tie
    assert.equal(compareCards(getCard(10, 'oro'), getCard(10, 'espada')), 0);

    // 7 falsos (copa vs basto) -> tie
    assert.equal(compareCards(getCard(7, 'copa'), getCard(7, 'basto')), 0);

    // 6s -> tie
    assert.equal(compareCards(getCard(6, 'espada'), getCard(6, 'basto')), 0);

    // 5s -> tie
    assert.equal(compareCards(getCard(5, 'oro'), getCard(5, 'copa')), 0);

    // 4s -> tie
    assert.equal(compareCards(getCard(4, 'espada'), getCard(4, 'oro')), 0);
  });
});

describe('Envido calculation and rules', () => {
  it('calculates 33 for 7 and 6 of same suit', () => {
    const cards = [
      getCard(7, 'espada'),
      getCard(6, 'espada'),
      getCard(1, 'basto'),
    ];
    const result = calculateEnvido(cards);
    assert.equal(result.score, 33);
    assert.equal(result.cardsUsed.length, 2);
    assert.ok(result.cardsUsed.some((c) => c.value === 7 && c.suit === 'espada'));
    assert.ok(result.cardsUsed.some((c) => c.value === 6 && c.suit === 'espada'));
  });

  it('calculates 20 for two figures (10, 11, 12) of same suit', () => {
    const cards = [
      getCard(11, 'copa'),
      getCard(12, 'copa'),
      getCard(4, 'oro'),
    ];
    const result = calculateEnvido(cards);
    assert.equal(result.score, 20);
    assert.equal(result.cardsUsed.length, 2);
    assert.ok(result.cardsUsed.every((c) => c.suit === 'copa'));
  });

  it('picks the highest 2 cards when 3 cards have the same suit', () => {
    // 7, 6, 1 of oro -> 7 + 6 + 20 = 33
    const hand1 = [
      getCard(7, 'oro'),
      getCard(6, 'oro'),
      getCard(1, 'oro'),
    ];
    assert.equal(calculateEnvido(hand1).score, 33);

    // 7, 5, 4 of basto -> 7 + 5 + 20 = 32
    const hand2 = [
      getCard(7, 'basto'),
      getCard(5, 'basto'),
      getCard(4, 'basto'),
    ];
    assert.equal(calculateEnvido(hand2).score, 32);

    // 10, 11, 12 of copa -> 0 + 0 + 20 = 20
    const hand3 = [
      getCard(10, 'copa'),
      getCard(11, 'copa'),
      getCard(12, 'copa'),
    ];
    assert.equal(calculateEnvido(hand3).score, 20);

    // 7, 10, 2 of espada -> 7 + 2 + 20 = 29 (ignores 10 which has envidoValue 0)
    const hand4 = [
      getCard(7, 'espada'),
      getCard(10, 'espada'),
      getCard(2, 'espada'),
    ];
    assert.equal(calculateEnvido(hand4).score, 29);
  });

  it('picks highest single card when all 3 cards have different suits', () => {
    const cards = [
      getCard(7, 'espada'),
      getCard(6, 'basto'),
      getCard(5, 'copa'),
    ];
    const result = calculateEnvido(cards);
    assert.equal(result.score, 7);
    assert.equal(result.cardsUsed.length, 1);
    assert.equal(result.cardsUsed[0].id, '7_espada');
  });

  it('returns 0 when all cards are figures of different suits', () => {
    const cards = [
      getCard(10, 'espada'),
      getCard(11, 'basto'),
      getCard(12, 'copa'),
    ];
    const result = calculateEnvido(cards);
    assert.equal(result.score, 0);
    assert.equal(result.cardsUsed.length, 1);
  });

  it('favors 20 over a higher single card when suit matches with figures', () => {
    // 10 and 11 of espada gives 20; 7 of basto gives 7 -> 20 wins!
    const cards = [
      getCard(10, 'espada'),
      getCard(11, 'espada'),
      getCard(7, 'basto'),
    ];
    const result = calculateEnvido(cards);
    assert.equal(result.score, 20);
    assert.equal(result.cardsUsed.length, 2);
    assert.ok(result.cardsUsed.every((c) => c.suit === 'espada'));
  });

  it('returns 0 for empty array', () => {
    const result = calculateEnvido([]);
    assert.equal(result.score, 0);
    assert.deepEqual(result.cardsUsed, []);
  });

  it('resolves envido winner correctly including mano tiebreak', () => {
    // Different scores
    assert.equal(resolveEnvidoWinner(33, 30, 'player'), 'player');
    assert.equal(resolveEnvidoWinner(25, 31, 'player'), 'jev');

    // Ties: mano wins
    assert.equal(resolveEnvidoWinner(31, 31, 'player'), 'player');
    assert.equal(resolveEnvidoWinner(31, 31, 'jev'), 'jev');
  });

  it('calculates Falta Envido points correctly', () => {
    // In "malas" (both < 15): leader score 10, target 30 -> 20 points
    assert.equal(calculateFaltaEnvidoPoints(10, 8, 30), 20);

    // In "buenas": leader score 24, target 30 -> 6 points
    assert.equal(calculateFaltaEnvidoPoints(24, 18, 30), 6);

    // 15-point game
    assert.equal(calculateFaltaEnvidoPoints(12, 10, 15), 3);
  });
});

describe('Trick resolution (resolveTrick)', () => {
  it('correctly identifies player win, jev win, and tie', () => {
    const anchoEspada = getCard(1, 'espada');
    const anchoBasto = getCard(1, 'basto');
    const tresEspada = getCard(3, 'espada');
    const tresBasto = getCard(3, 'basto');

    assert.equal(resolveTrick(anchoEspada, anchoBasto), 'player');
    assert.equal(resolveTrick(anchoBasto, anchoEspada), 'jev');
    assert.equal(resolveTrick(tresEspada, tresBasto), 'tie');
  });
});

describe('Hand resolution (resolveHand) scenarios', () => {
  it('handles empty and partial hands that are not finished', () => {
    assert.deepEqual(resolveHand([], 'player'), {
      winner: null,
      isFinished: false,
      reason: 'Hand in progress: no tricks played yet',
    });

    assert.equal(resolveHand(['player'], 'player').isFinished, false);
    assert.equal(resolveHand(['jev'], 'player').isFinished, false);
    assert.equal(resolveHand(['tie'], 'player').isFinished, false);
    assert.equal(resolveHand(['player', 'jev'], 'player').isFinished, false);
    assert.equal(resolveHand(['jev', 'player'], 'player').isFinished, false);
    assert.equal(resolveHand(['tie', 'tie'], 'player').isFinished, false);
  });

  it('standard 2-0 wins (finished after 2 tricks)', () => {
    const resPlayer = resolveHand(['player', 'player'], 'jev');
    assert.equal(resPlayer.isFinished, true);
    assert.equal(resPlayer.winner, 'player');

    const resJev = resolveHand(['jev', 'jev'], 'player');
    assert.equal(resJev.isFinished, true);
    assert.equal(resJev.winner, 'jev');
  });

  it('standard 2-1 wins (finished after 3 tricks)', () => {
    const res1 = resolveHand(['player', 'jev', 'player'], 'jev');
    assert.equal(res1.isFinished, true);
    assert.equal(res1.winner, 'player');

    const res2 = resolveHand(['player', 'jev', 'jev'], 'player');
    assert.equal(res2.isFinished, true);
    assert.equal(res2.winner, 'jev');

    const res3 = resolveHand(['jev', 'player', 'player'], 'jev');
    assert.equal(res3.isFinished, true);
    assert.equal(res3.winner, 'player');

    const res4 = resolveHand(['jev', 'player', 'jev'], 'player');
    assert.equal(res4.isFinished, true);
    assert.equal(res4.winner, 'jev');
  });

  it('Trick 1 tie (parda en primera): winner of Trick 2 wins hand', () => {
    // Trick 2 won by player -> player wins hand
    const res1 = resolveHand(['tie', 'player'], 'jev');
    assert.equal(res1.isFinished, true);
    assert.equal(res1.winner, 'player');

    // Trick 2 won by jev -> jev wins hand
    const res2 = resolveHand(['tie', 'jev'], 'player');
    assert.equal(res2.isFinished, true);
    assert.equal(res2.winner, 'jev');
  });

  it('Trick 1 and Trick 2 tie: winner of Trick 3 wins hand', () => {
    const res1 = resolveHand(['tie', 'tie', 'player'], 'jev');
    assert.equal(res1.isFinished, true);
    assert.equal(res1.winner, 'player');

    const res2 = resolveHand(['tie', 'tie', 'jev'], 'player');
    assert.equal(res2.isFinished, true);
    assert.equal(res2.winner, 'jev');
  });

  it('All 3 tricks tie (triple parda): mano wins hand', () => {
    const resPlayerMano = resolveHand(['tie', 'tie', 'tie'], 'player');
    assert.equal(resPlayerMano.isFinished, true);
    assert.equal(resPlayerMano.winner, 'player');

    const resJevMano = resolveHand(['tie', 'tie', 'tie'], 'jev');
    assert.equal(resJevMano.isFinished, true);
    assert.equal(resJevMano.winner, 'jev');
  });

  it('Trick 2 tie (parda en segunda): winner of Trick 1 wins hand', () => {
    // Player won trick 1, trick 2 tied -> player wins hand
    const res1 = resolveHand(['player', 'tie'], 'jev');
    assert.equal(res1.isFinished, true);
    assert.equal(res1.winner, 'player');

    // Jev won trick 1, trick 2 tied -> jev wins hand
    const res2 = resolveHand(['jev', 'tie'], 'player');
    assert.equal(res2.isFinished, true);
    assert.equal(res2.winner, 'jev');
  });

  it('Trick 3 tie after 1-1 split: winner of Trick 1 wins hand', () => {
    // Player won trick 1, Jev won trick 2, trick 3 tied -> Player wins hand
    const res1 = resolveHand(['player', 'jev', 'tie'], 'jev');
    assert.equal(res1.isFinished, true);
    assert.equal(res1.winner, 'player');

    // Jev won trick 1, Player won trick 2, trick 3 tied -> Jev wins hand
    const res2 = resolveHand(['jev', 'player', 'tie'], 'player');
    assert.equal(res2.isFinished, true);
    assert.equal(res2.winner, 'jev');
  });
});

describe('Truco and Envido point constants', () => {
  it('has exact Truco and Envido values', () => {
    assert.equal(TRUCO_POINTS.TRUCO, 2);
    assert.equal(TRUCO_POINTS.RETRUCO, 3);
    assert.equal(TRUCO_POINTS.VALE_CUATRO, 4);
    assert.equal(TRUCO_POINTS.TRUCO_DECLINED, 1);
    assert.equal(TRUCO_POINTS.RETRUCO_DECLINED, 2);
    assert.equal(TRUCO_POINTS.VALE_CUATRO_DECLINED, 3);

    assert.equal(ENVIDO_POINTS.ENVIDO, 2);
    assert.equal(ENVIDO_POINTS.REAL_ENVIDO, 3);
    assert.equal(ENVIDO_POINTS.ENVIDO_DECLINED, 1);
  });
});
