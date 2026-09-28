'use client';

import React, { useState } from 'react';
import type { MatchState, EnvidoBid, TrucoBid } from '../lib/truco/types.ts';
import { sounds } from '../lib/sound/audio.ts';

export interface ActionControlsProps {
  state: MatchState;
  onCallEnvido: (bid: EnvidoBid) => void;
  onRespondEnvido: (
    response: 'quiero' | 'no_quiero' | 'real_envido' | 'falta_envido'
  ) => void;
  onCallTruco: () => void;
  onRespondTruco: (
    response: 'quiero' | 'no_quiero' | 'retruco' | 'vale_cuatro'
  ) => void;
  onFold: () => void;
  onStartNewHand: () => void;
  onRestartMatch: (target?: 15 | 30) => void;
  availableEnvidoBids: EnvidoBid[];
  availableTrucoBid: TrucoBid | null;
  canPlay: boolean;
  canEnvido: boolean;
  canTruco: boolean;
  className?: string;
}

export function ActionControls({
  state,
  onCallEnvido,
  onRespondEnvido,
  onCallTruco,
  onRespondTruco,
  onFold,
  onStartNewHand,
  onRestartMatch,
  availableEnvidoBids,
  availableTrucoBid,
  canPlay,
  canEnvido,
  canTruco,
  className = '',
}: ActionControlsProps) {
  const [showEnvidoMenu, setShowEnvidoMenu] = useState(false);
  const { phase, turn, trucoState, envidoState } = state;

  // 1. Hand Ended State: Button to start next hand
  if (phase === 'hand_ended') {
    return (
      <div className={`flex flex-col sm:flex-row items-center justify-center gap-3 p-3 bg-stone-900/90 rounded-2xl border border-amber-900/40 shadow-xl ${className}`}>
        <span className="text-sm font-serif font-bold text-amber-200 text-center">
          {state.handWinner === 'player'
            ? '🎉 ¡Ganaste la mano!'
            : state.handWinner === 'jev'
            ? '🤖 Jev ganó la mano'
            : '🤝 Mano empatada'}
        </span>
        <button
          onClick={() => {
            sounds.playDeal();
            onStartNewHand();
          }}
          className="px-5 py-2.5 rounded-xl font-serif font-bold text-sm sm:text-base bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 text-white shadow-lg shadow-emerald-900/40 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
        >
          <span>🎴</span>
          <span>Repartir Siguiente Mano</span>
        </button>
      </div>
    );
  }

  // 2. Match Ended State: Button to play rematch
  if (phase === 'match_ended') {
    const isWinner = state.matchWinner === 'player';
    return (
      <div className={`flex flex-col items-center justify-center gap-3 p-4 bg-stone-900/95 rounded-2xl border-2 ${isWinner ? 'border-amber-400' : 'border-rose-900/60'} shadow-2xl ${className}`}>
        <div className="text-center">
          <span className="text-3xl block mb-1">{isWinner ? '🏆 🧉 🏆' : '💀'}</span>
          <h3 className={`text-lg sm:text-xl font-serif font-black ${isWinner ? 'text-amber-300' : 'text-rose-400'}`}>
            {isWinner ? '¡FELICITACIONES! ¡GANASTE EL PARTIDO!' : 'JEV HA GANADO EL PARTIDO'}
          </h3>
          <p className="text-xs text-stone-300 mt-0.5">
            Marcador final: Nosotros {state.scores.player} - Ellos {state.scores.jev} (A {state.scores.target} pts)
          </p>
        </div>
        <div className="flex gap-3 mt-1">
          <button
            onClick={() => {
              sounds.playDeal();
              onRestartMatch(state.scores.target as 15 | 30);
            }}
            className="px-6 py-2.5 rounded-xl font-serif font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 shadow-lg shadow-amber-900/50 active:scale-95 transition-all cursor-pointer"
          >
            🔄 Jugar Revancha
          </button>
        </div>
      </div>
    );
  }

  // 3. Jev Called Truco / Retruco / Vale Cuatro - Player must respond!
  if (phase === 'truco_called' && turn === 'player') {
    const currentBid = trucoState.currentBid;
    return (
      <div className={`flex flex-wrap items-center justify-center gap-2 p-2.5 sm:p-3 bg-stone-950/90 rounded-2xl border border-amber-500/60 shadow-xl backdrop-blur-md ${className}`}>
        <span className="w-full text-center text-xs font-serif font-bold uppercase tracking-wider text-amber-300 mb-1">
          🤖 Jev cantó {currentBid.toUpperCase()} — ¿Qué respondes?
        </span>

        {/* QUIERO */}
        <button
          onClick={() => {
            sounds.playQuiero();
            onRespondTruco('quiero');
          }}
          className="px-4 py-2.5 min-h-[44px] touch-manipulation rounded-xl font-serif font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-md shadow-emerald-950/50 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
        >
          ✓ ¡QUIERO!
        </button>

        {/* NO QUIERO */}
        <button
          onClick={() => {
            sounds.playNoQuiero();
            onRespondTruco('no_quiero');
          }}
          className="px-4 py-2.5 min-h-[44px] touch-manipulation rounded-xl font-serif font-bold text-xs sm:text-sm bg-rose-700 hover:bg-rose-600 active:bg-rose-800 text-white shadow-md shadow-rose-950/50 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
        >
          ✗ NO QUIERO
        </button>

        {/* Escalation: RETRUCO if current was truco */}
        {currentBid === 'truco' && (
          <button
            onClick={() => {
              sounds.playRetruco();
              onRespondTruco('retruco');
            }}
            className="px-4 py-2.5 min-h-[44px] touch-manipulation rounded-xl font-serif font-bold text-xs sm:text-sm bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white shadow-md shadow-amber-950/50 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
          >
            🔥 ¡QUIERO RETRUCO! (3 pts)
          </button>
        )}

        {/* Escalation: VALE CUATRO if current was retruco */}
        {currentBid === 'retruco' && (
          <button
            onClick={() => {
              sounds.playValeCuatro();
              onRespondTruco('vale_cuatro');
            }}
            className="px-4 py-2.5 min-h-[44px] touch-manipulation rounded-xl font-serif font-bold text-xs sm:text-sm bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white shadow-md shadow-purple-950/50 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
          >
            ⚡ ¡VALE CUATRO! (4 pts)
          </button>
        )}

        {/* El envido va primero: if round 1 and envido pending */}
        {canEnvido && (
          <button
            onClick={() => {
              sounds.playEnvido();
              onCallEnvido('envido');
            }}
            className="px-4 py-2.5 min-h-[44px] touch-manipulation rounded-xl font-serif font-bold text-xs sm:text-sm bg-blue-700 hover:bg-blue-600 active:bg-blue-800 text-white shadow-md shadow-blue-950/50 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
          >
            🌾 ¡EL ENVIDO VA PRIMERO!
          </button>
        )}
      </div>
    );
  }

  // 4. Jev Called Envido - Player must respond!
  if (phase === 'envido_called' && turn === 'player') {
    const currentBid = envidoState.currentBid;
    return (
      <div className={`flex flex-wrap items-center justify-center gap-2 p-2.5 sm:p-3 bg-stone-950/90 rounded-2xl border border-blue-500/60 shadow-xl backdrop-blur-md ${className}`}>
        <span className="w-full text-center text-xs font-serif font-bold uppercase tracking-wider text-blue-300 mb-1">
          🤖 Jev cantó {currentBid.replace('_', ' ').toUpperCase()} — ¿Qué respondes?
        </span>

        {/* QUIERO */}
        <button
          onClick={() => {
            sounds.playQuiero();
            onRespondEnvido('quiero');
          }}
          className="px-4 py-2.5 min-h-[44px] touch-manipulation rounded-xl font-serif font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-md shadow-emerald-950/50 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
        >
          ✓ ¡QUIERO!
        </button>

        {/* NO QUIERO */}
        <button
          onClick={() => {
            sounds.playNoQuiero();
            onRespondEnvido('no_quiero');
          }}
          className="px-4 py-2.5 min-h-[44px] touch-manipulation rounded-xl font-serif font-bold text-xs sm:text-sm bg-rose-700 hover:bg-rose-600 active:bg-rose-800 text-white shadow-md shadow-rose-950/50 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
        >
          ✗ NO QUIERO
        </button>

        {/* Raise options */}
        {availableEnvidoBids.map((bid) => {
          const label =
            bid === 'envido_envido'
              ? '🌾 ¡ENVIDO! (Sube a 4)'
              : bid === 'real_envido'
              ? '🌾 ¡REAL ENVIDO!'
              : '⚡ ¡FALTA ENVIDO!';
          const playAudio =
            bid === 'real_envido'
              ? () => sounds.playRealEnvido()
              : bid === 'falta_envido'
              ? () => sounds.playFaltaEnvido()
              : () => sounds.playEnvido();
          return (
            <button
              key={bid}
              onClick={() => {
                playAudio();
                onCallEnvido(bid);
              }}
              className="px-4 py-2.5 min-h-[44px] touch-manipulation rounded-xl font-serif font-bold text-xs sm:text-sm bg-blue-700 hover:bg-blue-600 active:bg-blue-800 text-white shadow-md shadow-blue-950/50 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
            >
              {label}
            </button>
          );
        })}
      </div>
    );
  }

  // 5. Normal playing turn
  const isPlayerTurn = turn === 'player' && phase === 'playing';

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {/* Action Buttons Bar */}
      <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 sm:p-2 bg-stone-950/80 rounded-2xl border border-stone-800 shadow-xl backdrop-blur-md">
        {/* Cantar Envido Menu Trigger */}
        {canEnvido && (
          <div className="relative">
            <button
              onClick={() => setShowEnvidoMenu((v) => !v)}
              className="px-3.5 py-2 sm:px-4 sm:py-2.5 min-h-[44px] touch-manipulation rounded-xl font-serif font-bold text-xs sm:text-sm bg-stone-800 hover:bg-blue-900/60 active:bg-blue-950 text-blue-200 border border-blue-600/40 shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>🌾</span>
              <span>Cantar Envido...</span>
              <span className="text-[10px]">▼</span>
            </button>

            {/* Backdrop to close menu on outside tap */}
            {showEnvidoMenu && (
              <div
                className="fixed inset-0 z-20"
                onClick={() => setShowEnvidoMenu(false)}
              />
            )}

            {/* Dropdown for Envido variants */}
            {showEnvidoMenu && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 mb-2 w-52 rounded-xl bg-stone-900 border border-blue-600/50 shadow-2xl p-1.5 flex flex-col gap-1 z-30 animate-in fade-in zoom-in-95 duration-150">
                {availableEnvidoBids.map((bid) => {
                  const label =
                    bid === 'envido'
                      ? 'Envido (2 pts)'
                      : bid === 'envido_envido'
                      ? 'Envido (sube a 4)'
                      : bid === 'real_envido'
                      ? 'Real Envido (3 pts)'
                      : 'Falta Envido (El partido)';
                  return (
                    <button
                      key={bid}
                      onClick={() => {
                        if (bid === 'real_envido') sounds.playRealEnvido();
                        else if (bid === 'falta_envido') sounds.playFaltaEnvido();
                        else sounds.playEnvido();
                        setShowEnvidoMenu(false);
                        onCallEnvido(bid);
                      }}
                      className="w-full text-left px-3 py-2.5 min-h-[44px] touch-manipulation rounded-lg font-serif text-xs font-bold text-blue-100 hover:bg-blue-600/40 active:bg-blue-600/60 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Cantar Truco Button */}
        {canTruco && availableTrucoBid && (
          <button
            onClick={() => {
              if (availableTrucoBid === 'truco') sounds.playTruco();
              else if (availableTrucoBid === 'retruco') sounds.playRetruco();
              else if (availableTrucoBid === 'vale_cuatro') sounds.playValeCuatro();
              onCallTruco();
            }}
            className="px-3.5 py-2 sm:px-4 sm:py-2.5 min-h-[44px] touch-manipulation rounded-xl font-serif font-bold text-xs sm:text-sm bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 active:from-amber-700 active:to-amber-800 text-white border border-amber-400/50 shadow-md shadow-amber-950/50 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>⚔️</span>
            <span>
              {availableTrucoBid === 'truco'
                ? '¡Cantar TRUCO! (2 pts)'
                : availableTrucoBid === 'retruco'
                ? '¡Cantar RETRUCO! (3 pts)'
                : '¡VALE CUATRO! (4 pts)'}
            </span>
          </button>
        )}

        {/* Irse al Mazo Button */}
        {isPlayerTurn && (
          <button
            onClick={() => {
              sounds.playLose();
              onFold();
            }}
            className="px-3.5 py-2 sm:px-4 sm:py-2.5 min-h-[44px] touch-manipulation rounded-xl font-serif font-medium text-xs sm:text-sm bg-stone-900/80 hover:bg-rose-950/70 active:bg-rose-950 text-stone-400 hover:text-rose-300 border border-stone-700 hover:border-rose-800/60 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Abandonar la mano actual y otorgar los puntos en disputa al rival"
          >
            <span>🏳️</span>
            <span>Irse al mazo</span>
          </button>
        )}

        {/* Indicator if not player's turn */}
        {!isPlayerTurn && (
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-stone-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Esperando a Jev...</span>
          </div>
        )}
      </div>

      {/* Helpful Hint */}
      {isPlayerTurn && canPlay && (
        <span className="text-[11px] text-amber-200/80 font-mono tracking-wide">
          💡 Haz clic en una carta de tu mano para jugarla a la mesa
        </span>
      )}
    </div>
  );
}
