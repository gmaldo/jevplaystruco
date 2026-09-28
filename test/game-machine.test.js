import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { getCard } from '../lib/truco/cards.ts';
import {
  startNewMatch,
  startNewHand,
  playPlayerCard,
  playJevCard,
  callEnvido,
  respondEnvido,
  callTruco,
  respondTruco,
  foldHand,
  canCallEnvido,
  canCallTruco,
  canPlayCard,
  getAvailableEnvidoBids,
  getAvailableTrucoBid,
} from '../lib/truco/game-machine.ts';

describe('Game Machine - Match & Hand Initialization', () => {
  it('starts a new match with 0-0 scores, 3 cards each, and player as first mano', () => {
    const state = startNewMatch(30);

    assert.equal(state.scores.player, 0);
    assert.equal(state.scores.jev, 0);
    assert.equal(state.scores.target, 30);
    assert.equal(state.mano, 'player');
    assert.equal(state.turn, 'player');
    assert.equal(state.phase, 'playing');
    assert.equal(state.round, 1);
    assert.equal(state.playerHand.length, 3);
    assert.equal(state.jevHand.length, 3);
    assert.equal(state.playedPlayerCards.length, 0);
    assert.equal(state.playedJevCards.length, 0);
    assert.equal(state.table.length, 0);
    assert.equal(state.roundWinners.length, 0);
    assert.equal(state.envidoState.status, 'pending');
    assert.equal(state.envidoState.currentBid, 'none');
    assert.equal(state.trucoState.status, 'none');
    assert.equal(state.trucoState.pointsAtStake, 1);
    assert.equal(state.handWinner, null);
    assert.equal(state.matchWinner, null);
    assert.ok(state.log.length >= 1);
  });

  it('alternates mano and turn when starting a new hand, preserving match scores', () => {
    let state = startNewMatch(15);
    state.scores.player = 4;
    state.scores.jev = 6;
    state.phase = 'hand_ended';

    const nextState = startNewHand(state);

    assert.equal(nextState.scores.player, 4);
    assert.equal(nextState.scores.jev, 6);
    assert.equal(nextState.mano, 'jev');
    assert.equal(nextState.turn, 'jev');
    assert.equal(nextState.phase, 'playing');
    assert.equal(nextState.round, 1);
    assert.equal(nextState.playerHand.length, 3);
    assert.equal(nextState.jevHand.length, 3);
    assert.equal(nextState.table.length, 0);
    assert.equal(nextState.roundWinners.length, 0);
    assert.equal(nextState.envidoState.status, 'pending');
    assert.equal(nextState.trucoState.status, 'none');
    assert.equal(nextState.trucoState.pointsAtStake, 1);
  });
});

describe('Game Machine - Playing Cards & Trick Resolution', () => {
  it('playing a card updates player hand, played cards, table, and passes turn', () => {
    const initialState = startNewMatch(30);
    const cardToPlay = initialState.playerHand[0];

    const state = playPlayerCard(initialState, cardToPlay);

    assert.equal(state.playerHand.length, 2);
    assert.equal(state.playedPlayerCards.length, 1);
    assert.equal(state.playedPlayerCards[0].id, cardToPlay.id);
    assert.equal(state.table.length, 1);
    assert.equal(state.table[0].round, 1);
    assert.equal(state.table[0].playerCard?.id, cardToPlay.id);
    assert.equal(state.table[0].jevCard, undefined);
    assert.equal(state.table[0].winner, undefined);
    assert.equal(state.turn, 'jev');
  });

  it('resolves trick when both players play a card and determines trick winner', () => {
    // Setup state where Player plays 1 de espada (rank 14) and Jev plays 4 de copas (rank 1)
    let state = startNewMatch(30);
    const playerCard = getCard(1, 'espada');
    const jevCard = getCard(4, 'copa');

    state.playerHand = [playerCard, getCard(2, 'oro'), getCard(3, 'basto')];
    state.jevHand = [jevCard, getCard(5, 'espada'), getCard(6, 'copa')];

    // Player plays 1 de espada
    state = playPlayerCard(state, playerCard);
    assert.equal(state.turn, 'jev');

    // Jev plays 4 de copas
    state = playJevCard(state, jevCard);

    assert.equal(state.table.length, 1);
    assert.equal(state.table[0].winner, 'player');
    assert.equal(state.roundWinners.length, 1);
    assert.equal(state.roundWinners[0], 'player');
    assert.equal(state.round, 2);
    assert.equal(state.turn, 'player'); // Winner of trick 1 leads trick 2
  });

  it('handles parda (trick tie) correctly and gives next turn to the leader of the tied trick', () => {
    let state = startNewMatch(30);
    // Player is mano and leads with 3 de espada (rank 10)
    const playerCard = getCard(3, 'espada');
    // Jev responds with 3 de basto (rank 10) -> tie!
    const jevCard = getCard(3, 'basto');

    state.playerHand = [playerCard, getCard(4, 'oro'), getCard(5, 'basto')];
    state.jevHand = [jevCard, getCard(6, 'copa'), getCard(7, 'copa')];

    state = playPlayerCard(state, playerCard);
    state = playJevCard(state, jevCard);

    assert.equal(state.table[0].winner, 'tie');
    assert.equal(state.roundWinners[0], 'tie');
    assert.equal(state.round, 2);
    // Player led the trick that tied, so Player leads the next round
    assert.equal(state.turn, 'player');
  });
});

describe('Game Machine - Hand Resolution Scenarios', () => {
  it('awards points and ends hand when a player wins 2 tricks', () => {
    let state = startNewMatch(30);
    const p1 = getCard(1, 'espada'); // 14
    const p2 = getCard(1, 'basto'); // 13
    const j1 = getCard(4, 'copa'); // 1
    const j2 = getCard(5, 'copa'); // 2

    state.playerHand = [p1, p2, getCard(2, 'oro')];
    state.jevHand = [j1, j2, getCard(6, 'basto')];

    // Trick 1
    state = playPlayerCard(state, p1);
    state = playJevCard(state, j1);
    assert.equal(state.table[0].winner, 'player');
    assert.equal(state.phase, 'playing');

    // Trick 2
    state = playPlayerCard(state, p2);
    state = playJevCard(state, j2);
    assert.equal(state.table[1].winner, 'player');

    // 2 tricks won -> Hand ended!
    assert.equal(state.phase, 'hand_ended');
    assert.equal(state.handWinner, 'player');
    assert.equal(state.scores.player, 1); // 1 point for default truco
    assert.equal(state.scores.jev, 0);
  });
});

describe('Game Machine - Envido Flow', () => {
  it('Envido flow: call -> quiero -> reveals points and awards score to winner', () => {
    let state = startNewMatch(30);
    // Player has 7 espada + 6 espada = 33 envido
    state.playerHand = [getCard(7, 'espada'), getCard(6, 'espada'), getCard(4, 'copa')];
    // Jev has 7 oro + 1 oro = 28 envido
    state.jevHand = [getCard(7, 'oro'), getCard(1, 'oro'), getCard(5, 'basto')];

    // Player calls Envido
    state = callEnvido(state, 'player', 'envido');
    assert.equal(state.phase, 'envido_called');
    assert.equal(state.turn, 'jev');
    assert.equal(state.envidoState.currentBid, 'envido');
    assert.equal(state.envidoState.bidBy, 'player');

    // Jev says Quiero
    state = respondEnvido(state, 'quiero');

    assert.equal(state.envidoState.status, 'resolved');
    assert.equal(state.envidoState.winner, 'player');
    assert.equal(state.envidoState.declaredPoints?.player, 33);
    assert.equal(state.envidoState.declaredPoints?.jev, 28);
    assert.equal(state.envidoState.pointsAwarded?.player, 2);
    assert.equal(state.scores.player, 2);
    assert.equal(state.scores.jev, 0);
    assert.equal(state.phase, 'playing');
    assert.equal(state.turn, 'player'); // Resumes play
  });

  it('Envido flow: call -> no_quiero -> awards 1 point to caller', () => {
    let state = startNewMatch(30);
    state = callEnvido(state, 'player', 'envido');
    assert.equal(state.turn, 'jev');

    state = respondEnvido(state, 'no_quiero');

    assert.equal(state.envidoState.status, 'declined');
    assert.equal(state.envidoState.winner, 'player');
    assert.equal(state.scores.player, 1);
    assert.equal(state.scores.jev, 0);
    assert.equal(state.phase, 'playing');
  });

  it('Envido raise flow: envido -> real_envido -> no_quiero awards 2 points of initial bid', () => {
    let state = startNewMatch(30);
    state = callEnvido(state, 'player', 'envido');
    // Jev raises to real_envido
    state = respondEnvido(state, 'real_envido');
    assert.equal(state.phase, 'envido_called');
    assert.equal(state.envidoState.currentBid, 'real_envido');
    assert.equal(state.envidoState.bidBy, 'jev');
    assert.equal(state.turn, 'player');

    // Player declines
    state = respondEnvido(state, 'no_quiero');
    assert.equal(state.envidoState.status, 'declined');
    assert.equal(state.envidoState.winner, 'jev');
    assert.equal(state.scores.jev, 2); // 2 points from the envido bid
    assert.equal(state.scores.player, 0);
    assert.equal(state.phase, 'playing');
  });

  it('Envido raise flow: envido -> real_envido -> quiero awards 5 points (2 + 3)', () => {
    let state = startNewMatch(30);
    state.playerHand = [getCard(7, 'espada'), getCard(6, 'espada'), getCard(4, 'copa')]; // 33
    state.jevHand = [getCard(7, 'oro'), getCard(1, 'oro'), getCard(5, 'basto')]; // 28

    state = callEnvido(state, 'player', 'envido');
    state = respondEnvido(state, 'real_envido');
    state = respondEnvido(state, 'quiero');

    assert.equal(state.envidoState.status, 'resolved');
    assert.equal(state.envidoState.winner, 'player');
    assert.equal(state.scores.player, 5); // 33 beats 28
    assert.equal(state.scores.jev, 0);
  });

  it('Envido flow: sets envidoState.winner correctly on want and decline (including ties and match end)', () => {
    // 1. Jev wins on quiero via higher score
    let s1 = startNewMatch(30);
    s1.playerHand = [getCard(4, 'espada'), getCard(5, 'basto'), getCard(6, 'oro')]; // 6
    s1.jevHand = [getCard(7, 'copa'), getCard(6, 'copa'), getCard(1, 'oro')]; // 33
    s1 = callEnvido(s1, 'player', 'envido');
    s1 = respondEnvido(s1, 'quiero');
    assert.equal(s1.envidoState.status, 'resolved');
    assert.equal(s1.envidoState.winner, 'jev');

    // 2. Tie points resolved by mano
    let s2 = startNewMatch(30);
    s2.mano = 'jev';
    s2.playerHand = [getCard(7, 'espada'), getCard(6, 'espada'), getCard(1, 'oro')]; // 33
    s2.jevHand = [getCard(7, 'copa'), getCard(6, 'copa'), getCard(2, 'oro')]; // 33
    s2 = callEnvido(s2, 'jev', 'envido');
    s2 = respondEnvido(s2, 'quiero');
    assert.equal(s2.envidoState.status, 'resolved');
    assert.equal(s2.envidoState.winner, 'jev'); // Jev was mano

    // 3. Match ended on quiero sets winner
    let s3 = startNewMatch(15);
    s3.scores.player = 14;
    s3.playerHand = [getCard(7, 'espada'), getCard(6, 'espada'), getCard(1, 'oro')]; // 33
    s3.jevHand = [getCard(4, 'copa'), getCard(5, 'basto'), getCard(6, 'oro')]; // 6
    s3 = callEnvido(s3, 'player', 'envido');
    s3 = respondEnvido(s3, 'quiero');
    assert.equal(s3.phase, 'match_ended');
    assert.equal(s3.matchWinner, 'player');
    assert.equal(s3.envidoState.status, 'resolved');
    assert.equal(s3.envidoState.winner, 'player');

    // 4. Match ended on no_quiero sets winner
    let s4 = startNewMatch(15);
    s4.scores.jev = 14;
    s4 = callEnvido(s4, 'jev', 'envido');
    s4 = respondEnvido(s4, 'no_quiero');
    assert.equal(s4.phase, 'match_ended');
    assert.equal(s4.matchWinner, 'jev');
    assert.equal(s4.envidoState.status, 'declined');
    assert.equal(s4.envidoState.winner, 'jev');
  });

  it('responder may call envido before answering a pending truco ("el envido va primero")', () => {
    let state = startNewMatch(30);
    state = callTruco(state, 'player');
    assert.equal(state.phase, 'truco_called');

    assert.equal(canCallEnvido(state, 'jev'), true);
    state = callEnvido(state, 'jev', 'envido');
    assert.equal(state.phase, 'envido_called');
    assert.equal(state.envidoState.currentBid, 'envido');
    assert.equal(state.envidoState.bidBy, 'jev');
  });

  it('envido cannot be called once a truco bid was accepted', () => {
    let state = startNewMatch(30);
    state = callTruco(state, 'player');
    state = respondTruco(state, 'quiero');
    assert.equal(state.phase, 'playing');
    assert.equal(state.trucoState.status, 'accepted');

    // Neither side may open or raise envido for the rest of the hand
    assert.equal(canCallEnvido(state, 'player'), false);
    assert.equal(canCallEnvido(state, 'jev'), false);
    assert.deepEqual(getAvailableEnvidoBids(state, 'player'), []);
    assert.deepEqual(getAvailableEnvidoBids(state, 'jev'), []);

    const before = state;
    state = callEnvido(state, 'jev', 'envido');
    assert.equal(state, before); // no-op: state unchanged
    state = callEnvido(state, 'player', 'envido');
    assert.equal(state, before);
  });
});

describe('Game Machine - Truco Flow', () => {
  it('Truco flow: call -> quiero -> raises points at stake from 1 to 2', () => {
    let state = startNewMatch(30);
    assert.equal(state.trucoState.pointsAtStake, 1);

    state = callTruco(state, 'player');
    assert.equal(state.phase, 'truco_called');
    assert.equal(state.trucoState.currentBid, 'truco');
    assert.equal(state.trucoState.bidBy, 'player');
    assert.equal(state.turn, 'jev');

    state = respondTruco(state, 'quiero');
    assert.equal(state.phase, 'playing');
    assert.equal(state.trucoState.status, 'accepted');
    assert.equal(state.trucoState.pointsAtStake, 2);
  });

  it('Truco flow: call -> no_quiero -> awards 1 point to caller and ends hand immediately', () => {
    let state = startNewMatch(30);
    state = callTruco(state, 'player');
    state = respondTruco(state, 'no_quiero');

    assert.equal(state.phase, 'hand_ended');
    assert.equal(state.handWinner, 'player');
    assert.equal(state.scores.player, 1);
    assert.equal(state.scores.jev, 0);
  });

  it('Retruco and Vale Cuatro escalation: truco -> retruco -> vale_cuatro -> quiero', () => {
    let state = startNewMatch(30);

    // Player calls Truco
    state = callTruco(state, 'player');
    // Jev raises to Retruco
    state = respondTruco(state, 'retruco');
    assert.equal(state.trucoState.currentBid, 'retruco');
    assert.equal(state.trucoState.bidBy, 'jev');
    assert.equal(state.turn, 'player');

    // Player raises to Vale Cuatro
    state = respondTruco(state, 'vale_cuatro');
    assert.equal(state.trucoState.currentBid, 'vale_cuatro');
    assert.equal(state.trucoState.bidBy, 'player');
    assert.equal(state.turn, 'jev');

    // Jev accepts
    state = respondTruco(state, 'quiero');
    assert.equal(state.trucoState.pointsAtStake, 4);
    assert.equal(state.phase, 'playing');
  });

  it('Retruco no_quiero awards 2 points to caller and ends hand', () => {
    let state = startNewMatch(30);
    state = callTruco(state, 'player');
    state = respondTruco(state, 'retruco'); // Jev raised to retruco
    state = respondTruco(state, 'no_quiero'); // Player declined

    assert.equal(state.phase, 'hand_ended');
    assert.equal(state.handWinner, 'jev');
    assert.equal(state.scores.jev, 2);
    assert.equal(state.scores.player, 0);
  });
});

describe('Game Machine - Fold Hand & Match End', () => {
  it('folding hand awards points at stake to opponent and marks hand ended', () => {
    let state = startNewMatch(30);
    state = callTruco(state, 'player');
    state = respondTruco(state, 'quiero'); // 2 points at stake

    state = foldHand(state, 'player');

    assert.equal(state.phase, 'hand_ended');
    assert.equal(state.handWinner, 'jev');
    assert.equal(state.scores.jev, 2);
    assert.equal(state.scores.player, 0);
  });

  it('ends match immediately when player reaches target score (15 or 30)', () => {
    let state = startNewMatch(15);
    state.scores.player = 14;
    state.scores.jev = 10;

    // Player calls Truco, Jev says no quiero -> Player reaches 15 points
    state = callTruco(state, 'player');
    state = respondTruco(state, 'no_quiero');

    assert.equal(state.phase, 'match_ended');
    assert.equal(state.matchWinner, 'player');
    assert.equal(state.scores.player, 15);
  });

  it('ends match immediately via Envido when target score is reached', () => {
    let state = startNewMatch(15);
    state.scores.player = 13;
    state.scores.jev = 10;
    state.playerHand = [getCard(7, 'espada'), getCard(6, 'espada'), getCard(4, 'copa')]; // 33
    state.jevHand = [getCard(7, 'oro'), getCard(1, 'oro'), getCard(5, 'basto')]; // 28

    state = callEnvido(state, 'player', 'envido');
    state = respondEnvido(state, 'quiero'); // +2 points -> player reaches 15

    assert.equal(state.scores.player, 15);
    assert.equal(state.phase, 'match_ended');
    assert.equal(state.matchWinner, 'player');
  });
});

describe('Game Machine - Action Validation Helpers', () => {
  it('verifies canCallEnvido and getAvailableEnvidoBids', () => {
    const state = startNewMatch(30);
    assert.equal(canCallEnvido(state, 'player'), true);
    assert.equal(canCallEnvido(state, 'jev'), false); // Not Jev's turn

    const bids = getAvailableEnvidoBids(state, 'player');
    assert.deepEqual(bids, ['envido', 'real_envido', 'falta_envido']);
  });

  it('verifies canCallTruco and getAvailableTrucoBid', () => {
    const state = startNewMatch(30);
    assert.equal(canCallTruco(state, 'player'), true);
    assert.equal(canCallTruco(state, 'jev'), false); // Not Jev's turn
    assert.equal(getAvailableTrucoBid(state, 'player'), 'truco');
  });

  it('verifies canPlayCard based on turn and phase', () => {
    const state = startNewMatch(30);
    assert.equal(canPlayCard(state, 'player'), true);
    assert.equal(canPlayCard(state, 'jev'), false);
  });
});
