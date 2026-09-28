'use client';

import React from 'react';
import type { MatchState } from '../lib/truco/types.ts';

export interface ScoreBoardProps {
  state: MatchState;
  className?: string;
}

// -------------------------------------------------------------
// SVG Matchstick (Fósforo) Box Component
// -------------------------------------------------------------

export function MatchstickBox({ count = 0 }: { count: number }) {
  const c = Math.min(5, Math.max(0, count));

  return (
    <svg
      viewBox="0 0 44 44"
      className="w-8 h-8 sm:w-10 sm:h-10 transition-all duration-300"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background slot */}
      <rect
        x="4"
        y="4"
        width="36"
        height="36"
        rx="3"
        fill="rgba(0, 0, 0, 0.25)"
        stroke={c > 0 ? 'rgba(217, 119, 6, 0.4)' : 'rgba(255, 255, 255, 0.1)'}
        strokeWidth="1"
        strokeDasharray={c === 0 ? '2 2' : undefined}
      />

      {/* 1: Top horizontal stick */}
      {c >= 1 && (
        <g className="animate-in fade-in duration-200">
          <line x1="8" y1="8" x2="36" y2="8" stroke="#fcd34d" strokeWidth="3" strokeLinecap="round" />
          {/* Sulfur head */}
          <circle cx="8" cy="8" r="2.2" fill="#ef4444" stroke="#991b1b" strokeWidth="0.6" />
        </g>
      )}

      {/* 2: Right vertical stick */}
      {c >= 2 && (
        <g className="animate-in fade-in duration-200">
          <line x1="36" y1="8" x2="36" y2="36" stroke="#fcd34d" strokeWidth="3" strokeLinecap="round" />
          {/* Sulfur head */}
          <circle cx="36" cy="8" r="2.2" fill="#ef4444" stroke="#991b1b" strokeWidth="0.6" />
        </g>
      )}

      {/* 3: Bottom horizontal stick */}
      {c >= 3 && (
        <g className="animate-in fade-in duration-200">
          <line x1="36" y1="36" x2="8" y2="36" stroke="#fcd34d" strokeWidth="3" strokeLinecap="round" />
          {/* Sulfur head */}
          <circle cx="36" cy="36" r="2.2" fill="#ef4444" stroke="#991b1b" strokeWidth="0.6" />
        </g>
      )}

      {/* 4: Left vertical stick */}
      {c >= 4 && (
        <g className="animate-in fade-in duration-200">
          <line x1="8" y1="36" x2="8" y2="8" stroke="#fcd34d" strokeWidth="3" strokeLinecap="round" />
          {/* Sulfur head */}
          <circle cx="8" cy="36" r="2.2" fill="#ef4444" stroke="#991b1b" strokeWidth="0.6" />
        </g>
      )}

      {/* 5: Diagonal crossing stick */}
      {c >= 5 && (
        <g className="animate-in fade-in duration-200">
          <line x1="9" y1="9" x2="35" y2="35" stroke="#f59e0b" strokeWidth="3.2" strokeLinecap="round" />
          {/* Sulfur head */}
          <circle cx="9" cy="9" r="2.4" fill="#dc2626" stroke="#7f1d1d" strokeWidth="0.8" />
        </g>
      )}
    </svg>
  );
}

// Helper to partition points into groups of 5
function getBoxes(points: number, target: number): { malas: number[]; buenas: number[] } {
  const is30 = target === 30;
  const malasTotal = 15;

  const malasPoints = Math.min(malasTotal, points);
  const buenasPoints = is30 ? Math.max(0, points - 15) : 0;

  const malasBoxes: number[] = [];
  const malasCount = is30 ? 3 : 3;
  for (let i = 0; i < malasCount; i++) {
    const ptsInBox = Math.max(0, Math.min(5, malasPoints - i * 5));
    malasBoxes.push(ptsInBox);
  }

  const buenasBoxes: number[] = [];
  if (is30) {
    for (let i = 0; i < 3; i++) {
      const ptsInBox = Math.max(0, Math.min(5, buenasPoints - i * 5));
      buenasBoxes.push(ptsInBox);
    }
  }

  return { malas: malasBoxes, buenas: buenasBoxes };
}

// -------------------------------------------------------------
// ScoreBoard Component
// -------------------------------------------------------------

export function ScoreBoard({ state, className = '' }: ScoreBoardProps) {
  const { scores, mano, turn, trucoState } = state;
  const target = scores.target;
  const is30 = target === 30;

  const playerBoxes = getBoxes(scores.player, target);
  const jevBoxes = getBoxes(scores.jev, target);

  const playerInBuenas = is30 && scores.player > 15;
  const jevInBuenas = is30 && scores.jev > 15;

  return (
    <div
      className={`rounded-2xl border border-amber-900/60 bg-gradient-to-b from-stone-900 via-stone-950 to-neutral-950 p-4 text-amber-100 shadow-xl backdrop-blur-md ${className}`}
    >
      {/* Header bar: Match info & Current stake */}
      <div className="flex items-center justify-between border-b border-amber-900/40 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🧉</span>
          <div>
            <h2 className="text-sm font-serif font-bold tracking-wider text-amber-300 uppercase">
              Tanteador Criollo
            </h2>
            <p className="text-[11px] text-stone-400">
              A {target} puntos ({is30 ? 'Malas y Buenas' : 'Partida corta'})
            </p>
          </div>
        </div>

        {/* Stake indicator */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-wider text-amber-400/80 font-mono">
              En juego
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
              {trucoState.pointsAtStake}{' '}
              {trucoState.pointsAtStake === 1 ? 'punto' : 'puntos'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Scoreboard: Nosotros vs Ellos */}
      <div className="grid grid-cols-2 gap-3 divide-x divide-amber-900/40">
        {/* NOSOTROS (HUMANO) */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between pr-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
              <span className="font-serif font-black text-sm sm:text-base text-stone-100">
                Nosotros
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">(Tú)</span>
            </div>
            {mano === 'player' && (
              <span
                title="Es la Mano: tiene ventaja en empate"
                className="text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded-full uppercase"
              >
                Mano
              </span>
            )}
          </div>

          {/* Numeric Points display */}
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-serif font-extrabold text-amber-300">
              {scores.player}
            </span>
            <span className="text-xs text-stone-400 font-mono">
              / {target} pts
            </span>
            {is30 && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  playerInBuenas
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50'
                    : 'bg-rose-950 text-rose-300 border border-rose-800/50'
                }`}
              >
                {playerInBuenas ? 'En Buenas' : 'En Malas'}
              </span>
            )}
          </div>

          {/* Matchsticks boxes */}
          <div className="space-y-2 mt-1">
            {/* Malas Section */}
            <div>
              <div className="text-[10px] uppercase font-mono text-stone-400 mb-1 flex items-center justify-between">
                <span>{is30 ? 'Malas (15)' : 'Puntos (15)'}</span>
                <span className="text-[9px] text-stone-500">
                  {Math.min(15, scores.player)}/15
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {playerBoxes.malas.map((count, idx) => (
                  <MatchstickBox key={`player-malas-${idx}`} count={count} />
                ))}
              </div>
            </div>

            {/* Buenas Section (if target is 30) */}
            {is30 && (
              <div>
                <div className="text-[10px] uppercase font-mono text-stone-400 mb-1 flex items-center justify-between">
                  <span>Buenas (15)</span>
                  <span className="text-[9px] text-stone-500">
                    {Math.max(0, scores.player - 15)}/15
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {playerBoxes.buenas.map((count, idx) => (
                    <MatchstickBox key={`player-buenas-${idx}`} count={count} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ELLOS (JEV AI) */}
        <div className="flex flex-col gap-2 pl-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50 animate-pulse" />
              <span className="font-serif font-black text-sm sm:text-base text-stone-100">
                Ellos
              </span>
              <span className="text-[10px] text-cyan-300 font-mono">(Jev AI)</span>
            </div>
            {mano === 'jev' && (
              <span
                title="Es la Mano: tiene ventaja en empate"
                className="text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded-full uppercase"
              >
                Mano
              </span>
            )}
          </div>

          {/* Numeric Points display */}
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-serif font-extrabold text-amber-300">
              {scores.jev}
            </span>
            <span className="text-xs text-stone-400 font-mono">
              / {target} pts
            </span>
            {is30 && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  jevInBuenas
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50'
                    : 'bg-rose-950 text-rose-300 border border-rose-800/50'
                }`}
              >
                {jevInBuenas ? 'En Buenas' : 'En Malas'}
              </span>
            )}
          </div>

          {/* Matchsticks boxes */}
          <div className="space-y-2 mt-1">
            {/* Malas Section */}
            <div>
              <div className="text-[10px] uppercase font-mono text-stone-400 mb-1 flex items-center justify-between">
                <span>{is30 ? 'Malas (15)' : 'Puntos (15)'}</span>
                <span className="text-[9px] text-stone-500">
                  {Math.min(15, scores.jev)}/15
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {jevBoxes.malas.map((count, idx) => (
                  <MatchstickBox key={`jev-malas-${idx}`} count={count} />
                ))}
              </div>
            </div>

            {/* Buenas Section (if target is 30) */}
            {is30 && (
              <div>
                <div className="text-[10px] uppercase font-mono text-stone-400 mb-1 flex items-center justify-between">
                  <span>Buenas (15)</span>
                  <span className="text-[9px] text-stone-500">
                    {Math.max(0, scores.jev - 15)}/15
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {jevBoxes.buenas.map((count, idx) => (
                    <MatchstickBox key={`jev-buenas-${idx}`} count={count} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer turn status */}
      <div className="mt-3 pt-2.5 border-t border-amber-900/30 flex items-center justify-between text-xs text-stone-400">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono uppercase text-stone-500">
            Turno actual:
          </span>
          <span
            className={`font-semibold px-2 py-0.5 rounded text-xs ${
              turn === 'player'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                : 'bg-cyan-950 text-cyan-300 border border-cyan-700/60 animate-pulse'
            }`}
          >
            {turn === 'player' ? '🟢 Tu turno' : '🤖 Turno de Jev'}
          </span>
        </div>
        <div className="text-[11px] text-amber-400/80 font-mono">
          Ronda {state.round} de 3
        </div>
      </div>
    </div>
  );
}
