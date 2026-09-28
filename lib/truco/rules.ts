import type { Card, Player, RoundWinner, HandResolution } from './types.ts';
import { compareCards } from './cards.ts';

/**
 * Point values for Truco bets in Argentine Truco.
 */
export const TRUCO_POINTS = {
  TRUCO: 2,
  RETRUCO: 3,
  VALE_CUATRO: 4,
  TRUCO_DECLINED: 1,
  RETRUCO_DECLINED: 2,
  VALE_CUATRO_DECLINED: 3,
} as const;

/**
 * Base point values for Envido bets in Argentine Truco.
 */
export const ENVIDO_POINTS = {
  ENVIDO: 2,
  REAL_ENVIDO: 3,
  ENVIDO_DECLINED: 1,
} as const;

/**
 * Resolves the winner of a single trick between player and jev.
 * @returns 'player' | 'jev' | 'tie'
 */
export function resolveTrick(playerCard: Card, jevCard: Card): RoundWinner {
  const comparison = compareCards(playerCard, jevCard);
  if (comparison > 0) return 'player';
  if (comparison < 0) return 'jev';
  return 'tie';
}

/**
 * Resolves the overall winner of a 3-trick hand in Argentine Truco.
 * 
 * Rules:
 * 1. If one player wins 2 tricks -> that player wins.
 * 2. Trick 1 tie (parda): winner of Trick 2 wins the hand.
 *    If Trick 2 also ties, winner of Trick 3 wins.
 *    If all 3 tie, mano wins.
 * 3. Trick 2 tie: winner of Trick 1 wins the hand.
 * 4. Trick 3 tie (after 1-1 tie in tricks 1 & 2): winner of Trick 1 wins the hand.
 * 
 * @param tricks Array of RoundWinner results for each played trick (up to 3).
 * @param mano The player who holds the hand advantage ('player' | 'jev').
 */
export function resolveHand(tricks: RoundWinner[], mano: Player): HandResolution {
  if (!tricks || tricks.length === 0) {
    return {
      winner: null,
      isFinished: false,
      reason: 'Hand in progress: no tricks played yet',
    };
  }

  const t1 = tricks[0];

  // 1 trick played
  if (tricks.length === 1) {
    if (t1 === 'tie') {
      return {
        winner: null,
        isFinished: false,
        reason: 'Trick 1 tied (parda): Trick 2 will decide the hand',
      };
    }
    return {
      winner: null,
      isFinished: false,
      reason: `Trick 1 won by ${t1}`,
    };
  }

  const t2 = tricks[1];

  // 2 tricks played
  if (tricks.length === 2) {
    // Case 1: Trick 1 was a tie
    if (t1 === 'tie') {
      if (t2 !== 'tie') {
        return {
          winner: t2,
          isFinished: true,
          reason: `Trick 1 tied; winner of Trick 2 (${t2}) wins hand`,
        };
      }
      return {
        winner: null,
        isFinished: false,
        reason: 'Tricks 1 and 2 tied; Trick 3 will decide the hand',
      };
    }

    // Case 2: Trick 1 was won by a player
    if (t2 === t1) {
      // Won both trick 1 and 2
      return {
        winner: t1,
        isFinished: true,
        reason: `${t1} won first two tricks`,
      };
    }

    if (t2 === 'tie') {
      // Trick 2 tie: winner of Trick 1 wins immediately
      return {
        winner: t1,
        isFinished: true,
        reason: `Trick 2 tied; winner of Trick 1 (${t1}) wins hand`,
      };
    }

    // 1-1 split (t1 won trick 1, t2 won trick 2)
    return {
      winner: null,
      isFinished: false,
      reason: 'Tied 1-1; Trick 3 will decide the hand',
    };
  }

  // 3 or more tricks played
  const t3 = tricks[2];

  // If Trick 1 was a tie
  if (t1 === 'tie') {
    if (t2 !== 'tie') {
      // Already decided at trick 2
      return {
        winner: t2,
        isFinished: true,
        reason: `Trick 1 tied; winner of Trick 2 (${t2}) wins hand`,
      };
    }

    // Both trick 1 and trick 2 were ties
    if (t3 !== 'tie') {
      return {
        winner: t3,
        isFinished: true,
        reason: `Tricks 1 and 2 tied; winner of Trick 3 (${t3}) wins hand`,
      };
    }

    // All three tricks tied: mano wins!
    return {
      winner: mano,
      isFinished: true,
      reason: `All three tricks tied; mano (${mano}) wins hand`,
    };
  }

  // Trick 1 was won by t1
  if (t2 === t1) {
    return {
      winner: t1,
      isFinished: true,
      reason: `${t1} won first two tricks`,
    };
  }

  if (t2 === 'tie') {
    return {
      winner: t1,
      isFinished: true,
      reason: `Trick 2 tied; winner of Trick 1 (${t1}) wins hand`,
    };
  }

  // t1 won trick 1, t2 won trick 2 (1-1 split going into trick 3)
  if (t3 === 'tie') {
    // Trick 3 tie after 1-1: winner of Trick 1 wins!
    return {
      winner: t1,
      isFinished: true,
      reason: `Trick 3 tied after 1-1; winner of Trick 1 (${t1}) wins hand`,
    };
  }

  // One player won 2 out of 3 tricks
  return {
    winner: t3,
    isFinished: true,
    reason: `${t3} won 2 tricks`,
  };
}

/**
 * Resolves the winner of Envido comparing both scores.
 * In Argentine Truco, in case of a tie in points, the 'mano' wins.
 */
export function resolveEnvidoWinner(
  playerEnvido: number,
  jevEnvido: number,
  mano: Player
): Player {
  if (playerEnvido > jevEnvido) return 'player';
  if (jevEnvido > playerEnvido) return 'jev';
  return mano;
}

/**
 * Calculates points for Falta Envido in Argentine Truco.
 * - In "malas" (both players < half target, usually 15 in 30 pt game):
 *   winner takes the entire game (points remaining for leader to reach targetScore).
 * - In "buenas" (at least one player in second half):
 *   winner takes points remaining for the leading player to reach targetScore.
 */
export function calculateFaltaEnvidoPoints(
  playerScore: number,
  jevScore: number,
  targetScore: number = 30
): number {
  const leaderScore = Math.max(playerScore, jevScore);
  return Math.max(1, targetScore - leaderScore);
}
