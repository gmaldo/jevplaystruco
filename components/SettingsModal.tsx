'use client';

import React from 'react';
import { sounds } from '../lib/sound/audio.ts';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey?: string;
  onSaveApiKey?: (key: string) => void;
  targetScore: 15 | 30;
  onChangeTargetScore: (target: 15 | 30) => void;
  soundEnabled: boolean;
  onToggleSound: (enabled: boolean) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  targetScore,
  onChangeTargetScore,
  soundEnabled,
  onToggleSound,
}: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-stone-950 border border-stone-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-stone-800 bg-stone-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚙️</span>
            <h3 className="font-serif font-black text-sm sm:text-base text-amber-200 uppercase tracking-wider">
              Ajustes de la Partida
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 text-sm transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 text-xs text-stone-300">
          {/* Límite de Puntos del Partido (15 vs 30 points) */}
          <div className="space-y-2">
            <label className="font-mono text-amber-300 uppercase font-bold text-[11px] flex items-center gap-1.5">
              <span>🎯</span>
              <span>Límite de Puntos del Partido</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onChangeTargetScore(30)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  targetScore === 30
                    ? 'bg-amber-950/40 border-amber-500 text-amber-200'
                    : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-700'
                }`}
              >
                <div className="font-serif font-bold text-sm">A 30 Puntos</div>
                <div className="text-[10px] text-stone-400 mt-0.5">
                  Partida completa (15 Malas + 15 Buenas)
                </div>
              </button>

              <button
                type="button"
                onClick={() => onChangeTargetScore(15)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  targetScore === 15
                    ? 'bg-amber-950/40 border-amber-500 text-amber-200'
                    : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-700'
                }`}
              >
                <div className="font-serif font-bold text-sm">A 15 Puntos</div>
                <div className="text-[10px] text-stone-400 mt-0.5">
                  Partida corta (solo Malas)
                </div>
              </button>
            </div>
          </div>

          <hr className="border-stone-800" />

          {/* Sound Effects Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="font-mono text-stone-200 font-bold text-xs flex items-center gap-1.5">
                <span>🔊</span>
                <span>Efectos de Sonido</span>
              </label>
              <p className="text-[10px] text-stone-400">
                Sonidos de cartas, cantos y victorias generados proceduralmente (Web Audio API).
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const nextState = !soundEnabled;
                sounds.enabled = nextState;
                onToggleSound(nextState);
                if (nextState) sounds.playCanto();
              }}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                soundEnabled ? 'bg-emerald-600' : 'bg-stone-800'
              }`}
            >
              <span
                className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                  soundEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-800 bg-stone-900/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-serif font-bold text-xs transition-colors cursor-pointer"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
