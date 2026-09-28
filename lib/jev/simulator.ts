import type { Card } from '../truco/types.ts';
import { calculateEnvido } from '../truco/cards.ts';
import type {
  JevDecisionRequest,
  JevDecisionResponse,
  JevState,
  JevDecisionQuestions,
} from './types.ts';

/**
 * Extracts Jev's 3-card hand for envido calculation.
 * If allCardsJev is provided (original deal), uses that; otherwise uses current hand + played cards.
 */
function getJevEnvidoCards(state: JevState): Card[] {
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
            instructions: 'Decidir si aceptar, rechazar o aumentar la apuesta de Envido del rival',
            criteria: {
              quiero: 'Aceptar el envido si se tiene un puntaje competitivo (>=27) o para igualar',
              no_quiero: 'Rechazar el envido cuando el puntaje es bajo para minimizar pérdida',
              real_envido: 'Subir a Real Envido si se poseen 31 o más puntos y es favorable',
              falta_envido: 'Subir a Falta Envido si la mano es excepcional o situación límite',
            },
          },
        },
        nouls: {
          bluffing_probability: {
            instructions: 'Probabilidad de que Jev esté realizando un farol o mentira en Envido',
          },
        },
        scores: {
          hand_confidence: {
            instructions: 'Confianza de la mano en ganar el Envido (0 a 100)',
            scale: { min: 0, max: 100 },
          },
        },
      };

    case 'respond_truco':
      return {
        choices: {
          action: {
            instructions: 'Responder a la apuesta de Truco, Retruco o Vale Cuatro del rival',
            criteria: {
              quiero: 'Aceptar la apuesta con cartas medianas o altas',
              no_quiero: 'Rechazar e irse al mazo si la mano es débil y no hay esperanza',
              retruco: 'Aumentar a Retruco con cartas de jerarquía alta (>=10)',
              vale_cuatro: 'Aumentar a Vale Cuatro con cartas máximas (anchos, 7s bravos)',
            },
          },
        },
        nouls: {
          bluffing_probability: {
            instructions: 'Probabilidad de que Jev esté fingiendo fuerza en Truco',
          },
        },
        scores: {
          hand_confidence: {
            instructions: 'Confianza estimada en ganar la mano de Truco (0 a 100)',
            scale: { min: 0, max: 100 },
          },
        },
      };

    case 'play_card':
      return {
        choices: {
          card: {
            instructions: 'Seleccionar la mejor carta de la mano para jugar en la baza actual',
            criteria: state.hand.reduce<Record<string, string | null>>((acc, card) => {
              acc[card.id] = `Jugar ${card.name} (jerarquía ${card.rank})`;
              return acc;
            }, {}),
          },
          call: {
            instructions: 'Decidir si cantar Truco antes de tirar la carta',
            criteria: {
              truco: 'Cantar Truco al tener ventaja de cartas o control de baza',
              none: 'No cantar y solo jugar carta',
            },
          },
        },
        nouls: {
          call_truco: {
            instructions: 'Probabilidad recomendada de iniciar canto de Truco',
          },
          bluffing_probability: {
            instructions: 'Probabilidad de engaño en la carta o canto seleccionado',
          },
        },
        scores: {
          hand_confidence: {
            instructions: 'Fuerza global percibida de las cartas restantes (0 a 100)',
            scale: { min: 0, max: 100 },
          },
        },
      };

    case 'initiate_call':
      return {
        choices: {
          action: {
            instructions: 'Iniciar un canto de Envido o Truco en el turno',
            criteria: {
              envido: 'Cantar Envido inicial con >=28 puntos',
              real_envido: 'Cantar Real Envido inicial con >=31 puntos',
              truco: 'Cantar Truco con cartas altas',
              none: 'Pasar sin cantar',
            },
          },
        },
        nouls: {
          bluffing_probability: {
            instructions: 'Probabilidad de que el canto iniciado sea un farol',
          },
        },
        scores: {
          hand_confidence: {
            instructions: 'Nivel de confianza en los tantos o jerarquía para cantar (0 a 100)',
            scale: { min: 0, max: 100 },
          },
        },
      };
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

  return {
    choices: {
      action: { choice, confidence },
      envido_response: { choice, confidence },
    },
    nouls: {
      bluffing_probability: { probability: bluffingProb },
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
  let playerTrickWins = 0;
  let ties = 0;
  for (const t of state.tableTricks) {
    if (t.winner === 'jev') jevTrickWins++;
    else if (t.winner === 'player') playerTrickWins++;
    else if (t.winner === 'tie') ties++;
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

  return {
    choices: {
      action: { choice, confidence },
      truco_response: { choice, confidence },
    },
    nouls: {
      bluffing_probability: { probability: bluffingProb },
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
  const playerCardOnTable =
    state.playerCardOnTable ||
    state.tableTricks.find((t) => t.trickNumber === state.round && t.playerCard && !t.jevCard)?.playerCard;

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

  return {
    choices: {
      action: { choice: selectedCard.id, confidence },
      card: { choice: selectedCard.id, confidence },
      play_card: { choice: selectedCard.id, confidence },
      call: { choice: shouldInitiateTruco ? 'truco' : 'none', confidence: shouldInitiateTruco ? 0.78 : 0.90 },
      call_truco: { choice: shouldInitiateTruco ? 'truco' : 'none', confidence: shouldInitiateTruco ? 0.78 : 0.90 },
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

  let choice = 'none';
  let confidence = 0.85;
  let bluffProb = 0.05;
  let handConfidence = 50;
  let summary = 'Jev pasa sin cantar en este turno.';

  if (!state.envidoPlayed && state.round === 1) {
    if (envido >= 31) {
      choice = 'real_envido';
      confidence = 0.88;
      handConfidence = 92;
      summary = `Jev posee ${envido} puntos y decide cantar Real Envido.`;
    } else if (envido >= 28) {
      choice = 'envido';
      confidence = 0.82;
      handConfidence = 75;
      summary = `Jev posee ${envido} puntos y decide cantar Envido.`;
    }
  }

  if (choice === 'none') {
    const trucoNotCalled =
      !state.trucoLevel &&
      (!state.currentBid || (state.currentBid.type !== 'truco' && state.currentBid.type !== 'retruco' && state.currentBid.type !== 'vale_cuatro'));

    if (trucoNotCalled && (strongCards.length >= 2 || maxRank >= 12)) {
      choice = 'truco';
      confidence = 0.80;
      handConfidence = 80;
      summary = `Jev tiene cartas altas e inicia el canto de Truco.`;
    }
  }

  const questions = buildQuestionsForContext('initiate_call', state);

  return {
    choices: {
      action: { choice, confidence },
      call: { choice, confidence },
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
  const simLatency = Math.floor(Math.random() * 14) + 12;

  return {
    mode: 'local_simulator',
    latencyMs: simLatency,
    ...partial,
  };
}
