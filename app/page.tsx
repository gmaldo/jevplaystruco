'use client';

import React, { useState, useSyncExternalStore } from 'react';
import { useTrucoGame } from '../lib/truco/useTrucoGame.ts';
import { GameTable } from '../components/GameTable.tsx';
import { ScoreBoard } from '../components/ScoreBoard.tsx';
import { JevInspector } from '../components/JevInspector.tsx';
import { SettingsModal } from '../components/SettingsModal.tsx';
import { RulesModal } from '../components/RulesModal.tsx';
import { sounds } from '../lib/sound/audio.ts';

const emptySubscribe = () => () => {};

function useIsMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export default function Home() {
  const isMounted = useIsMounted();
  const [targetScore, setTargetScore] = useState<15 | 30>(30);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const {
    state,
    playCard,
    callEnvido,
    respondEnvido,
    callTruco,
    respondTruco,
    fold,
    startNewHand,
    restartMatch,
    setApiKey,
    apiKey,
    difficulty,
    setDifficulty,
    decisionHistory,
    availableEnvidoBids,
    availableTrucoBid,
    canPlay,
    canEnvido,
    canTruco,
  } = useTrucoGame(targetScore);

  const handleTargetChange = (newTarget: 15 | 30) => {
    setTargetScore(newTarget);
    restartMatch(newTarget);
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col selection:bg-amber-500 selection:text-stone-950">
        <header className="sticky top-0 z-30 w-full border-b border-stone-800/80 bg-stone-950/90 backdrop-blur-md px-4 py-2.5 sm:px-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-700 via-amber-500 to-amber-300 shadow-md shadow-amber-950/50">
                <span className="text-lg">🧉</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-serif font-black text-base sm:text-lg tracking-wider text-amber-200 uppercase">
                    JevTruco
                  </h1>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                    IA Rival
                  </span>
                </div>
                <p className="text-[10px] text-stone-400">
                  Truco Argentino • Inferencia System One
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col items-center justify-center min-h-[500px]">
          <div className="flex flex-col items-center gap-3 p-8 rounded-2xl bg-stone-900/40 border border-stone-800/60 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl animate-pulse">
              🃏
            </div>
            <div className="font-serif font-bold text-base text-amber-200">
              Mezclando baraja y repartiendo...
            </div>
            <div className="text-xs font-mono text-stone-400">
              Conectando con motor de inferencia Jev
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col selection:bg-amber-500 selection:text-stone-950">
      {/* ------------------------------------------------------------- */}
      {/* TOP NAVIGATION BAR */}
      {/* ------------------------------------------------------------- */}
      <header className="sticky top-0 z-30 w-full border-b border-stone-800/80 bg-stone-950/90 backdrop-blur-md px-3 py-2 sm:px-6 sm:py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-1.5 sm:gap-2">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-amber-700 via-amber-500 to-amber-300 shadow-md shadow-amber-950/50">
              <span className="text-base sm:text-lg">🧉</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="font-serif font-black text-sm sm:text-lg tracking-wider text-amber-200 uppercase">
                  JevTruco
                </h1>
                <span className="text-[9px] sm:text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-700/60 px-1.5 py-0.2 rounded-full hidden xs:inline-block">
                  System One
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-stone-400 font-sans hidden md:block">
                Truco Argentino contra el modelo de inferencia rápida Jev
              </p>
            </div>
          </div>

          {/* Quick Score Capsule with scroll-to-tanteador anchor */}
          <a
            href="#tanteador"
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 sm:px-3 sm:py-1 rounded-full bg-stone-900/90 hover:bg-stone-800 border border-stone-800 text-xs font-mono transition-colors cursor-pointer"
            title="Ver tanteador completo con fósforos"
          >
            <span className="text-emerald-400 font-bold">
              Tú: {state.scores.player}
            </span>
            <span className="text-stone-500">•</span>
            <span className="text-cyan-400 font-bold">
              Jev: {state.scores.jev}
            </span>
            <span className="text-[10px] text-stone-500 hidden sm:inline">
              ({state.scores.target} pts)
            </span>
          </a>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Rules Button */}
            <button
              onClick={() => setIsRulesOpen(true)}
              className="px-2 py-1.5 sm:px-3 sm:py-1.5 min-h-[36px] sm:min-h-[40px] touch-manipulation rounded-xl bg-stone-900 hover:bg-stone-800 active:bg-stone-700 text-stone-300 hover:text-white border border-stone-800 text-xs font-serif font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Reglas del Truco Argentino"
            >
              <span>📜</span>
              <span className="hidden sm:inline">Reglas</span>
            </button>

            {/* Settings Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-2 py-1.5 sm:px-3 sm:py-1.5 min-h-[36px] sm:min-h-[40px] touch-manipulation rounded-xl bg-stone-900 hover:bg-stone-800 active:bg-stone-700 text-stone-300 hover:text-white border border-stone-800 text-xs font-serif font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Ajustes de la partida"
            >
              <span>⚙️</span>
              <span className="hidden sm:inline">Ajustes</span>
            </button>

            {/* Inspector Toggle Button */}
            <button
              onClick={() => setIsInspectorOpen((v) => !v)}
              className="px-2 py-1.5 sm:px-3 sm:py-1.5 min-h-[36px] sm:min-h-[40px] touch-manipulation rounded-xl bg-gradient-to-r from-cyan-950 to-slate-900 hover:from-cyan-900 hover:to-slate-800 active:from-cyan-900 active:to-slate-900 text-cyan-200 border border-cyan-600/40 text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Abrir panel inspector de decisiones de Jev"
            >
              <span>🔬</span>
              <span className="hidden md:inline">Inspector</span>
              {state.lastJevDecision && (
                <span className="bg-cyan-900/60 px-1 py-0.2 rounded text-[9px] text-cyan-300 border border-cyan-700/50">
                  {state.lastJevDecision.latencyMs}ms
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* MAIN LAYOUT */}
      {/* ------------------------------------------------------------- */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2 sm:p-5 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        {/* Center / Right Column: The Felt Table & Player Hand (FIRST ON MOBILE via order-1, 8 cols on desktop via lg:order-2) */}
        <section className="w-full lg:col-span-8 order-1 lg:order-2 flex flex-col items-center">
          <GameTable
            state={state}
            onPlayCard={playCard}
            onCallEnvido={callEnvido}
            onRespondEnvido={respondEnvido}
            onCallTruco={callTruco}
            onRespondTruco={respondTruco}
            onFold={fold}
            onStartNewHand={startNewHand}
            onRestartMatch={restartMatch}
            availableEnvidoBids={availableEnvidoBids}
            availableTrucoBid={availableTrucoBid}
            canPlay={canPlay}
            canEnvido={canEnvido}
            canTruco={canTruco}
          />
        </section>

        {/* Sidebar / ScoreBoard & Match Info (BELOW TABLE ON MOBILE via order-2, 4 cols on desktop via lg:order-1) */}
        <aside className="w-full lg:col-span-4 order-2 lg:order-1 flex flex-col gap-4">
          <ScoreBoard state={state} />

          {/* Quick Match Actions & Log card */}
          <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4 space-y-3 backdrop-blur-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-stone-400 font-bold">
                Mano en Curso
              </span>
              <span className="text-[11px] font-mono text-amber-400/90">
                Puntos: {state.trucoState.pointsAtStake} pt(s)
              </span>
            </div>

            {/* Recent Match Log entries */}
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 text-xs">
              {[...state.log]
                .reverse()
                .slice(0, 5)
                .map((entry) => (
                  <div
                    key={entry.id}
                    className={`p-2 rounded-lg text-[11px] font-mono ${
                      entry.type === 'canto'
                        ? 'bg-amber-950/40 text-amber-200 border border-amber-900/40'
                        : entry.type === 'win'
                        ? 'bg-emerald-950/40 text-emerald-200 border border-emerald-900/40'
                        : 'bg-stone-950/60 text-stone-300 border border-stone-800/60'
                    }`}
                  >
                    <span>{entry.text}</span>
                  </div>
                ))}
            </div>

            <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-xs">
              <button
                onClick={() => {
                  sounds.playDeal();
                  restartMatch(targetScore);
                }}
                className="text-stone-400 hover:text-amber-300 font-mono text-[11px] transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>🔄</span>
                <span>Reiniciar Partido</span>
              </button>

              <button
                onClick={() => setIsRulesOpen(true)}
                className="text-stone-400 hover:text-cyan-300 font-mono text-[11px] transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>❓</span>
                <span>Ayuda</span>
              </button>
            </div>
          </div>
        </aside>
      </main>

      {/* ------------------------------------------------------------- */}
      {/* JEV INSPECTOR DRAWER (TASK 6) */}
      {/* ------------------------------------------------------------- */}
      <JevInspector
        decision={state.lastJevDecision}
        history={decisionHistory}
        state={state}
        isOpen={isInspectorOpen}
        onToggle={() => setIsInspectorOpen((v) => !v)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* ------------------------------------------------------------- */}
      {/* SETTINGS MODAL */}
      {/* ------------------------------------------------------------- */}
      <SettingsModal
        key={`${apiKey}-${isSettingsOpen}`}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={apiKey}
        onSaveApiKey={setApiKey}
        targetScore={targetScore}
        onChangeTargetScore={handleTargetChange}
        soundEnabled={soundEnabled}
        onToggleSound={setSoundEnabled}
        difficulty={difficulty}
        onChangeDifficulty={setDifficulty}
      />

      {/* ------------------------------------------------------------- */}
      {/* RULES MODAL */}
      {/* ------------------------------------------------------------- */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
    </div>
  );
}
