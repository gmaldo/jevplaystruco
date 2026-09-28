import type { Card } from '../truco/types.ts';
import { calculateEnvido } from '../truco/cards.ts';
import {
  getJevEnvidoCards,
  getPlayerCardOnTable,
  choiceWithProbabilities,
  estimateOpponentBluff,
} from './analysis.ts';
import type {
  JevDecisionRequest,
  JevDecisionResponse,
  JevState,
  JevDecisionQuestions,
} from './types.ts';

const HAND_STRENGTH_LEVELS = [
  '0-25: Weak hand, low chance of winning',
  '26-50: Average hand with defensive options',
  '51-75: Competitive hand with good chances',
  '76-100: Dominant or winning hand',
];

/**
 * Builds TypeSafe AI question definitions corresponding to context.
 */
export function buildQuestionsForContext(
  context: JevDecisionRequest['context'],
  state: JevState
): JevDecisionQuestions {
  switch (context) {
    case 'respond_envido':
      return {
        choices: {
          action: {
            instructions:
              'Should Jev accept (quiero), decline (no_quiero), or raise the rival\'s Envido bet? Jev holds `computed.envidoPoints` envido points, the bet is worth `computed.pointsAtStake` points, and the match score is `score`.',
            criteria: {
              quiero: 'Accept when `computed.envidoPoints` is competitive (27+) or the raise history makes declining too costly',
              no_quiero: 'Decline when `computed.envidoPoints` is too low to likely win, conceding fewer points',
              real_envido: 'Raise to Real Envido when `computed.envidoPoints` is 31 or more',
              falta_envido: 'Raise to Falta Envido (worth `computed.faltaEnvidoValue` points) with an exceptional score or to close out the match',
            },
          },
        },
        nouls: {
          bluffing_probability: {
            instructions:
              'Would accepting or raising with weak envido points work as a bluff here, given `score` and `playerProfile`?',
          },
          jev_has_better_envido: {
            instructions:
              'Is `computed.envidoPoints` likely high enough to beat the rival\'s envido (typical winning scores are 27+)?',
          },
          opponent_likely_bluffing: {
            instructions:
              'Is the rival\'s envido bet likely a bluff, given `score` pressure and `playerProfile`?',
          },
        },
        scores: {
          hand_confidence: {
            instructions:
              'How strong is Jev\'s envido (`computed.envidoPoints`) relative to a typical winning score (27+)?',
            scale: { min: 0, max: 100 },
            levels: HAND_STRENGTH_LEVELS,
          },
        },
      };

    case 'respond_truco':
      return {
        choices: {
          action: {
            instructions:
              'How should Jev respond to the rival\'s Truco bet (worth `computed.pointsAtStake` points)? Consider `computed.cardRanks` (rank 14 is strongest), `computed.trickRecord` and `score`.',
            criteria: {
              quiero: 'Accept with medium/high cards or a won first trick',
              no_quiero: 'Fold when `hand` is weak and the hand is likely lost',
              retruco: 'Raise to Retruco (3 points) with high-rank cards (rank 10+)',
              vale_cuatro: 'Raise to Vale Cuatro (4 points) with top cards (anchos, 7 bravos)',
            },
          },
        },
        nouls: {
          bluffing_probability: {
            instructions:
              'Would accepting or raising with a weak hand work as a bluff, given `score` and `playerProfile`?',
          },
          jev_can_win_hand: {
            instructions:
              'Is `hand` likely to win this Truco hand, given `computed.cardRanks` and `computed.trickRecord`?',
          },
          opponent_likely_bluffing: {
            instructions:
              'Is the rival\'s Truco bet likely a bluff, given `score` pressure and `playerProfile`?',
          },
        },
        scores: {
          hand_confidence: {
            instructions:
              'How likely is `hand` to win this Truco hand given `computed.cardRanks` and `computed.trickRecord`?',
            scale: { min: 0, max: 100 },
            levels: HAND_STRENGTH_LEVELS,
          },
        },
      };

    case 'play_card':
      return {
        choices: {
          card: {
            instructions:
              'Which card from `hand` should Jev play this trick? `computed.cardRanks` lists each card with its truco rank (14 = strongest). Use `playerCardOnTable`, `computed.canBeatPlayerCard` and `computed.trickRecord` to decide.',
            criteria: state.hand.reduce<Record<string, string | null>>((acc, card) => {
              acc[card.id] = `Play the ${card.name} (truco rank ${card.rank})`;
              return acc;
            }, {}),
          },
          call: {
            instructions:
              'Should Jev call Truco before playing, given `computed.maxRank`, `computed.trickRecord` and `score`?',
            criteria: {
              truco: 'Call Truco when holding card advantage or trick control',
              none: 'Do not call, just play the card',
            },
          },
        },
        nouls: {
          call_truco: {
            instructions:
              'Is calling Truco now profitable given `hand` strength in `computed.cardRanks` and the `score`?',
          },
          bluffing_probability: {
            instructions:
              'Would representing strength here work as a bluff, given `score` and `playerProfile`?',
          },
        },
        scores: {
          hand_confidence: {
            instructions:
              'Overall strength of `hand` for the remaining tricks, based on `computed.cardRanks`.',
            scale: { min: 0, max: 100 },
            levels: HAND_STRENGTH_LEVELS,
          },
        },
      };

    case 'initiate_call': {
      const criteria: Record<string, string | null> = {};

      if (state.round === 1 && !state.envidoPlayed) {
        criteria.envido = 'Call Envido first (2 points)';
        criteria.real_envido = 'Call Real Envido directly (3 points)';
        criteria.falta_envido = 'Call Falta Envido';
      }

      if ((state.trucoLevel ?? 0) === 0) {
        criteria.truco = 'Call TRUCO (2 points) to pressure or define the hand';
      } else if (state.trucoLevel === 1 && state.trucoOfferedBy !== 'jev') {
        criteria.retruco = 'Call QUIERO RETRUCO (3 points) to raise the stakes';
      } else if (state.trucoLevel === 2 && state.trucoOfferedBy !== 'jev') {
        criteria.vale_cuatro = 'Call VALE CUATRO (4 points) to play for the maximum';
      }

      criteria.none = 'Pass without calling and play a card';

      return {
        choices: {
          action: {
            instructions:
              'Should Jev open a call this turn? `computed.envidoPoints` holds its envido score, `computed.cardRanks` its card strength, and `computed.pointsAtStake`/`score` describe what is at risk.',
            criteria,
          },
        },
        nouls: {
          bluffing_probability: {
            instructions:
              'Would the chosen call work as a bluff, given `score` and `playerProfile`?',
          },
        },
        scores: {
          hand_confidence: {
            instructions:
              'Confidence that `hand` (tantos or card ranks) justifies opening a call.',
            scale: { min: 0, max: 100 },
            levels: HAND_STRENGTH_LEVELS,
          },
        },
      };
    }
  }
}

/**
 * Handles Jev decision when rival bids Envido.
 */
function handleRespondEnvido(state: JevState): Omit<JevDecisionResponse, 'mode' | 'latencyMs'> {
  const envidoCards = getJevEnvidoCards(state);
  const envidoResult = calculateEnvido(envidoCards);
  const envido = envidoResult.score;

  const rivalScore = state.score.player;
  const targetScore = state.score.target;
  const rivalHasHighScore = rivalScore >= (targetScore >= 30 ? 20 : 10) || rivalScore >= state.score.jev + 4;

  const currentCall = state.currentBid?.type;

  let choice = 'quiero';
  let confidence = 0.85;
  let bluffingProb = 0.05;
  let handConfidence = 60;
  let summary = '';

  if (envido >= 31) {
    handConfidence = Math.min(100, 88 + (envido - 31) * 6);
    bluffingProb = 0.02;

    if (currentCall === 'falta_envido') {
      choice = 'quiero';
      confidence = 0.98;
      summary = `Envido de ${envido}: Jev acepta Falta Envido con gran mano (${handConfidence}% confianza).`;
    } else {
      // 70% chance to raise, 30% quiero
      const roll = Math.random();
      if (roll < 0.7) {
        if (currentCall === 'real_envido' || envido >= 33) {
          choice = 'falta_envido';
          confidence = 0.92;
          summary = `Envido de ${envido}: Jev sube a Falta Envido con mano ganadora.`;
        } else {
          choice = 'real_envido';
          confidence = 0.88;
          summary = `Envido de ${envido}: Jev sube a Real Envido con ${envido} puntos.`;
        }
      } else {
        choice = 'quiero';
        confidence = 0.94;
        summary = `Envido de ${envido}: Jev acepta con alta seguridad (${handConfidence}% confianza).`;
      }
    }
  } else if (envido >= 27) {
    handConfidence = 65 + (envido - 27) * 5;
    bluffingProb = 0.06;
    choice = 'quiero';
    confidence = 0.78 + (envido - 27) * 0.04;
    summary = `Envido de ${envido}: Jev acepta el envido (${handConfidence}% confianza).`;
  } else {
    // envido < 27
    handConfidence = Math.max(8, Math.round((envido / 27) * 50));

    // 15% calibrated bluff chance if rival has high score
    if (rivalHasHighScore && Math.random() < 0.15) {
      choice = 'quiero';
      bluffingProb = 0.85;
      confidence = 0.52;
      summary = `Envido de ${envido}: Jev mete farol táctico ante rival con puntaje alto (${rivalScore} pts).`;
    } else {
      choice = 'no_quiero';
      bluffingProb = 0.04;
      confidence = 0.88;
      summary = `Envido de ${envido}: Jev rechaza con no quiero (${handConfidence}% confianza).`;
    }
  }

  const questions = buildQuestionsForContext('respond_envido', state);
  const actionResult = choiceWithProbabilities(
    choice,
    confidence,
    Object.keys(questions.choices?.action?.criteria || {})
  );

  return {
    choices: {
      action: actionResult,
      envido_response: actionResult,
    },
    nouls: {
      bluffing_probability: { probability: bluffingProb },
      jev_has_better_envido: {
        probability:
          envido >= 31 ? 0.92 : envido >= 27 ? 0.62 : Math.max(0.05, envido / 40),
      },
      opponent_likely_bluffing: { probability: estimateOpponentBluff(state) },
    },
    scores: {
      hand_confidence: { score: handConfidence },
    },
    decisionSummary: summary,
    questions,
  };
}

/**
 * Handles Jev decision when responding to Truco / Retruco / Vale Cuatro.
 */
function handleRespondTruco(state: JevState): Omit<JevDecisionResponse, 'mode' | 'latencyMs'> {
  const remainingCards = [...state.hand].sort((a, b) => b.rank - a.rank);
  const maxRank = remainingCards[0]?.rank ?? 0;
  const highCards = remainingCards.filter((c) => c.rank >= 10);

  let jevTrickWins = 0;
  for (const t of state.tableTricks) {
    if (t.winner === 'jev') jevTrickWins++;
  }
  const trick1Winner = state.tableTricks[0]?.winner;
  const isMano = state.mano === 'jev';

  const currentCall = state.currentBid?.type;

  let choice = 'quiero';
  let confidence = 0.75;
  let bluffingProb = 0.05;
  let handConfidence = 50;
  let summary = '';

  // Base hand confidence based on card ranks
  const rankSum = remainingCards.reduce((acc, c) => acc + c.rank, 0);
  const avgRank = remainingCards.length > 0 ? rankSum / remainingCards.length : 0;
  handConfidence = Math.min(100, Math.round((avgRank / 14) * 80 + (jevTrickWins * 15)));

  const canRaiseToRetruco = currentCall === 'truco';
  const canRaiseToValeCuatro = currentCall === 'retruco';

  if (highCards.length > 0) {
    // Holding high cards (rank >= 10, i.e., 3s, 7 espada, anchos)
    handConfidence = Math.min(100, Math.max(75, 60 + maxRank * 3));
    bluffingProb = 0.03;

    if ((highCards.length >= 2 || maxRank >= 13) && (canRaiseToRetruco || canRaiseToValeCuatro)) {
      const roll = Math.random();
      if (roll < 0.6) {
        choice = canRaiseToRetruco ? 'retruco' : 'vale_cuatro';
        confidence = 0.88;
        summary = `Jev posee cartas mayores (máx jerarquía ${maxRank}): sube a ${choice} (${handConfidence}% confianza).`;
      } else {
        choice = 'quiero';
        confidence = 0.90;
        summary = `Jev posee cartas mayores (máx jerarquía ${maxRank}): acepta truco esperando rematar.`;
      }
    } else {
      choice = 'quiero';
      confidence = 0.85;
      summary = `Jev posee ${highCards.length} carta(s) alta(s): acepta la apuesta de Truco.`;
    }
  } else if (maxRank <= 6 && (trick1Winner === 'player' || (state.round >= 2 && jevTrickWins === 0))) {
    // Hand is weak (maxRank <= 6) and already lost 1st trick
    handConfidence = Math.max(5, Math.round(maxRank * 4));

    // Rare bluff chance (10%)
    if (Math.random() < 0.1) {
      choice = 'quiero';
      bluffingProb = 0.80;
      confidence = 0.45;
      summary = `Jev arriesga con mano débil (farol calibrado) tras perder 1ra baza.`;
    } else {
      choice = 'no_quiero';
      bluffingProb = 0.02;
      confidence = 0.90;
      summary = `Mano débil (máx jerarquía ${maxRank}) y 1ra baza perdida: Jev se va al mazo (no quiero).`;
    }
  } else {
    // Moderate hand (ranks 7-9 or won trick 1 or trick 1 tied)
    if (jevTrickWins > 0) {
      choice = 'quiero';
      confidence = 0.80;
      handConfidence = Math.min(95, handConfidence + 20);
      summary = `Jev ya ganó una baza previa: acepta el Truco con ventaja (${handConfidence}% confianza).`;
    } else if (trick1Winner === 'tie' && isMano) {
      choice = 'quiero';
      confidence = 0.85;
      handConfidence = Math.min(95, handConfidence + 25);
      summary = `1ra baza parda y Jev es mano: acepta el Truco con ventaja reglamentaria.`;
    } else if (maxRank >= 8) {
      choice = 'quiero';
      confidence = 0.72;
      summary = `Mano intermedia (máx jerarquía ${maxRank}): Jev acepta el Truco.`;
    } else {
      choice = 'no_quiero';
      confidence = 0.75;
      summary = `Mano sin cartas decisivas: Jev decide no arriesgar y rechaza el Truco.`;
    }
  }

  const questions = buildQuestionsForContext('respond_truco', state);
  const actionResult = choiceWithProbabilities(
    choice,
    confidence,
    Object.keys(questions.choices?.action?.criteria || {})
  );

  return {
    choices: {
      action: actionResult,
      truco_response: actionResult,
    },
    nouls: {
      bluffing_probability: { probability: bluffingProb },
      jev_can_win_hand: { probability: Math.min(0.99, handConfidence / 100) },
      opponent_likely_bluffing: { probability: estimateOpponentBluff(state) },
    },
    scores: {
      hand_confidence: { score: handConfidence },
    },
    decisionSummary: summary,
    questions,
  };
}

/**
 * Handles Jev card selection and optional truco canto initiation.
 */
function handlePlayCard(state: JevState): Omit<JevDecisionResponse, 'mode' | 'latencyMs'> {
  if (!state.hand || state.hand.length === 0) {
    throw new Error('Cannot play card: Jev hand is empty');
  }

  // Identify if player has already placed a card in this trick
  const playerCardOnTable = getPlayerCardOnTable(state);

  const handAscending = [...state.hand].sort((a, b) => a.rank - b.rank);
  const handDescending = [...state.hand].sort((a, b) => b.rank - a.rank);

  let selectedCard: Card;
  let summary = '';
  let confidence = 0.85;

  if (playerCardOnTable) {
    // Responding to player's card on table
    const winningCards = handAscending.filter((c) => c.rank > playerCardOnTable.rank);

    if (winningCards.length > 0) {
      // Kills the card with the lowest winning card possible
      selectedCard = winningCards[0];
      confidence = 0.90;
      summary = `Jev mata el ${playerCardOnTable.name} del rival con la carta ganadora más baja: ${selectedCard.name}.`;
    } else {
      // Cannot kill: check if can tie (empardar) and it is advantageous
      const tyingCards = handAscending.filter((c) => c.rank === playerCardOnTable.rank);
      if (tyingCards.length > 0 && state.round === 1 && state.mano === 'jev') {
        selectedCard = tyingCards[0];
        summary = `Jev emparda con ${selectedCard.name} aprovechando ventaja de ser mano.`;
      } else {
        // If cannot kill, discards lowest card
        selectedCard = handAscending[0];
        confidence = 0.88;
        summary = `Jev no puede matar el ${playerCardOnTable.name} y descarta su carta más baja: ${selectedCard.name}.`;
      }
    }
  } else {
    // 1st to play in trick: leading strategy
    if (state.round === 1) {
      const strongCards = handDescending.filter((c) => c.rank >= 10);
      const mediumCards = handAscending.filter((c) => c.rank >= 7 && c.rank <= 9);

      if (strongCards.length > 0 && mediumCards.length > 0) {
        // Lead medium card to probe
        selectedCard = mediumCards[0];
        summary = `Jev inicia baza 1 liderando carta media (${selectedCard.name}) reservando cartas altas.`;
      } else {
        // Lead low card
        selectedCard = handAscending[0];
        summary = `Jev inicia baza 1 tanteando con carta baja: ${selectedCard.name}.`;
      }
    } else if (state.round === 2) {
      const trick1Winner = state.tableTricks[0]?.winner;
      if (trick1Winner === 'jev' || trick1Winner === 'tie') {
        // Sealing victory: lead highest card
        selectedCard = handDescending[0];
        summary = `Jev va a definir la baza 2 jugando su carta más alta: ${selectedCard.name}.`;
      } else {
        // Lost trick 1: must lead highest card to stay alive
        selectedCard = handDescending[0];
        summary = `Jev necesita ganar la baza 2 para no perder y juega su carta más fuerte: ${selectedCard.name}.`;
      }
    } else {
      // Round 3: play highest remaining card
      selectedCard = handDescending[0];
      summary = `Jev define la 3ra baza con ${selectedCard.name}.`;
    }
  }

  // Decide whether to initiate a "truco" call if holding strong cards and truco hasn't been called
  const trucoNotCalled =
    !state.trucoLevel &&
    (!state.currentBid || (state.currentBid.type !== 'truco' && state.currentBid.type !== 'retruco' && state.currentBid.type !== 'vale_cuatro'));

  const maxRank = handDescending[0]?.rank ?? 0;
  const strongCardCount = handDescending.filter((c) => c.rank >= 10).length;
  const shouldInitiateTruco = trucoNotCalled && (strongCardCount >= 2 || maxRank >= 12 || (state.round === 2 && state.tableTricks[0]?.winner === 'jev' && maxRank >= 9));

  const questions = buildQuestionsForContext('play_card', state);

  const avgRank = handDescending.reduce((acc, c) => acc + c.rank, 0) / handDescending.length;
  const handConfidence = Math.min(100, Math.round((avgRank / 14) * 100));

  const cardResult = choiceWithProbabilities(
    selectedCard.id,
    confidence,
    state.hand.map((c) => c.id)
  );
  const callChoice = shouldInitiateTruco ? 'truco' : 'none';
  const callResult = choiceWithProbabilities(
    callChoice,
    shouldInitiateTruco ? 0.78 : 0.9,
    ['truco', 'none']
  );

  return {
    choices: {
      action: cardResult,
      card: cardResult,
      play_card: cardResult,
      call: callResult,
      call_truco: callResult,
    },
    nouls: {
      call_truco: { probability: shouldInitiateTruco ? 0.82 : 0.12 },
      bluffing_probability: { probability: 0.05 },
    },
    scores: {
      hand_confidence: { score: handConfidence },
    },
    decisionSummary: summary,
    questions,
  };
}

/**
 * Handles Jev decision when initiating a call (Envido or Truco).
 */
function handleInitiateCall(state: JevState): Omit<JevDecisionResponse, 'mode' | 'latencyMs'> {
  const envidoCards = getJevEnvidoCards(state);
  const envidoResult = calculateEnvido(envidoCards);
  const envido = envidoResult.score;

  const handDescending = [...state.hand].sort((a, b) => b.rank - a.rank);
  const maxRank = handDescending[0]?.rank ?? 0;
  const strongCards = handDescending.filter((c) => c.rank >= 10);

  const playerCardOnTable = getPlayerCardOnTable(state);

  const canKillPlayerCard = playerCardOnTable
    ? handDescending.some((c) => c.rank > playerCardOnTable.rank)
    : false;

  let choice = 'none';
  let confidence = 0.85;
  let bluffProb = 0.05;
  let handConfidence = 50;
  let summary = 'Jev pasa sin cantar en este turno y juega carta.';

  // 1. Envido initiation (when state.round === 1 && !state.envidoPlayed)
  if (state.round === 1 && !state.envidoPlayed) {
    if (state.mano === 'jev') {
      // Jev is mano
      if (envido >= 31) {
        choice = Math.random() < 0.75 ? 'real_envido' : 'envido';
        confidence = 0.90;
        handConfidence = 95;
        bluffProb = 0.02;
        summary = `Jev es mano con ${envido} puntos y canta ${choice === 'real_envido' ? 'Real Envido' : 'Envido'}.`;
      } else if (envido >= 28) {
        choice = 'envido';
        confidence = 0.85;
        handConfidence = 80;
        bluffProb = 0.04;
        summary = `Jev es mano con ${envido} puntos e inicia cantando Envido.`;
      } else if (envido >= 26) {
        if (Math.random() < 0.65) {
          choice = 'envido';
          confidence = 0.78;
          handConfidence = 68;
          bluffProb = 0.08;
          summary = `Jev es mano con ${envido} puntos y decide cantar Envido con tantos competitivos.`;
        }
      } else {
        if (Math.random() < 0.12) {
          choice = 'envido';
          confidence = 0.55;
          handConfidence = 35;
          bluffProb = 0.85;
          summary = `Jev es mano con ${envido} puntos y lanza un farol táctico de Envido.`;
        }
      }
    } else {
      // Player is mano and already threw a card without singing envido
      if (envido >= 29) {
        choice = Math.random() < 0.60 ? 'real_envido' : 'envido';
        confidence = 0.88;
        handConfidence = 90;
        bluffProb = 0.03;
        summary = `El rival jugó sin cantar: Jev aprovecha con ${envido} puntos y canta ${choice === 'real_envido' ? 'Real Envido' : 'Envido'}.`;
      } else if (envido >= 26) {
        if (Math.random() < 0.85) {
          choice = 'envido';
          confidence = 0.82;
          handConfidence = 75;
          bluffProb = 0.05;
          summary = `El rival no cantó Envido: Jev canta Envido con ${envido} puntos.`;
        }
      } else if (envido >= 24) {
        if (Math.random() < 0.50) {
          choice = 'envido';
          confidence = 0.70;
          handConfidence = 60;
          bluffProb = 0.15;
          summary = `Jev prueba suerte cantando Envido con ${envido} puntos tras omisión del rival.`;
        }
      } else {
        if (Math.random() < 0.15) {
          choice = 'envido';
          confidence = 0.50;
          handConfidence = 30;
          bluffProb = 0.80;
          summary = `Farol de Envido: Jev canta Envido con ${envido} puntos buscando robar el punto.`;
        }
      }
    }
  }

  // 2. Truco initiation (when choice === 'none')
  if (choice === 'none') {
    const isTrucoLevelZero = (state.trucoLevel ?? 0) === 0;
    const canRaiseRetruco = state.trucoLevel === 1 && state.trucoOfferedBy !== 'jev';
    const canRaiseValeCuatro = state.trucoLevel === 2 && state.trucoOfferedBy !== 'jev';
    const trick1Winner = state.tableTricks[0]?.winner;

    if (isTrucoLevelZero) {
      if (state.round === 1) {
        if (playerCardOnTable && canKillPlayerCard && (playerCardOnTable.rank <= 5 || maxRank >= 10)) {
          if (Math.random() < 0.75) {
            choice = 'truco';
            confidence = 0.85;
            handConfidence = Math.min(100, 70 + maxRank * 2);
            bluffProb = 0.05;
            summary = `Jev puede matar el ${playerCardOnTable.name} del rival y canta ¡TRUCO! antes de tirar su carta.`;
          }
        }
        if (choice === 'none' && (maxRank >= 12 || strongCards.length >= 2)) {
          if (Math.random() < 0.80) {
            choice = 'truco';
            confidence = 0.88;
            handConfidence = 85;
            bluffProb = 0.04;
            summary = `Jev posee cartas mayores (máx jerarquía ${maxRank}) y canta ¡TRUCO! de primera.`;
          }
        }
        if (choice === 'none' && Math.random() < 0.10) {
          choice = 'truco';
          confidence = 0.55;
          handConfidence = 35;
          bluffProb = 0.85;
          summary = 'Jev mete un farol táctico cantando ¡TRUCO! de primera con mano débil.';
        }
      } else if (state.round === 2) {
        if (trick1Winner === 'jev') {
          // "El que hace primera manda el truco": Jev has dominant position!
          if (maxRank >= 7) {
            if (Math.random() < 0.90) {
              choice = 'truco';
              confidence = 0.90;
              handConfidence = Math.min(100, 75 + maxRank * 2);
              bluffProb = 0.03;
              summary = `Jev ganó la primera baza ("el que hace primera manda el truco") y canta ¡TRUCO! con jerarquía ${maxRank}.`;
            }
          } else {
            if (Math.random() < 0.60) {
              choice = 'truco';
              confidence = 0.72;
              handConfidence = 60;
              bluffProb = 0.55;
              summary = 'Jev ganó primera y mete presión con ¡TRUCO! aprovechando la ventaja psicológica.';
            }
          }
        } else if (trick1Winner === 'tie') {
          // Whoever wins trick 2 wins hand!
          if (maxRank >= 8 || state.mano === 'jev') {
            if (Math.random() < 0.80) {
              choice = 'truco';
              confidence = 0.84;
              handConfidence = 80;
              bluffProb = 0.05;
              summary = `Primera baza parda: Jev canta ¡TRUCO! para definir la mano en segunda (${state.mano === 'jev' ? 'ventaja de mano' : `jerarquía ${maxRank}`}).`;
            }
          } else if (maxRank >= 6) {
            if (Math.random() < 0.50) {
              choice = 'truco';
              confidence = 0.70;
              handConfidence = 65;
              bluffProb = 0.20;
              summary = 'Primera baza parda: Jev canta ¡TRUCO! disputando la segunda baza con naipe medio.';
            }
          }
        } else if (trick1Winner === 'player') {
          if (playerCardOnTable && canKillPlayerCard && maxRank >= 9) {
            if (Math.random() < 0.60) {
              choice = 'truco';
              confidence = 0.75;
              handConfidence = 70;
              bluffProb = 0.10;
              summary = `Jev puede matar el ${playerCardOnTable.name} del rival en segunda baza y canta ¡TRUCO! para igualar.`;
            }
          }
        }
      } else if (state.round === 3) {
        // Final baza!
        if (maxRank >= 6) {
          if (Math.random() < 0.85) {
            choice = 'truco';
            confidence = 0.86;
            handConfidence = Math.min(100, 70 + maxRank * 3);
            bluffProb = 0.05;
            summary = `Tercera y última baza: Jev canta ¡TRUCO! para definir el juego con carta de jerarquía ${maxRank}.`;
          }
        } else {
          if (Math.random() < 0.35) {
            choice = 'truco';
            confidence = 0.52;
            handConfidence = 35;
            bluffProb = 0.85;
            summary = 'Baza definitiva: Jev canta ¡TRUCO! de farol buscando que el rival se retire.';
          }
        }
      }
    } else if (canRaiseRetruco) {
      if (trick1Winner === 'jev' || maxRank >= 10 || canKillPlayerCard) {
        if (Math.random() < 0.75) {
          choice = 'retruco';
          confidence = 0.85;
          handConfidence = Math.min(100, 75 + maxRank * 2);
          bluffProb = 0.04;
          summary = `Jev tiene posición dominante (${trick1Winner === 'jev' ? 'ganó primera' : `carta fuerte ${maxRank}`}) y canta ¡QUIERO RETRUCO!`;
        }
      }
    } else if (canRaiseValeCuatro) {
      if (maxRank >= 11 || (trick1Winner === 'jev' && maxRank >= 9)) {
        if (Math.random() < 0.70) {
          choice = 'vale_cuatro';
          confidence = 0.90;
          handConfidence = Math.min(100, 85 + maxRank * 2);
          bluffProb = 0.03;
          summary = 'Jev va por todo con cartas bravas y canta ¡VALE CUATRO!';
        }
      }
    }
  }

  if (choice === 'none') {
    summary = 'Jev pasa sin cantar en este turno y juega carta.';
    confidence = 0.85;
    bluffProb = 0.05;
    handConfidence = Math.min(100, Math.round((maxRank / 14) * 70));
  }

  const questions = buildQuestionsForContext('initiate_call', state);
  const actionResult = choiceWithProbabilities(
    choice,
    confidence,
    Object.keys(questions.choices?.action?.criteria || {})
  );

  return {
    choices: {
      action: actionResult,
      call: actionResult,
    },
    nouls: {
      bluffing_probability: { probability: bluffProb },
    },
    scores: {
      hand_confidence: { score: handConfidence },
    },
    decisionSummary: summary,
    questions,
  };
}

/**
 * Simulates Jev decision using calibrated System One Truco game theory heuristics.
 */
export function simulateJevDecision(request: JevDecisionRequest): JevDecisionResponse {
  const startTime = Date.now();

  let partial: Omit<JevDecisionResponse, 'mode' | 'latencyMs'>;

  switch (request.context) {
    case 'respond_envido':
      partial = handleRespondEnvido(request.state);
      break;
    case 'respond_truco':
      partial = handleRespondTruco(request.state);
      break;
    case 'play_card':
      partial = handlePlayCard(request.state);
      break;
    case 'initiate_call':
      partial = handleInitiateCall(request.state);
      break;
    default:
      throw new Error(`Unsupported context: ${(request as { context?: string }).context}`);
  }

  // Realistic System One latency simulation: 12-25ms
  const elapsed = Date.now() - startTime;
  const simLatency = Math.max(elapsed, Math.floor(Math.random() * 14) + 12);

  return {
    mode: 'local_simulator',
    latencyMs: simLatency,
    context: request.context,
    ...partial,
  };
}
