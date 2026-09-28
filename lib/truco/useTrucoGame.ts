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
import { sounds } from '../sound/audio.ts';
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
      const context: JevDecisionRequest['context'] =
        state.phase === 'envido_called'
          ? 'respond_envido'
          : state.phase === 'truco_called'
          ? 'respond_truco'
          : 'play_card';

      console.log(`[JevTruco] 🤖 Turno de Jev (${context}). Preparando consulta a Jev...`);

      // Build JevState (single source of truth for the model)
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

      // Legal opening calls are part of the state, so the card play and the
      // call decision are answered in a single System One request.
      if (context === 'play_card') {
        const calls: string[] = [];
        if (canCallEnvido(state, 'jev')) {
          calls.push(
            ...getAvailableEnvidoBids(state, 'jev').filter((b) => b !== 'none')
          );
        }
        const trucoBid = getAvailableTrucoBid(state, 'jev');
        if (trucoBid) calls.push(trucoBid);
        jevState.availableCalls = calls;
      }

      const fetchJevDecision = async (
        ctx: JevDecisionRequest['context'],
        st: JevState
      ): Promise<JevDecisionResponse> => {
        try {
          console.log(`[JevTruco] 📡 Consultando /api/jev/decision (${ctx})...`);
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          if (apiKey) {
            headers['x-jev-api-key'] = apiKey;
            headers['Authorization'] = `Bearer ${apiKey}`;
          }
          const response = await fetch('/api/jev/decision', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              state: st,
              context: ctx,
              apiKey: apiKey || undefined,
            }),
          });

          if (!response.ok) {
            throw new Error(`Decision API status: ${response.status}`);
          }
          const dec = (await response.json()) as JevDecisionResponse;
          dec.context = ctx;
          console.log(
            `[JevTruco] ✅ Respuesta recibida de API (${dec.mode}, ${dec.latencyMs}ms):`,
            dec.decisionSummary
          );
          return dec;
        } catch (err: unknown) {
          console.warn(
            `[JevTruco] ⚠️ Error en /api/jev/decision, usando fallback client:`,
            err instanceof Error ? err.message : err
          );
          const fallbackDec = await getJevDecision({ state: st, context: ctx }, apiKey);
          fallbackDec.context = ctx;
          return fallbackDec;
        }
      };

      const decision = await fetchJevDecision(context, jevState);

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
          if (choice === 'quiero') sounds.playQuiero();
          else if (choice === 'no_quiero') sounds.playNoQuiero();
          else if (choice === 'real_envido') sounds.playRealEnvido();
          else if (choice === 'falta_envido') sounds.playFaltaEnvido();
          else sounds.playEnvido();
          return machineRespondEnvido(stateWithDecision, choice);
        }

        if (context === 'respond_truco') {
          const choice = (decision.choices?.action?.choice ||
            decision.choices?.truco_response?.choice ||
            'quiero') as 'quiero' | 'no_quiero' | 'retruco' | 'vale_cuatro';
          console.log(`[JevTruco] 🤖 Jev responde al Truco: "${choice}"`);
          if (choice === 'quiero') sounds.playQuiero();
          else if (choice === 'no_quiero') sounds.playNoQuiero();
          else if (choice === 'retruco') sounds.playRetruco();
          else if (choice === 'vale_cuatro') sounds.playValeCuatro();
          return machineRespondTruco(stateWithDecision, choice);
        }

        if (context === 'play_card') {
          // El canto de apertura (envido/truco/raises) se resolvió en la misma
          // consulta que la carta: se aplica primero si es legal, y la carta
          // se juega en el próximo turno de Jev.
          const openingCall =
            decision.choices?.opening_call?.choice ||
            decision.choices?.call?.choice ||
            'none';

          const envidoCalls = ['envido', 'envido_envido', 'real_envido', 'falta_envido'];
          if (
            envidoCalls.includes(openingCall) &&
            canCallEnvido(current, 'jev') &&
            getAvailableEnvidoBids(current, 'jev').includes(openingCall as EnvidoBid)
          ) {
            console.log(`[JevTruco] 🤖 Jev inicia canto (modelo): "${openingCall}"`);
            if (openingCall === 'real_envido') sounds.playRealEnvido();
            else if (openingCall === 'falta_envido') sounds.playFaltaEnvido();
            else sounds.playEnvido();
            return machineCallEnvido(stateWithDecision, 'jev', openingCall as EnvidoBid);
          }

          const trucoCalls = ['truco', 'retruco', 'vale_cuatro'];
          const availableTruco = getAvailableTrucoBid(current, 'jev');
          if (trucoCalls.includes(openingCall) && availableTruco) {
            console.log(`[JevTruco] 🤖 Jev inicia canto (modelo): "${availableTruco}"`);
            if (availableTruco === 'retruco') sounds.playRetruco();
            else if (availableTruco === 'vale_cuatro') sounds.playValeCuatro();
            else sounds.playTruco();
            return machineCallTruco(stateWithDecision, 'jev');
          }

          const cardChoice =
            decision.choices?.card?.choice || decision.choices?.action?.choice;
          const cardToPlay =
            stateWithDecision.jevHand.find((c) => c.id === cardChoice) ||
            stateWithDecision.jevHand[0];

          if (cardToPlay) {
            console.log(`[JevTruco] 🤖 Jev juega carta: ${cardToPlay.name}`);
            sounds.playCard();
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
