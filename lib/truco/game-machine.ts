import type { Card, Player, RoundWinner } from './types.ts';
import { createDeck, shuffleDeck, dealHand, calculateEnvido } from './cards.ts';
import {
  resolveTrick,
  resolveHand,
  resolveEnvidoWinner,
  calculateFaltaEnvidoPoints,
} from './rules.ts';
import type { JevDecisionResponse } from '../jev/types.ts';

export type GamePhase =
  | 'idle'
  | 'playing'
  | 'envido_called'
  | 'truco_called'
  | 'hand_ended'
  | 'match_ended';

export type Turn = 'player' | 'jev';

export type TrucoBid = 'none' | 'truco' | 'retruco' | 'vale_cuatro';

export type EnvidoBid =
  | 'none'
  | 'envido'
  | 'real_envido'
  | 'falta_envido'
  | 'envido_envido';

export interface TableTrick {
  round: number;
  playerCard?: Card;
  jevCard?: Card;
  winner?: RoundWinner;
}

export interface EnvidoState {
  status: 'pending' | 'active' | 'resolved' | 'declined' | 'closed';
  currentBid: EnvidoBid;
  bidBy?: Player;
  history: EnvidoBid[];
  pointsAwarded?: { player: number; jev: number };
  declaredPoints?: { player?: number; jev?: number };
  winner?: Player;
}

export interface TrucoState {
  currentBid: TrucoBid;
  bidBy?: Player;
  status: 'none' | 'pending' | 'accepted' | 'declined';
  pointsAtStake: number;
}

export interface GameLogEntry {
  id: string;
  text: string;
  type: 'info' | 'canto' | 'play' | 'win';
  timestamp: number;
}

export interface MatchState {
  scores: { player: number; jev: number; target: number };
  mano: Player;
  turn: Turn;
  phase: GamePhase;
  playerHand: Card[];
  jevHand: Card[];
  playedPlayerCards: Card[];
  playedJevCards: Card[];
  table: TableTrick[];
  round: 1 | 2 | 3;
  roundWinners: RoundWinner[];
  envidoState: EnvidoState;
  trucoState: TrucoState;
  log: GameLogEntry[];
  isJevThinking: boolean;
  lastJevDecision: JevDecisionResponse | null;
  handWinner: Player | null;
  matchWinner: Player | null;
}

let logCounter = 0;
function createLogEntry(
  text: string,
  type: 'info' | 'canto' | 'play' | 'win'
): GameLogEntry {
  logCounter++;
  return {
    id: `log-${Date.now()}-${logCounter}`,
    text,
    type,
    timestamp: Date.now(),
  };
}

function appendLog(
  log: GameLogEntry[],
  text: string,
  type: 'info' | 'canto' | 'play' | 'win'
): GameLogEntry[] {
  return [...log, createLogEntry(text, type)];
}

/**
 * Calculates accepted envido points from bid history.
 * Standard Argentine Truco rules:
 * - envido = 2
 * - envido + envido_envido = 4
 * - envido + real_envido = 5
 * - envido + envido_envido + real_envido = 7
 * - real_envido = 3
 */
export function getAcceptedEnvidoPoints(
  history: EnvidoBid[],
  playerScore: number,
  jevScore: number,
  targetScore: number
): number {
  if (history.includes('falta_envido')) {
    return calculateFaltaEnvidoPoints(playerScore, jevScore, targetScore);
  }

  let pts = 0;
  for (const bid of history) {
    if (bid === 'envido') pts += 2;
    else if (bid === 'envido_envido') pts += 2;
    else if (bid === 'real_envido') pts += 3;
  }
  return Math.max(2, pts);
}

/**
 * Calculates points awarded to caller when opponent declines (no quiero) envido.
 * - If 1st bid was declined: 1 point.
 * - If raised bid was declined: points of previous bids before the rejected one.
 */
export function getDeclinedEnvidoPoints(
  history: EnvidoBid[],
  playerScore: number,
  jevScore: number,
  targetScore: number
): number {
  if (history.length <= 1) {
    return 1;
  }
  const previousHistory = history.slice(0, -1);
  return getAcceptedEnvidoPoints(previousHistory, playerScore, jevScore, targetScore);
}

/**
 * Determines whose turn it is to play the next card on the table.
 */
export function determineNextCardPlayer(state: MatchState): Turn {
  const currentTrick = state.table.find((t) => t.round === state.round);
  if (!currentTrick || (!currentTrick.playerCard && !currentTrick.jevCard)) {
    // Nobody has played yet in this round
    if (state.round === 1) {
      return state.mano;
    }
    // In rounds 2 & 3, winner of previous trick plays first.
    // If previous trick was a tie, the player who played first in that tied trick plays first!
    const prevTrick = state.table.find((t) => t.round === state.round - 1);
    if (prevTrick?.winner && prevTrick.winner !== 'tie') {
      return prevTrick.winner;
    }
    // If tied, the player who led round 1 (mano) leads
    return state.mano;
  }

  if (currentTrick.playerCard && !currentTrick.jevCard) {
    return 'jev';
  }
  if (!currentTrick.playerCard && currentTrick.jevCard) {
    return 'player';
  }

  return state.mano;
}

/**
 * Starts a new match from scratch (initial scores 0, dealt 3 cards each).
 */
export function startNewMatch(target: 15 | 30 = 30): MatchState {
  const deck = shuffleDeck(createDeck());
  const dealt = dealHand(deck);
  const mano: Player = 'player';

  return {
    scores: { player: 0, jev: 0, target },
    mano,
    turn: mano,
    phase: 'playing',
    playerHand: dealt.player,
    jevHand: dealt.jev,
    playedPlayerCards: [],
    playedJevCards: [],
    table: [],
    round: 1,
    roundWinners: [],
    envidoState: {
      status: 'pending',
      currentBid: 'none',
      history: [],
    },
    trucoState: {
      currentBid: 'none',
      status: 'none',
      pointsAtStake: 1,
    },
    log: [
      createLogEntry(
        `Comienza el partido a ${target} puntos. Mano: Jugador.`,
        'info'
      ),
    ],
    isJevThinking: false,
    lastJevDecision: null,
    handWinner: null,
    matchWinner: null,
  };
}

/**
 * Deals and starts a new hand within an ongoing match, alternating mano.
 */
export function startNewHand(prevState: MatchState): MatchState {
  if (prevState.phase === 'match_ended') {
    return prevState;
  }

  const nextMano: Player = prevState.mano === 'player' ? 'jev' : 'player';
  const deck = shuffleDeck(createDeck());
  const dealt = dealHand(deck);

  return {
    ...prevState,
    mano: nextMano,
    turn: nextMano,
    phase: 'playing',
    playerHand: dealt.player,
    jevHand: dealt.jev,
    playedPlayerCards: [],
    playedJevCards: [],
    table: [],
    round: 1,
    roundWinners: [],
    envidoState: {
      status: 'pending',
      currentBid: 'none',
      history: [],
    },
    trucoState: {
      currentBid: 'none',
      status: 'none',
      pointsAtStake: 1,
    },
    log: appendLog(
      prevState.log,
      `Nueva mano iniciada. Es mano ${nextMano === 'player' ? 'el Jugador' : 'Jev'}.`,
      'info'
    ),
    isJevThinking: false,
    lastJevDecision: null,
    handWinner: null,
  };
}

/**
 * Player plays a card from hand to table.
 */
export function playPlayerCard(state: MatchState, card: Card): MatchState {
  if (state.phase !== 'playing' || state.turn !== 'player') {
    return state;
  }

  const cardIndex = state.playerHand.findIndex((c) => c.id === card.id);
  if (cardIndex === -1) {
    return state;
  }

  const newPlayerHand = [...state.playerHand];
  newPlayerHand.splice(cardIndex, 1);
  const newPlayedPlayerCards = [...state.playedPlayerCards, card];

  let log = appendLog(state.log, `Jugador jugó ${card.name}`, 'play');

  // Update table trick
  const table = [...state.table];
  const trickIndex = table.findIndex((t) => t.round === state.round);
  let trick: TableTrick;

  if (trickIndex >= 0) {
    trick = { ...table[trickIndex], playerCard: card };
    table[trickIndex] = trick;
  } else {
    trick = { round: state.round, playerCard: card };
    table.push(trick);
  }

  // If Jev hasn't played in this round yet, turn goes to Jev
  if (!trick.jevCard) {
    return {
      ...state,
      playerHand: newPlayerHand,
      playedPlayerCards: newPlayedPlayerCards,
      table,
      turn: 'jev',
      log,
    };
  }

  // Both cards played in this round: resolve trick
  const trickWinner = resolveTrick(card, trick.jevCard);
  trick.winner = trickWinner;

  const trickWinnerName =
    trickWinner === 'player'
      ? 'Jugador'
      : trickWinner === 'jev'
      ? 'Jev'
      : 'Parda (empate)';
  log = appendLog(log, `Baza ${state.round}: ${trickWinnerName}`, 'info');

  const newRoundWinners = [...state.roundWinners, trickWinner];
  const handResolution = resolveHand(newRoundWinners, state.mano);

  if (handResolution.isFinished && handResolution.winner) {
    // Hand ended
    const winner = handResolution.winner;
    const pointsAtStake = state.trucoState.pointsAtStake;
    const newScores = {
      ...state.scores,
      [winner]: state.scores[winner] + pointsAtStake,
    };

    const isMatchEnded = newScores[winner] >= state.scores.target;
    const winnerName = winner === 'player' ? 'Jugador' : 'Jev';

    log = appendLog(
      log,
      isMatchEnded
        ? `¡${winnerName} ganó el partido con ${newScores[winner]} puntos!`
        : `¡${winnerName} ganó la mano (+${pointsAtStake} pts)! ${handResolution.reason}`,
      isMatchEnded ? 'win' : 'info'
    );

    return {
      ...state,
      scores: newScores,
      playerHand: newPlayerHand,
      playedPlayerCards: newPlayedPlayerCards,
      table,
      roundWinners: newRoundWinners,
      phase: isMatchEnded ? 'match_ended' : 'hand_ended',
      handWinner: winner,
      matchWinner: isMatchEnded ? winner : null,
      log,
    };
  }

  // Hand continues to next round
  const nextRound = (state.round + 1) as 1 | 2 | 3;
  // If tied, the player who led this trick leads next trick (since Player just played 2nd, Jev led)
  const nextTurn: Turn = trickWinner === 'tie' ? 'jev' : trickWinner;

  return {
    ...state,
    playerHand: newPlayerHand,
    playedPlayerCards: newPlayedPlayerCards,
    table,
    round: nextRound,
    roundWinners: newRoundWinners,
    turn: nextTurn,
    envidoState:
      state.envidoState.status === 'pending'
        ? { ...state.envidoState, status: 'closed' }
        : state.envidoState,
    log,
  };
}

/**
 * Jev plays a card from hand to table.
 */
export function playJevCard(state: MatchState, card: Card): MatchState {
  if (state.phase !== 'playing' || state.turn !== 'jev') {
    return state;
  }

  const cardIndex = state.jevHand.findIndex((c) => c.id === card.id);
  if (cardIndex === -1) {
    return state;
  }

  const newJevHand = [...state.jevHand];
  newJevHand.splice(cardIndex, 1);
  const newPlayedJevCards = [...state.playedJevCards, card];

  let log = appendLog(state.log, `Jev jugó ${card.name}`, 'play');

  // Update table trick
  const table = [...state.table];
  const trickIndex = table.findIndex((t) => t.round === state.round);
  let trick: TableTrick;

  if (trickIndex >= 0) {
    trick = { ...table[trickIndex], jevCard: card };
    table[trickIndex] = trick;
  } else {
    trick = { round: state.round, jevCard: card };
    table.push(trick);
  }

  // If Player hasn't played in this round yet, turn goes to Player
  if (!trick.playerCard) {
    return {
      ...state,
      jevHand: newJevHand,
      playedJevCards: newPlayedJevCards,
      table,
      turn: 'player',
      log,
    };
  }

  // Both cards played in this round: resolve trick
  const trickWinner = resolveTrick(trick.playerCard, card);
  trick.winner = trickWinner;

  const trickWinnerName =
    trickWinner === 'player'
      ? 'Jugador'
      : trickWinner === 'jev'
      ? 'Jev'
      : 'Parda (empate)';
  log = appendLog(log, `Baza ${state.round}: ${trickWinnerName}`, 'info');

  const newRoundWinners = [...state.roundWinners, trickWinner];
  const handResolution = resolveHand(newRoundWinners, state.mano);

  if (handResolution.isFinished && handResolution.winner) {
    // Hand ended
    const winner = handResolution.winner;
    const pointsAtStake = state.trucoState.pointsAtStake;
    const newScores = {
      ...state.scores,
      [winner]: state.scores[winner] + pointsAtStake,
    };

    const isMatchEnded = newScores[winner] >= state.scores.target;
    const winnerName = winner === 'player' ? 'Jugador' : 'Jev';

    log = appendLog(
      log,
      isMatchEnded
        ? `¡${winnerName} ganó el partido con ${newScores[winner]} puntos!`
        : `¡${winnerName} ganó la mano (+${pointsAtStake} pts)! ${handResolution.reason}`,
      isMatchEnded ? 'win' : 'info'
    );

    return {
      ...state,
      scores: newScores,
      jevHand: newJevHand,
      playedJevCards: newPlayedJevCards,
      table,
      roundWinners: newRoundWinners,
      phase: isMatchEnded ? 'match_ended' : 'hand_ended',
      handWinner: winner,
      matchWinner: isMatchEnded ? winner : null,
      log,
    };
  }

  // Hand continues to next round
  const nextRound = (state.round + 1) as 1 | 2 | 3;
  // If tied, player who led this trick leads next trick (since Jev played 2nd, Player led)
  const nextTurn: Turn = trickWinner === 'tie' ? 'player' : trickWinner;

  return {
    ...state,
    jevHand: newJevHand,
    playedJevCards: newPlayedJevCards,
    table,
    round: nextRound,
    roundWinners: newRoundWinners,
    turn: nextTurn,
    envidoState:
      state.envidoState.status === 'pending'
        ? { ...state.envidoState, status: 'closed' }
        : state.envidoState,
    log,
  };
}

function formatBidName(bid: EnvidoBid | TrucoBid): string {
  switch (bid) {
    case 'envido':
      return '¡ENVIDO!';
    case 'envido_envido':
      return '¡ENVIDO (sube a 4)!';
    case 'real_envido':
      return '¡REAL ENVIDO!';
    case 'falta_envido':
      return '¡FALTA ENVIDO!';
    case 'truco':
      return '¡TRUCO!';
    case 'retruco':
      return '¡RETRUCO!';
    case 'vale_cuatro':
      return '¡VALE CUATRO!';
    default:
      return bid;
  }
}

/**
 * Calls or raises Envido.
 */
export function callEnvido(
  state: MatchState,
  by: Player,
  bid: EnvidoBid
): MatchState {
  if (state.round !== 1) {
    return state;
  }

  if (
    state.envidoState.status !== 'pending' &&
    state.envidoState.status !== 'active'
  ) {
    return state;
  }

  const callerName = by === 'player' ? 'Jugador' : 'Jev';
  const otherPlayer: Player = by === 'player' ? 'jev' : 'player';
  const log = appendLog(
    state.log,
    `${callerName} cantó ${formatBidName(bid)}`,
    'canto'
  );

  return {
    ...state,
    phase: 'envido_called',
    turn: otherPlayer,
    envidoState: {
      ...state.envidoState,
      status: 'active',
      currentBid: bid,
      bidBy: by,
      history: [...state.envidoState.history, bid],
    },
    log,
  };
}

/**
 * Responds to an active Envido call (quiero, no_quiero, real_envido, falta_envido).
 */
export function respondEnvido(
  state: MatchState,
  response: 'quiero' | 'no_quiero' | 'real_envido' | 'falta_envido'
): MatchState {
  if (state.phase !== 'envido_called' || !state.envidoState.bidBy) {
    return state;
  }

  const responder = state.turn;
  const responderName = responder === 'player' ? 'Jugador' : 'Jev';
  const caller = state.envidoState.bidBy;
  const callerName = caller === 'player' ? 'Jugador' : 'Jev';

  if (response === 'real_envido' || response === 'falta_envido') {
    return callEnvido(state, responder, response);
  }

  if (response === 'no_quiero') {
    const points = getDeclinedEnvidoPoints(
      state.envidoState.history,
      state.scores.player,
      state.scores.jev,
      state.scores.target
    );

    const newScores = {
      ...state.scores,
      [caller]: state.scores[caller] + points,
    };

    let log = appendLog(
      state.log,
      `${responderName} dijo ¡NO QUIERO! (+${points} pt(s) para ${callerName})`,
      'canto'
    );

    const isMatchEnded = newScores[caller] >= state.scores.target;
    if (isMatchEnded) {
      log = appendLog(
        log,
        `¡${callerName} ganó el partido con ${newScores[caller]} puntos!`,
        'win'
      );
      return {
        ...state,
        scores: newScores,
        phase: 'match_ended',
        matchWinner: caller,
        envidoState: {
          ...state.envidoState,
          status: 'declined',
          winner: caller,
          pointsAwarded: {
            player: caller === 'player' ? points : 0,
            jev: caller === 'jev' ? points : 0,
          },
        },
        log,
      };
    }

    // Resume play: if Truco was called before Envido, return to truco_called
    const nextPhase: GamePhase =
      state.trucoState.status === 'pending' ? 'truco_called' : 'playing';
    const nextTurn: Turn =
      nextPhase === 'truco_called'
        ? state.trucoState.bidBy === 'player'
          ? 'jev'
          : 'player'
        : determineNextCardPlayer(state);

    return {
      ...state,
      scores: newScores,
      phase: nextPhase,
      turn: nextTurn,
      envidoState: {
        ...state.envidoState,
        status: 'declined',
        winner: caller,
        pointsAwarded: {
          player: caller === 'player' ? points : 0,
          jev: caller === 'jev' ? points : 0,
        },
      },
      log,
    };
  }

  // response === 'quiero'
  // Calculate envido from original 3 cards
  const playerOriginalCards = [
    ...state.playerHand,
    ...state.playedPlayerCards,
  ];
  const jevOriginalCards = [...state.jevHand, ...state.playedJevCards];

  const playerPoints = calculateEnvido(playerOriginalCards).score;
  const jevPoints = calculateEnvido(jevOriginalCards).score;
  const winner = resolveEnvidoWinner(playerPoints, jevPoints, state.mano);
  const winnerName = winner === 'player' ? 'Jugador' : 'Jev';

  const points = getAcceptedEnvidoPoints(
    state.envidoState.history,
    state.scores.player,
    state.scores.jev,
    state.scores.target
  );

  const newScores = {
    ...state.scores,
    [winner]: state.scores[winner] + points,
  };

  let log = appendLog(state.log, `${responderName} dijo ¡QUIERO!`, 'canto');
  log = appendLog(
    log,
    `Tantos: Jugador ${playerPoints} vs Jev ${jevPoints}. Ganador: ${winnerName} (+${points} pts).`,
    'info'
  );

  const isMatchEnded = newScores[winner] >= state.scores.target;
  if (isMatchEnded) {
    log = appendLog(
      log,
      `¡${winnerName} ganó el partido con ${newScores[winner]} puntos!`,
      'win'
    );
    return {
      ...state,
      scores: newScores,
      phase: 'match_ended',
      matchWinner: winner,
      envidoState: {
        ...state.envidoState,
        status: 'resolved',
        winner: winner,
        declaredPoints: { player: playerPoints, jev: jevPoints },
        pointsAwarded: {
          player: winner === 'player' ? points : 0,
          jev: winner === 'jev' ? points : 0,
        },
      },
      log,
    };
  }

  const nextPhase: GamePhase =
    state.trucoState.status === 'pending' ? 'truco_called' : 'playing';
  const nextTurn: Turn =
    nextPhase === 'truco_called'
      ? state.trucoState.bidBy === 'player'
        ? 'jev'
        : 'player'
      : determineNextCardPlayer(state);

  return {
    ...state,
    scores: newScores,
    phase: nextPhase,
    turn: nextTurn,
    envidoState: {
      ...state.envidoState,
      status: 'resolved',
      winner: winner,
      declaredPoints: { player: playerPoints, jev: jevPoints },
      pointsAwarded: {
        player: winner === 'player' ? points : 0,
        jev: winner === 'jev' ? points : 0,
      },
    },
    log,
  };
}

/**
 * Calls or raises Truco (truco -> retruco -> vale_cuatro).
 */
export function callTruco(state: MatchState, by: Player): MatchState {
  if (state.phase !== 'playing' && state.phase !== 'truco_called') {
    return state;
  }

  let nextBid: TrucoBid = 'truco';
  if (state.trucoState.currentBid === 'none') {
    nextBid = 'truco';
  } else if (state.trucoState.currentBid === 'truco') {
    nextBid = 'retruco';
  } else if (state.trucoState.currentBid === 'retruco') {
    nextBid = 'vale_cuatro';
  } else {
    // vale_cuatro cannot be raised
    return state;
  }

  // Cannot raise own bid
  if (state.trucoState.bidBy === by) {
    return state;
  }

  const callerName = by === 'player' ? 'Jugador' : 'Jev';
  const otherPlayer: Player = by === 'player' ? 'jev' : 'player';
  const log = appendLog(
    state.log,
    `${callerName} cantó ${formatBidName(nextBid)}`,
    'canto'
  );

  return {
    ...state,
    phase: 'truco_called',
    turn: otherPlayer,
    trucoState: {
      ...state.trucoState,
      currentBid: nextBid,
      bidBy: by,
      status: 'pending',
    },
    log,
  };
}

/**
 * Responds to a Truco call (quiero, no_quiero, retruco, vale_cuatro).
 */
export function respondTruco(
  state: MatchState,
  response: 'quiero' | 'no_quiero' | 'retruco' | 'vale_cuatro'
): MatchState {
  if (state.phase !== 'truco_called' || !state.trucoState.bidBy) {
    return state;
  }

  const responder = state.turn;
  const responderName = responder === 'player' ? 'Jugador' : 'Jev';
  const caller = state.trucoState.bidBy;
  const callerName = caller === 'player' ? 'Jugador' : 'Jev';

  if (response === 'retruco' || response === 'vale_cuatro') {
    return callTruco(state, responder);
  }

  if (response === 'no_quiero') {
    let points = 1;
    if (state.trucoState.currentBid === 'retruco') {
      points = 2;
    } else if (state.trucoState.currentBid === 'vale_cuatro') {
      points = 3;
    }

    const newScores = {
      ...state.scores,
      [caller]: state.scores[caller] + points,
    };

    let log = appendLog(
      state.log,
      `${responderName} dijo ¡NO QUIERO! Mano para ${callerName} (+${points} pt(s))`,
      'canto'
    );

    const isMatchEnded = newScores[caller] >= state.scores.target;
    if (isMatchEnded) {
      log = appendLog(
        log,
        `¡${callerName} ganó el partido con ${newScores[caller]} puntos!`,
        'win'
      );
    }

    return {
      ...state,
      scores: newScores,
      phase: isMatchEnded ? 'match_ended' : 'hand_ended',
      handWinner: caller,
      matchWinner: isMatchEnded ? caller : null,
      trucoState: {
        ...state.trucoState,
        status: 'declined',
      },
      log,
    };
  }

  // response === 'quiero'
  let pointsAtStake = 2;
  if (state.trucoState.currentBid === 'retruco') {
    pointsAtStake = 3;
  } else if (state.trucoState.currentBid === 'vale_cuatro') {
    pointsAtStake = 4;
  }

  const log = appendLog(
    state.log,
    `${responderName} dijo ¡QUIERO! (Se juegan ${pointsAtStake} puntos)`,
    'canto'
  );

  return {
    ...state,
    phase: 'playing',
    turn: determineNextCardPlayer(state),
    trucoState: {
      ...state.trucoState,
      status: 'accepted',
      pointsAtStake,
    },
    log,
  };
}

/**
 * Folds the current hand ("irse al mazo").
 */
export function foldHand(state: MatchState, by: Player): MatchState {
  if (state.phase === 'match_ended' || state.phase === 'hand_ended') {
    return state;
  }

  const winner: Player = by === 'player' ? 'jev' : 'player';
  const winnerName = winner === 'player' ? 'Jugador' : 'Jev';
  const folderName = by === 'player' ? 'Jugador' : 'Jev';

  let points = state.trucoState.pointsAtStake;
  if (state.trucoState.status === 'pending') {
    // Declined pending truco
    if (state.trucoState.currentBid === 'truco') points = 1;
    else if (state.trucoState.currentBid === 'retruco') points = 2;
    else if (state.trucoState.currentBid === 'vale_cuatro') points = 3;
  }

  const newScores = {
    ...state.scores,
    [winner]: state.scores[winner] + points,
  };

  const isMatchEnded = newScores[winner] >= state.scores.target;

  let log = appendLog(
    state.log,
    `${folderName} se fue al mazo. Mano para ${winnerName} (+${points} pt(s)).`,
    'info'
  );

  if (isMatchEnded) {
    log = appendLog(
      log,
      `¡${winnerName} ganó el partido con ${newScores[winner]} puntos!`,
      'win'
    );
  }

  return {
    ...state,
    scores: newScores,
    phase: isMatchEnded ? 'match_ended' : 'hand_ended',
    handWinner: winner,
    matchWinner: isMatchEnded ? winner : null,
    log,
  };
}

export function canCallEnvido(state: MatchState, by: Player): boolean {
  if (state.round !== 1) return false;
  if (
    state.envidoState.status !== 'pending' &&
    state.envidoState.status !== 'active'
  ) {
    return false;
  }

  if (state.phase === 'playing') {
    return state.turn === by;
  }

  if (state.phase === 'truco_called') {
    // "El envido va primero": responder to truco in round 1 can call envido
    return state.turn === by && state.envidoState.status === 'pending';
  }

  if (state.phase === 'envido_called') {
    return state.turn === by && state.envidoState.currentBid !== 'falta_envido';
  }

  return false;
}

export function getAvailableEnvidoBids(
  state: MatchState,
  by: Player
): EnvidoBid[] {
  if (!canCallEnvido(state, by)) return [];

  if (state.envidoState.status === 'pending') {
    return ['envido', 'real_envido', 'falta_envido'];
  }

  const current = state.envidoState.currentBid;
  if (current === 'envido') {
    return ['envido_envido', 'real_envido', 'falta_envido'];
  }
  if (current === 'envido_envido') {
    return ['real_envido', 'falta_envido'];
  }
  if (current === 'real_envido') {
    return ['falta_envido'];
  }

  return [];
}

export function canCallTruco(state: MatchState, by: Player): boolean {
  if (state.phase !== 'playing') return false;
  if (state.turn !== by) return false;
  if (state.trucoState.currentBid === 'vale_cuatro') return false;
  if (state.trucoState.bidBy === by && state.trucoState.status === 'accepted') {
    return false; // Can only raise if rival was the one who made the previous accepted bid
  }
  return true;
}

export function getAvailableTrucoBid(
  state: MatchState,
  by: Player
): TrucoBid | null {
  if (!canCallTruco(state, by)) return null;

  if (state.trucoState.currentBid === 'none') return 'truco';
  if (state.trucoState.currentBid === 'truco') return 'retruco';
  if (state.trucoState.currentBid === 'retruco') return 'vale_cuatro';
  return null;
}

export function canPlayCard(state: MatchState, by: Player): boolean {
  return state.phase === 'playing' && state.turn === by;
}
