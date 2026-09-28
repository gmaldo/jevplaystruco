'use client';

import React from 'react';
import type { Card, MatchState, EnvidoBid, TrucoBid } from '../lib/truco/types.ts';
import { calculateEnvido } from '../lib/truco/cards.ts';
import { CardView } from './CardView.tsx';
import { ActionControls } from './ActionControls.tsx';
import { sounds } from '../lib/sound/audio.ts';

export interface GameTableProps {
  state: MatchState;
  onPlayCard: (card: Card) => void;
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

export function GameTable({
  state,
  onPlayCard,
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
}: GameTableProps) {
  const {
    jevHand,
    playerHand,
    playedPlayerCards,
    table,
    isJevThinking,
    phase,
    turn,
    round,
    envidoState,
    trucoState,
    log,
    lastJevDecision,
  } = state;

  // Calculate full player hand envido score (cards in hand + already played)
  const fullPlayerCards = [...playerHand, ...playedPlayerCards];
  const envidoCalc = calculateEnvido(fullPlayerCards);

  // Latest call announcement banner / speech bubble
  const lastCantoLog = [...log]
    .reverse()
    .find((l) => l.type === 'canto' || l.type === 'win');

  // Jev message bubble determination
  let jevSpeech: string | null = null;
  if (isJevThinking) {
    jevSpeech = 'Analizando probabilidades...';
  } else if (phase === 'truco_called' && trucoState.bidBy === 'jev') {
    jevSpeech =
      trucoState.currentBid === 'truco'
        ? '¡TRUCO!'
        : trucoState.currentBid === 'retruco'
        ? '¡QUIERO RETRUCO!'
        : '¡VALE CUATRO!';
  } else if (phase === 'envido_called' && envidoState.bidBy === 'jev') {
    jevSpeech = `¡${envidoState.currentBid.replace('_', ' ').toUpperCase()}!`;
  } else if (lastJevDecision && turn === 'player' && phase === 'playing') {
    jevSpeech = lastJevDecision.decisionSummary || 'Tu turno de jugar.';
  }

  // Handle player playing a card
  const handleCardClick = (card: Card) => {
    if (!canPlay) return;
    sounds.playCard();
    onPlayCard(card);
  };

  // Helper for trick column status
  const getTrickResultBadge = (trickNumber: number) => {
    const trick = table.find((t) => t.round === trickNumber);
    if (!trick || !trick.winner) return null;

    if (trick.winner === 'player') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600/90 text-white shadow">
          ✓ Ganaste
        </span>
      );
    }
    if (trick.winner === 'jev') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-700/90 text-white shadow">
          🤖 Jev
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-600/90 text-white shadow">
        🤝 Parda
      </span>
    );
  };

  return (
    <div
      className={`relative w-full rounded-2xl sm:rounded-3xl overflow-hidden border-4 sm:border-8 lg:border-[10px] border-[#382212] shadow-2xl bg-gradient-to-b from-[#06331a] via-[#094723] to-[#042412] flex flex-col justify-between p-2 sm:p-4 lg:p-5 select-none min-h-[480px] sm:min-h-[560px] lg:min-h-[620px] ${className}`}
      style={{
        boxShadow:
          'inset 0 0 100px rgba(0,0,0,0.7), 0 20px 40px rgba(0,0,0,0.6)',
      }}
    >
      {/* Felt Texture Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(#ffffff 1px, transparent 1px), radial-gradient(#ffffff 1px, #042412 1px)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 10px 10px',
        }}
      />

      {/* ------------------------------------------------------------- */}
      {/* TOP AREA: Jev Opponent Avatar & Cards */}
      {/* ------------------------------------------------------------- */}
      <div className="relative z-10 flex flex-col items-center gap-2">
        <div className="flex items-center gap-3">
          {/* Jev Avatar */}
          <div className="relative flex items-center justify-center">
            <div
              className={`w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-tr from-cyan-900 to-slate-900 border-2 ${
                isJevThinking
                  ? 'border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.7)] animate-pulse'
                  : 'border-cyan-700/50 shadow-md'
              } flex items-center justify-center`}
            >
              <span className="text-xl sm:text-2xl">🤖</span>
            </div>
            {isJevThinking && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500" />
              </span>
            )}
          </div>

          {/* Jev Info & Speech Bubble */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-sm sm:text-base text-cyan-200">
                Jev AI
              </span>
              <span className="text-[10px] bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 px-1.5 py-0.2 rounded font-mono">
                System One
              </span>
              {state.mano === 'jev' && (
                <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded-full font-bold uppercase">
                  Mano
                </span>
              )}
            </div>

            {/* Speech bubble */}
            {jevSpeech && (
              <div className="relative mt-1 px-3 py-1 rounded-xl bg-stone-900/90 border border-cyan-500/40 text-cyan-100 text-xs shadow-lg max-w-xs animate-in fade-in duration-200">
                <span>{jevSpeech}</span>
              </div>
            )}
          </div>
        </div>

        {/* Jev Face-Down Hand (cards remaining) */}
        <div className="flex items-center justify-center gap-1 sm:gap-2 mt-1">
          {Array.from({ length: jevHand.length }).map((_, idx) => (
            <div
              key={`jev-card-${idx}`}
              className="transform transition-transform hover:-translate-y-1"
            >
              <CardView faceDown size="sm" />
            </div>
          ))}
          {jevHand.length === 0 && (
            <span className="text-[11px] text-stone-400 italic">
              Sin cartas en mano
            </span>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* CENTER AREA: Trick Mat (3 Rounds: Mano 1, 2, 3) */}
      {/* ------------------------------------------------------------- */}
      <div className="relative z-10 flex flex-col items-center justify-center my-3">
        {/* Floating Announcement Banner if there is an active canto or recent call */}
        {lastCantoLog && (
          <div className="mb-2 px-4 py-1 rounded-full bg-stone-950/80 border border-amber-500/40 text-amber-200 text-xs sm:text-sm font-serif font-bold shadow-lg backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200 flex items-center gap-2">
            <span>📢</span>
            <span>{lastCantoLog.text}</span>
          </div>
        )}

        {/* Center Green Table Cloth / Trick Mat */}
        <div className="w-full max-w-xl rounded-2xl bg-black/30 border border-emerald-600/30 p-1.5 sm:p-3 md:p-4 backdrop-blur-sm shadow-inner">
          <div className="grid grid-cols-3 gap-1 sm:gap-3 md:gap-4 divide-x divide-emerald-800/40">
            {[1, 2, 3].map((trickNum) => {
              const trick = table.find((t) => t.round === trickNum);
              const isCurrentTrick = round === trickNum && phase === 'playing';

              return (
                <div
                  key={`trick-${trickNum}`}
                  className={`flex flex-col items-center justify-between p-1 sm:p-2 rounded-xl transition-all ${
                    isCurrentTrick
                      ? 'bg-emerald-900/30 border border-amber-400/40 shadow-sm'
                      : ''
                  }`}
                >
                  {/* Trick Header */}
                  <div className="flex items-center gap-1 mb-0.5 sm:mb-1">
                    <span className="text-[10px] sm:text-[11px] font-mono font-bold text-emerald-300/80">
                      {trickNum}ª Mano
                    </span>
                    {getTrickResultBadge(trickNum)}
                  </div>

                  {/* Jev Played Card */}
                  <div className="h-16 sm:h-20 md:h-24 flex items-center justify-center">
                    {trick?.jevCard ? (
                      <CardView card={trick.jevCard} size="sm" />
                    ) : (
                      <div className="w-11 h-16 sm:w-14 sm:h-20 md:w-16 md:h-24 rounded-lg sm:rounded-xl border border-dashed border-emerald-700/40 flex items-center justify-center text-[9px] sm:text-[10px] text-emerald-600/60 font-mono">
                        Jev
                      </div>
                    )}
                  </div>

                  {/* VS divider */}
                  <span className="text-[9px] sm:text-[10px] font-mono font-bold text-amber-400/50 my-0.5 sm:my-1">
                    VS
                  </span>

                  {/* Player Played Card */}
                  <div className="h-16 sm:h-20 md:h-24 flex items-center justify-center">
                    {trick?.playerCard ? (
                      <CardView card={trick.playerCard} size="sm" />
                    ) : (
                      <div className="w-11 h-16 sm:w-14 sm:h-20 md:w-16 md:h-24 rounded-lg sm:rounded-xl border border-dashed border-emerald-700/40 flex items-center justify-center text-[9px] sm:text-[10px] text-emerald-600/60 font-mono">
                        Tú
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* BOTTOM AREA: Player Hand, Envido Badge & Action Controls */}
      {/* ------------------------------------------------------------- */}
      <div className="relative z-10 flex flex-col items-center gap-2 sm:gap-3">
        {/* Player Envido Badge & Helper */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-stone-900/85 border border-amber-600/40 shadow text-amber-100 text-[11px] sm:text-xs">
            <span>🌾</span>
            <span className="font-serif font-bold">Tantos Envido:</span>
            <span suppressHydrationWarning className="font-mono font-black text-amber-300 text-xs sm:text-sm">
              {envidoCalc.score}
            </span>
            {envidoCalc.cardsUsed.length > 0 && (
              <span className="text-[9px] sm:text-[10px] text-stone-400 hidden xs:inline">
                ({envidoCalc.cardsUsed.map((c) => `${c.value} ${c.suit.slice(0, 3)}`).join('+')})
              </span>
            )}
          </div>
        </div>

        {/* Player's Cards (Interactive Hand) */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-4 px-1 py-1">
          {playerHand.map((card, idx) => (
            <div
              key={card.id || `player-card-${idx}`}
              className="transform transition-transform"
            >
              <CardView
                card={card}
                onClick={() => handleCardClick(card)}
                disabled={!canPlay}
                isHighlighted={canPlay && turn === 'player'}
                size="md"
              />
            </div>
          ))}

          {playerHand.length === 0 && (
            <div className="text-xs text-stone-400 italic py-6">
              Ya jugaste todas tus cartas en esta mano
            </div>
          )}
        </div>

        {/* Dynamic Action Controls */}
        <ActionControls
          state={state}
          onCallEnvido={onCallEnvido}
          onRespondEnvido={onRespondEnvido}
          onCallTruco={onCallTruco}
          onRespondTruco={onRespondTruco}
          onFold={onFold}
          onStartNewHand={onStartNewHand}
          onRestartMatch={onRestartMatch}
          availableEnvidoBids={availableEnvidoBids}
          availableTrucoBid={availableTrucoBid}
          canPlay={canPlay}
          canEnvido={canEnvido}
          canTruco={canTruco}
        />
      </div>
    </div>
  );
}
