'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Card, EnvidoCall, TrucoCall } from './types.ts';
import type {
  JevDecisionRequest,
  JevDecisionResponse,
  JevState,
  TableTrick as JevTableTrick,
} from '../jev/types.ts';
import { getJevDecision } from '../jev/client.ts';
import { calculateEnvido } from './cards.ts';
import {
  type MatchState,
  type EnvidoBid,
  type TrucoBid,
  startNewMatch,
  startNewHand,
  playPlayerCard,
  playJevCard,
  callEnvido as machineCallEnvido,
  respondEnvido as machineRespondEnvido,
  callTruco as machineCallTruco,
  respondTruco as machineRespondTruco,
  foldHand as machineFoldHand,
  canCallEnvido,
  canCallTruco,
  canPlayCard,
  getAvailableEnvidoBids,
  getAvailableTrucoBid,
} from './game-machine.ts';

export interface UseTrucoGameReturn {
  state: MatchState;
  playCard: (card: Card) => void;
  callEnvido: (bid: EnvidoBid) => void;
  respondEnvido: (
    response: 'quiero' | 'no_quiero' | 'real_envido' | 'falta_envido'
  ) => void;
  callTruco: () => void;
  respondTruco: (
    response: 'quiero' | 'no_quiero' | 'retruco' | 'vale_cuatro'
  ) => void;
  fold: () => void;
  startNewHand: () => void;
  restartMatch: (target?: 15 | 30) => void;
  setApiKey: (key: string) => void;
  apiKey: string;
  decisionHistory: JevDecisionResponse[];
  availableEnvidoBids: EnvidoBid[];
  availableTrucoBid: TrucoBid | null;
  canPlay: boolean;
  canEnvido: boolean;
  canTruco: boolean;
}

export function useTrucoGame(initialTarget: 15 | 30 = 30): UseTrucoGameReturn {
  const [state, setState] = useState<MatchState>(() =>
    startNewMatch(initialTarget)
  );
  const [apiKey, setApiKey] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored =
        localStorage.getItem('JEV_API_KEY') ||
        localStorage.getItem('TYPESAFE_API_KEY');
      return stored || '';
    }
    return '';
  });
  const [decisionHistory, setDecisionHistory] = useState<JevDecisionResponse[]>([]);
  const lastExecutedActionKeyRef = useRef<string>('');
  const activeRequestIdRef = useRef<number>(0);

  const handleSetApiKey = useCallback((key: string) => {
    setApiKey(key);
    if (typeof window !== 'undefined') {
      if (key) {
        localStorage.setItem('JEV_API_KEY', key);
        localStorage.setItem('TYPESAFE_API_KEY', key);
      } else {
        localStorage.removeItem('JEV_API_KEY');
        localStorage.removeItem('TYPESAFE_API_KEY');
      }
    }
  }, []);

  // Player action wrappers
  const playCard = useCallback((card: Card) => {
    setState((current) => playPlayerCard(current, card));
  }, []);

  const callEnvidoAction = useCallback((bid: EnvidoBid) => {
    setState((current) => machineCallEnvido(current, 'player', bid));
  }, []);

  const respondEnvidoAction = useCallback(
    (response: 'quiero' | 'no_quiero' | 'real_envido' | 'falta_envido') => {
      setState((current) => machineRespondEnvido(current, response));
    },
    []
  );

  const callTrucoAction = useCallback(() => {
    setState((current) => machineCallTruco(current, 'player'));
  }, []);

  const respondTrucoAction = useCallback(
    (response: 'quiero' | 'no_quiero' | 'retruco' | 'vale_cuatro') => {
      setState((current) => machineRespondTruco(current, response));
    },
    []
  );

  const foldAction = useCallback(() => {
    setState((current) => machineFoldHand(current, 'player'));
  }, []);

  const startNewHandAction = useCallback(() => {
    lastExecutedActionKeyRef.current = '';
    setState((current) => startNewHand(current));
  }, []);

  const restartMatchAction = useCallback(
    (target?: 15 | 30) => {
      lastExecutedActionKeyRef.current = '';
      setDecisionHistory([]);
      setState(startNewMatch(target || initialTarget));
    },
    [initialTarget]
  );

  // Automatic Jev execution turn observer
  useEffect(() => {
    const isJevTurn =
      state.turn === 'jev' &&
      state.phase !== 'match_ended' &&
      state.phase !== 'hand_ended' &&
      state.phase !== 'idle';

    if (!isJevTurn) {
      return;
    }

    const actionKey = `${state.round}-${state.turn}-${state.phase}-${state.table
      .map(
        (t) =>
          `${t.round}:${t.playerCard?.id || ''}:${t.jevCard?.id || ''}:${t.winner || ''}`
      )
      .join('-')}-${state.envidoState.status}:${state.envidoState.currentBid}-${state.trucoState.status}:${state.trucoState.currentBid}`;

    if (lastExecutedActionKeyRef.current === actionKey) {
      return;
    }

    lastExecutedActionKeyRef.current = actionKey;
    const currentRequestId = ++activeRequestIdRef.current;

    // Set isJevThinking to true immediately so UI updates
    setState((current) => {
      if (current.isJevThinking) return current;
      return { ...current, isJevThinking: true };
    });

    const executeJevDecision = async () => {
      // Natural delay (500ms) for human-like pacing and UI feedback
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (activeRequestIdRef.current !== currentRequestId) {
        return;
      }

      // Determine context
      let context: JevDecisionRequest['context'] = 'play_card';
      if (state.phase === 'envido_called') {
        context = 'respond_envido';
      } else if (state.phase === 'truco_called') {
        context = 'respond_truco';
      } else {
        context = 'play_card';
      }

      console.log(`[JevTruco] 🤖 Turno de Jev (${context}). Preparando consulta a Jev...`);

      // Check if Jev is Mano in Round 1 and holds strong envido to initiate call
      if (
        context === 'play_card' &&
        state.round === 1 &&
        state.envidoState.status === 'pending' &&
        canCallEnvido(state, 'jev')
      ) {
        const jevCards = [...state.jevHand, ...state.playedJevCards];
        const envidoScore = calculateEnvido(jevCards).score;
        if (envidoScore >= 31) {
          console.log(`[JevTruco] 🤖 Jev canta Real Envido de primera (${envidoScore} tantos)`);
          setState((current) =>
            machineCallEnvido(
              { ...current, isJevThinking: false },
              'jev',
              'real_envido'
            )
          );
          return;
        } else if (envidoScore >= 28) {
          console.log(`[JevTruco] 🤖 Jev canta Envido de primera (${envidoScore} tantos)`);
          setState((current) =>
            machineCallEnvido(
              { ...current, isJevThinking: false },
              'jev',
              'envido'
            )
          );
          return;
        }
      }

      // Build JevState
      const tableTricks: JevTableTrick[] = state.table.map((t) => ({
        trickNumber: t.round as 1 | 2 | 3,
        playerCard: t.playerCard,
        jevCard: t.jevCard,
        winner: t.winner,
      }));

      const currentTrick = state.table.find((t) => t.round === state.round);

      const jevState: JevState = {
        hand: state.jevHand,
        allCardsJev: [...state.jevHand, ...state.playedJevCards],
        round: state.round,
        tableTricks,
        currentBid:
          state.phase === 'envido_called'
            ? {
                type:
                  state.envidoState.currentBid === 'none'
                    ? null
                    : (state.envidoState.currentBid as EnvidoCall),
                offeredBy: state.envidoState.bidBy || null,
              }
            : state.phase === 'truco_called'
            ? {
                type:
                  state.trucoState.currentBid === 'none'
                    ? null
                    : (state.trucoState.currentBid as TrucoCall),
                offeredBy: state.trucoState.bidBy || null,
                level:
                  state.trucoState.currentBid === 'truco'
                    ? 1
                    : state.trucoState.currentBid === 'retruco'
                    ? 2
                    : 3,
              }
            : null,
        score: {
          player: state.scores.player,
          jev: state.scores.jev,
          target: state.scores.target as 15 | 30,
        },
        mano: state.mano,
        playerCardOnTable: currentTrick?.playerCard || null,
        envidoPlayed:
          state.envidoState.status === 'resolved' ||
          state.envidoState.status === 'declined' ||
          state.envidoState.status === 'closed',
        trucoLevel:
          state.trucoState.currentBid === 'none'
            ? 0
            : state.trucoState.currentBid === 'truco'
            ? 1
            : state.trucoState.currentBid === 'retruco'
            ? 2
            : 3,
        trucoAccepted: state.trucoState.status === 'accepted',
        trucoOfferedBy: state.trucoState.bidBy || null,
      };

      let decision: JevDecisionResponse;
      try {
        console.log(`[JevTruco] 📡 Consultando /api/jev/decision...`);
        const response = await fetch('/api/jev/decision', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-jev-api-key': apiKey,
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            state: jevState,
            context,
            apiKey: apiKey || undefined,
          }),
        });

        if (!response.ok) {
          throw new Error(`Decision API status: ${response.status}`);
        }
        decision = await response.json();
        console.log(
          `[JevTruco] ✅ Respuesta recibida de API (${decision.mode}, ${decision.latencyMs}ms):`,
          decision.decisionSummary
        );
      } catch (err: unknown) {
        console.warn(
          `[JevTruco] ⚠️ Error en /api/jev/decision, usando fallback client:`,
          err instanceof Error ? err.message : err
        );
        decision = await getJevDecision({ state: jevState, context }, apiKey);
      }

      if (activeRequestIdRef.current !== currentRequestId) {
        return;
      }

      setDecisionHistory((prev) => [decision, ...prev.slice(0, 29)]);

      // Apply decision to state machine
      setState((current) => {
        if (current.turn !== 'jev') {
          return current;
        }

        const stateWithDecision = {
          ...current,
          isJevThinking: false,
          lastJevDecision: decision,
        };

        if (context === 'respond_envido') {
          const choice = (decision.choices?.action?.choice ||
            decision.choices?.envido_response?.choice ||
            'quiero') as 'quiero' | 'no_quiero' | 'real_envido' | 'falta_envido';
          console.log(`[JevTruco] 🤖 Jev responde al Envido: "${choice}"`);
          return machineRespondEnvido(stateWithDecision, choice);
        }

        if (context === 'respond_truco') {
          const choice = (decision.choices?.action?.choice ||
            decision.choices?.truco_response?.choice ||
            'quiero') as 'quiero' | 'no_quiero' | 'retruco' | 'vale_cuatro';
          console.log(`[JevTruco] 🤖 Jev responde al Truco: "${choice}"`);
          return machineRespondTruco(stateWithDecision, choice);
        }

        if (context === 'play_card') {
          // Check if Jev wanted to call truco before card play
          const wantTruco =
            decision.choices?.call?.choice === 'truco' &&
            canCallTruco(stateWithDecision, 'jev');

          if (wantTruco) {
            console.log(`[JevTruco] 🤖 Jev canta ¡TRUCO! antes de jugar carta`);
            return machineCallTruco(stateWithDecision, 'jev');
          }

          const cardChoice =
            decision.choices?.card?.choice || decision.choices?.action?.choice;
          const cardToPlay =
            stateWithDecision.jevHand.find((c) => c.id === cardChoice) ||
            stateWithDecision.jevHand[0];

          if (cardToPlay) {
            console.log(`[JevTruco] 🤖 Jev juega carta: ${cardToPlay.name}`);
            return playJevCard(stateWithDecision, cardToPlay);
          }
        }

        return stateWithDecision;
      });
    };

    executeJevDecision();
  }, [state, apiKey]);

  return {
    state,
    playCard,
    callEnvido: callEnvidoAction,
    respondEnvido: respondEnvidoAction,
    callTruco: callTrucoAction,
    respondTruco: respondTrucoAction,
    fold: foldAction,
    startNewHand: startNewHandAction,
    restartMatch: restartMatchAction,
    setApiKey: handleSetApiKey,
    apiKey,
    decisionHistory,
    availableEnvidoBids: getAvailableEnvidoBids(state, 'player'),
    availableTrucoBid: getAvailableTrucoBid(state, 'player'),
    canPlay: canPlayCard(state, 'player'),
    canEnvido: canCallEnvido(state, 'player'),
    canTruco: canCallTruco(state, 'player'),
  };
}
