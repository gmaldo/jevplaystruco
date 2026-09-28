import type { Card } from '../truco/types.ts';
import { calculateEnvido } from '../truco/cards.ts';
import { calculateFaltaEnvidoPoints } from '../truco/rules.ts';
import type { JevChoiceResult, JevComputedState, JevState } from './types.ts';

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

/**
 * Builds a calibrated probability distribution over the options of a
 * Choice question: the picked option takes `confidence`, the rest split
 * the remainder uniformly.
 */
export function choiceWithProbabilities(
  choice: string,
  confidence: number,
  options: string[]
): JevChoiceResult {
  const rest = options.filter((o) => o !== choice);
  const share = rest.length > 0 ? Math.max(0, 1 - confidence) / rest.length : 0;
  const probabilities: Record<string, number> = { [choice]: confidence };
  for (const option of rest) probabilities[option] = share;
  return { choice, confidence, probabilities };
}

/**
 * Samples an option from a calibrated probability distribution instead of
 * always taking the argmax. Produces a mixed strategy: the strong options
 * remain most likely, but a predictable opponent cannot be exploited.
 */
export function sampleChoiceFromProbabilities(
  result: JevChoiceResult,
  rng: () => number = Math.random
): string {
  const probs = result.probabilities;
  if (!probs) return result.choice;
  const entries = Object.entries(probs).filter(([, p]) => p > 0);
  if (entries.length === 0) return result.choice;
  const total = entries.reduce((sum, [, p]) => sum + p, 0);
  let roll = rng() * total;
  for (const [option, p] of entries) {
    roll -= p;
    if (roll <= 0) return option;
  }
  return result.choice;
}

/**
 * Heuristic estimate of how likely the rival's current bet is a bluff,
 * from score desperation and the observed player profile.
 */
export function estimateOpponentBluff(state: JevState): number {
  let probability = 0.12;
  const { player, target } = state.score;
  if (target - player <= 4) probability += 0.18; // desperate near the target
  const profile = state.playerProfile;
  if (profile && profile.handsPlayed >= 3) {
    const aggression = profile.trucoCalls / profile.handsPlayed;
    if (aggression > 0.6) probability += 0.15;
  }
  return Math.min(0.9, probability);
}
