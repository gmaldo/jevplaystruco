import type { Card } from '../truco/types.ts';
import { calculateEnvido } from '../truco/cards.ts';
import { calculateFaltaEnvidoPoints } from '../truco/rules.ts';
import type { JevComputedState, JevState } from './types.ts';

/**
 * Extracts Jev's 3-card hand for envido calculation.
 * If allCardsJev is provided (original deal), uses that; otherwise uses current hand + played cards.
 */
export function getJevEnvidoCards(state: JevState): Card[] {
  if (state.allCardsJev && state.allCardsJev.length > 0) {
    return state.allCardsJev;
  }
  const cards = [...state.hand];
  for (const trick of state.tableTricks) {
    if (trick.jevCard && !cards.some((c) => c.id === trick.jevCard!.id)) {
      cards.push(trick.jevCard);
    }
  }
  return cards;
}

/**
 * Resolves the rival's card currently on the table for this trick, if any.
 */
export function getPlayerCardOnTable(state: JevState): Card | null {
  return (
    state.playerCardOnTable ||
    state.tableTricks.find(
      (t) => t.trickNumber === state.round && t.playerCard && !t.jevCard
    )?.playerCard ||
    null
  );
}

/**
 * Point value of the bid currently on the table (what "no quiero" concedes
 * and what "quiero" puts at risk).
 */
function getBidPointsAtStake(state: JevState): number {
  const bid = state.currentBid?.type;
  switch (bid) {
    case 'truco':
      return 2;
    case 'retruco':
      return 3;
    case 'vale_cuatro':
      return 4;
    case 'envido':
      return 2;
    case 'envido_envido':
      return 4;
    case 'real_envido':
      return 3;
    case 'falta_envido':
      return calculateFaltaEnvidoPoints(
        state.score.player,
        state.score.jev,
        state.score.target
      );
    default:
      break;
  }
  // No pending bid: value of the hand at its current (accepted) truco level.
  return (state.trucoLevel ?? 0) + 1;
}

/**
 * Pre-computed facts about the game state so the model never has to do
 * truco arithmetic or hierarchy lookups inside a judgment.
 */
export function computeJevContext(state: JevState): JevComputedState {
  const envidoResult = calculateEnvido(getJevEnvidoCards(state));
  const sortedHand = [...state.hand].sort((a, b) => b.rank - a.rank);
  const maxRank = sortedHand[0]?.rank ?? 0;
  const strongCardCount = sortedHand.filter((c) => c.rank >= 10).length;

  const playerCard = getPlayerCardOnTable(state);
  const winningCards = playerCard
    ? sortedHand.filter((c) => c.rank > playerCard.rank)
    : [];
  const canBeatPlayerCard = winningCards.length > 0;
  const lowestWinningCardId = canBeatPlayerCard
    ? winningCards[winningCards.length - 1].id
    : null;

  let jevWins = 0;
  let playerWins = 0;
  let ties = 0;
  for (const t of state.tableTricks) {
    if (t.winner === 'jev') jevWins++;
    else if (t.winner === 'player') playerWins++;
    else if (t.winner === 'tie') ties++;
  }

  const { player, jev, target } = state.score;
  const faltaEnvidoValue = calculateFaltaEnvidoPoints(player, jev, target);
  const pointsAtStake = getBidPointsAtStake(state);
  const inBuenas = Math.max(player, jev) >= target / 2;
  const gapToTarget = target - Math.max(player, jev);

  const scorePressure: JevComputedState['scorePressure'] =
    pointsAtStake >= gapToTarget
      ? 'critical'
      : gapToTarget <= 4
      ? 'high'
      : gapToTarget <= 8
      ? 'medium'
      : 'low';

  return {
    envidoPoints: envidoResult.score,
    envidoCardsUsed: envidoResult.cardsUsed.map((c) => c.id),
    cardRanks: sortedHand.map((c) => ({ id: c.id, name: c.name, rank: c.rank })),
    maxRank,
    strongCardCount,
    canBeatPlayerCard,
    lowestWinningCardId,
    trickRecord: { jev: jevWins, player: playerWins, ties },
    pointsAtStake,
    faltaEnvidoValue,
    inBuenas,
    scorePressure,
  };
}
