'use client';

import React, { useState } from 'react';
import { sounds } from '../lib/sound/audio.ts';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
  targetScore: 15 | 30;
  onChangeTargetScore: (target: 15 | 30) => void;
  soundEnabled: boolean;
  onToggleSound: (enabled: boolean) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
  targetScore,
  onChangeTargetScore,
  soundEnabled,
  onToggleSound,
}: SettingsModalProps) {
  const [inputKey, setInputKey] = useState(apiKey || '');
  const [prevApiKey, setPrevApiKey] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (apiKey !== prevApiKey) {
    setPrevApiKey(apiKey);
    setInputKey(apiKey || '');
  }

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveApiKey(inputKey.trim());
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleClearKey = () => {
    setInputKey('');
    onSaveApiKey('');
  };

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
          {/* Section 1: Server-side OpenCode Zen / Jev Config */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-mono text-cyan-300 uppercase font-bold text-[11px] flex items-center gap-1.5">
                <span>🛡️</span>
                <span>Configuración de Servidor Jev</span>
              </label>
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                ✓ Protegida en Servidor
              </span>
            </div>

            <p className="text-[11px] text-stone-400">
              La API Key y la conexión con OpenCode Zen se gestionan de forma segura en el backend mediante <code className="text-amber-300 font-mono bg-stone-900 px-1 py-0.5 rounded">.env.local</code> sin exponer credenciales en el navegador.
            </p>

            {/* Endpoint & Model Info */}
            <div className="rounded-xl bg-stone-900/90 border border-stone-800 p-2.5 space-y-1.5 font-mono text-[11px]">
              <div className="flex items-center justify-between text-stone-400">
                <span>Endpoint Servidor:</span>
                <span className="text-cyan-300 font-semibold truncate max-w-[220px]">
                  https://opencode.ai/zen/v1/systemone
                </span>
              </div>
              <div className="flex items-center justify-between text-stone-400">
                <span>Modelo:</span>
                <span className="text-amber-300 font-semibold">jev-1.13-free</span>
              </div>
              <div className="flex items-center justify-between text-stone-400">
                <span>API Key:</span>
                <span className="text-emerald-400 font-semibold">Cargada en backend (.env.local)</span>
              </div>
            </div>

            {/* Optional client-side override */}
            <div className="pt-1">
              <details className="text-[11px] text-stone-400">
                <summary className="cursor-pointer hover:text-stone-300 font-mono text-[10px] text-stone-500">
                  Sobrescribir clave temporalmente (opcional)
                </summary>
                <form onSubmit={handleSave} className="space-y-2 mt-2">
                  <div className="relative">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={inputKey}
                      onChange={(e) => setInputKey(e.target.value)}
                      placeholder="Dejar vacío para usar clave del servidor"
                      className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 font-mono text-xs focus:outline-hidden focus:border-cyan-500 pr-16"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((v) => !v)}
                      className="absolute right-2 top-2 text-[10px] text-stone-400 hover:text-stone-200 px-1.5 py-0.5 rounded cursor-pointer"
                    >
                      {showKey ? 'Ocultar' : 'Ver'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="px-3 py-1 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white font-mono font-bold text-xs transition-colors cursor-pointer"
                      >
                        Aplicar
                      </button>
                      {inputKey && (
                        <button
                          type="button"
                          onClick={handleClearKey}
                          className="px-2 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-400 font-mono text-xs transition-colors cursor-pointer"
                        >
                          Restablecer a servidor
                        </button>
                      )}
                    </div>
                    {savedSuccess && (
                      <span className="text-emerald-400 font-mono text-[10px] animate-in fade-in">
                        ✓ Guardado
                      </span>
                    )}
                  </div>
                </form>
              </details>
            </div>
          </div>

          <hr className="border-stone-800" />

          {/* Section 2: Match Target Score (15 vs 30 points) */}
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

          {/* Section 3: Sound Effects Toggle */}
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
