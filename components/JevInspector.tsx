'use client';

import React, { useState, useMemo } from 'react';
import type { JevDecisionResponse } from '../lib/jev/types.ts';
import type { MatchState } from '../lib/truco/types.ts';

export interface JevInspectorProps {
  decision: JevDecisionResponse | null;
  state: MatchState;
  isOpen: boolean;
  onToggle: () => void;
  onOpenSettings: () => void;
  history?: JevDecisionResponse[];
  className?: string;
}

interface HistoricalDecision {
  id: string;
  timestamp: string;
  round: number;
  summary: string;
  latencyMs: number;
  mode: string;
  actionChoice?: string;
  confidence?: number;
  bluffProb?: number;
  handStrength?: number;
}

export function JevInspector({
  decision,
  state,
  isOpen,
  onToggle,
  onOpenSettings,
  history = [],
  className = '',
}: JevInspectorProps) {
  const [activeTab, setActiveTab] = useState<'decision' | 'schema' | 'state' | 'history'>('decision');
  const [copied, setCopied] = useState(false);

  // Derive historical entries cleanly from props
  const historicalEntries = useMemo<HistoricalDecision[]>(() => {
    const list = history.length > 0 ? history : decision ? [decision] : [];
    return list.map((item, index) => {
      const action =
        item.choices?.card?.choice ||
        item.choices?.action?.choice ||
        item.choices?.call?.choice ||
        item.choices?.envido_response?.choice ||
        item.choices?.truco_response?.choice;

      const confidence =
        item.choices?.card?.confidence ||
        item.choices?.action?.confidence ||
        item.choices?.call?.confidence;

      const bluffProb =
        item.nouls?.bluff_call?.probability ?? item.nouls?.should_bluff?.probability;

      const handStrength = item.scores?.hand_strength?.score;

      return {
        id: `hist-${index}-${item.latencyMs}`,
        timestamp: `#${index + 1}`,
        round: state.round,
        summary: item.decisionSummary || 'Decisión ejecutada',
        latencyMs: item.latencyMs,
        mode: item.mode,
        actionChoice: action,
        confidence,
        bluffProb,
        handStrength,
      };
    });
  }, [history, decision, state.round]);

  const copyStateJson = () => {
    const cleanState = {
      round: state.round,
      mano: state.mano,
      turn: state.turn,
      scores: state.scores,
      trucoState: state.trucoState,
      envidoState: state.envidoState,
      table: state.table,
      jevHandRemaining: state.jevHand.length,
      playedJevCards: state.playedJevCards.map((c) => c.id),
      playedPlayerCards: state.playedPlayerCards.map((c) => c.id),
    };
    navigator.clipboard.writeText(JSON.stringify(cleanState, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Floating Toggle Button (Always visible on bottom-right or side) */}
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-4 z-40 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-900 to-slate-900 hover:from-cyan-800 hover:to-slate-800 text-cyan-200 border border-cyan-500/50 shadow-xl shadow-cyan-950/60 backdrop-blur-md flex items-center gap-2 text-xs font-mono font-bold transition-all cursor-pointer active:scale-95"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500" />
        </span>
        <span>Jev Inspector</span>
        {decision && (
          <span className="bg-cyan-950 px-1.5 py-0.5 rounded text-[10px] text-cyan-400 border border-cyan-800">
            {decision.latencyMs}ms
          </span>
        )}
      </button>

      {/* Drawer Overlay Backdrop */}
      {isOpen && (
        <div
          onClick={onToggle}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Drawer Panel */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-lg bg-stone-950 border-l border-cyan-900/60 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } ${className}`}
      >
        {/* Panel Header */}
        <div className="p-4 border-b border-cyan-900/50 bg-gradient-to-r from-stone-950 via-cyan-950/40 to-stone-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔬</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-black text-sm text-cyan-200 uppercase tracking-wider">
                  Jev Inspector
                </h3>
                <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-700/60 px-1.5 py-0.2 rounded font-mono">
                  TypeSafe AI
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                Inferencia System One en milisegundos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSettings}
              className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-700 text-xs transition-colors cursor-pointer"
              title="Configurar API Key de TypeSafe AI"
            >
              ⚙️
            </button>
            <button
              onClick={onToggle}
              className="p-1.5 rounded-lg bg-stone-900 hover:bg-rose-950/60 text-stone-400 hover:text-rose-300 border border-stone-800 text-xs transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Status Badges Bar */}
        <div className="px-4 py-2.5 bg-stone-900/60 border-b border-stone-800/80 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          {/* Mode Badge */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-stone-400">Modo:</span>
            {decision?.mode === 'live_api' ? (
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60 text-[10px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live API (TypeSafe)
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700/60 text-[10px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Simulador Local Jev
              </span>
            )}
          </div>

          {/* Latency Badge */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-stone-400">Latencia:</span>
            <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/60 text-[10px] font-bold font-mono">
              ⚡ {decision?.latencyMs ?? 0} ms
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-stone-800 bg-stone-900/40 text-xs font-mono">
          <button
            onClick={() => setActiveTab('decision')}
            className={`flex-1 py-2.5 text-center border-b-2 font-bold transition-colors cursor-pointer ${
              activeTab === 'decision'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Decisión
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`flex-1 py-2.5 text-center border-b-2 font-bold transition-colors cursor-pointer ${
              activeTab === 'schema'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Preguntas
          </button>
          <button
            onClick={() => setActiveTab('state')}
            className={`flex-1 py-2.5 text-center border-b-2 font-bold transition-colors cursor-pointer ${
              activeTab === 'state'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Estado JSON
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2.5 text-center border-b-2 font-bold transition-colors cursor-pointer ${
              activeTab === 'history'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Historial ({historicalEntries.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-sans">
          {/* TAB 1: DECISION */}
          {activeTab === 'decision' && (
            <div className="space-y-4">
              {decision ? (
                <>
                  {/* Summary Card */}
                  <div className="rounded-xl bg-stone-900 border border-cyan-800/40 p-3 shadow-md">
                    <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block mb-1">
                      Resumen de Decisión
                    </span>
                    <p className="text-sm font-serif font-bold text-stone-100">
                      &quot;{decision.decisionSummary}&quot;
                    </p>
                  </div>

                  {/* Choice Confidence Meters */}
                  {decision.choices && Object.keys(decision.choices).length > 0 && (
                    <div className="rounded-xl bg-stone-900 border border-stone-800 p-3 space-y-3">
                      <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider block">
                        Choice (Selección Discreta)
                      </span>
                      {Object.entries(decision.choices).map(([key, val]) => {
                        const pct = Math.round(val.confidence * 100);
                        return (
                          <div key={key} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-mono text-stone-300">
                                {key}:{' '}
                                <strong className="text-amber-300 font-serif">
                                  {val.choice}
                                </strong>
                              </span>
                              <span className="font-mono text-stone-400 font-bold">
                                {pct}% confianza
                              </span>
                            </div>
                            <div className="w-full bg-stone-950 rounded-full h-2 overflow-hidden border border-stone-800">
                              <div
                                className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Noul Bluffing Gauge */}
                  {decision.nouls && Object.keys(decision.nouls).length > 0 && (
                    <div className="rounded-xl bg-stone-900 border border-stone-800 p-3 space-y-3">
                      <span className="text-[10px] font-mono text-rose-400 uppercase tracking-wider block">
                        Noul (Probabilidad Calibrada de Farol)
                      </span>
                      {Object.entries(decision.nouls).map(([key, val]) => {
                        const pct = Math.round(val.probability * 100);
                        return (
                          <div key={key} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-mono text-stone-300">
                                {key}
                              </span>
                              <span
                                className={`font-mono font-bold ${
                                  pct > 50 ? 'text-rose-400' : 'text-emerald-400'
                                }`}
                              >
                                {pct}% probabilidad
                              </span>
                            </div>
                            <div className="w-full bg-stone-950 rounded-full h-2 overflow-hidden border border-stone-800">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  pct > 50
                                    ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                                    : 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Score Hand Strength Meter */}
                  {decision.scores && Object.keys(decision.scores).length > 0 && (
                    <div className="rounded-xl bg-stone-900 border border-stone-800 p-3 space-y-3">
                      <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider block">
                        Score (Fuerza de Mano Percibida)
                      </span>
                      {Object.entries(decision.scores).map(([key, val]) => {
                        const scoreVal = val.score;
                        const pct = Math.min(100, Math.round(scoreVal * 10));
                        return (
                          <div key={key} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-mono text-stone-300">
                                {key}
                              </span>
                              <span className="font-mono font-bold text-blue-300">
                                {scoreVal.toFixed(1)} / 10.0
                              </span>
                            </div>
                            <div className="w-full bg-stone-950 rounded-full h-2 overflow-hidden border border-stone-800">
                              <div
                                className="bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-stone-500 font-mono">
                  <span>Esperando la primera decisión de Jev...</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SCHEMA (QUESTIONS) */}
          {activeTab === 'schema' && (
            <div className="space-y-3">
              <p className="text-stone-400 text-xs">
                Preguntas formuladas a TypeSafe AI Jev con esquemas estructurados:
              </p>

              {decision?.questions ? (
                <div className="space-y-3">
                  {/* Choices Schema */}
                  {decision.questions.choices &&
                    Object.entries(decision.questions.choices).map(([key, q]) => (
                      <div
                        key={key}
                        className="rounded-xl bg-stone-900 border border-stone-800 p-3 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-amber-400 uppercase font-bold">
                            ChoiceQuestion: {key}
                          </span>
                        </div>
                        <p className="text-xs text-stone-200">{q.instructions}</p>
                        {q.criteria && (
                          <div className="mt-2 pl-2 border-l border-stone-700 space-y-1">
                            <span className="text-[9px] uppercase font-mono text-stone-500 block">
                              Opciones / Criterios:
                            </span>
                            {Object.entries(q.criteria).map(([opt, desc]) => (
                              <div
                                key={opt}
                                className="text-[11px] font-mono text-stone-300 flex justify-between gap-2"
                              >
                                <span className="text-amber-300 font-bold">{opt}</span>
                                <span className="text-stone-400 truncate">{desc || '—'}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                  {/* Nouls Schema */}
                  {decision.questions.nouls &&
                    Object.entries(decision.questions.nouls).map(([key, q]) => (
                      <div
                        key={key}
                        className="rounded-xl bg-stone-900 border border-stone-800 p-3 space-y-1"
                      >
                        <span className="text-[10px] font-mono text-rose-400 uppercase font-bold">
                          NoulQuestion: {key}
                        </span>
                        <p className="text-xs text-stone-200">{q.instructions}</p>
                      </div>
                    ))}

                  {/* Scores Schema */}
                  {decision.questions.scores &&
                    Object.entries(decision.questions.scores).map(([key, q]) => (
                      <div
                        key={key}
                        className="rounded-xl bg-stone-900 border border-stone-800 p-3 space-y-1"
                      >
                        <span className="text-[10px] font-mono text-blue-400 uppercase font-bold">
                          ScoreQuestion: {key}
                        </span>
                        <p className="text-xs text-stone-200">{q.instructions}</p>
                        {q.scale && (
                          <span className="text-[10px] font-mono text-stone-400 block">
                            Escala: {q.scale.min} a {q.scale.max}
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-stone-500 font-mono">
                  No hay esquema disponible aún.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: STATE JSON */}
          {activeTab === 'state' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-stone-400 uppercase">
                  Match State Formateado
                </span>
                <button
                  onClick={copyStateJson}
                  className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-cyan-300 font-mono text-[10px] transition-colors cursor-pointer"
                >
                  {copied ? '✓ Copiado' : '📋 Copiar JSON'}
                </button>
              </div>
              <pre className="p-3 rounded-xl bg-black border border-stone-800 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-[480px]">
                {JSON.stringify(
                  {
                    round: state.round,
                    mano: state.mano,
                    turn: state.turn,
                    scores: state.scores,
                    trucoState: state.trucoState,
                    envidoState: state.envidoState,
                    table: state.table,
                    jevHandRemaining: state.jevHand.length,
                    playedJevCards: state.playedJevCards.map((c) => c.name),
                    playedPlayerCards: state.playedPlayerCards.map((c) => c.name),
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          )}

          {/* TAB 4: HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-2">
              <span className="text-[10px] font-mono text-stone-400 uppercase block mb-1">
                Registro de Inferencia ({historicalEntries.length} llamadas)
              </span>

              {historicalEntries.length > 0 ? (
                <div className="space-y-2">
                  {historicalEntries.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono text-stone-400">
                        <span>{item.timestamp} • Ronda {item.round}</span>
                        <span className="text-cyan-300 font-bold">{item.latencyMs}ms</span>
                      </div>
                      <p className="text-stone-200 font-medium">{item.summary}</p>
                      <div className="flex flex-wrap gap-2 text-[10px] font-mono pt-1 text-stone-400">
                        {item.actionChoice && (
                          <span className="bg-stone-950 px-1.5 py-0.5 rounded text-amber-300 border border-stone-800">
                            Acción: {item.actionChoice}
                          </span>
                        )}
                        {item.confidence !== undefined && (
                          <span className="bg-stone-950 px-1.5 py-0.5 rounded text-emerald-300 border border-stone-800">
                            Conf: {Math.round(item.confidence * 100)}%
                          </span>
                        )}
                        {item.bluffProb !== undefined && (
                          <span className="bg-stone-950 px-1.5 py-0.5 rounded text-rose-300 border border-stone-800">
                            Farol: {Math.round(item.bluffProb * 100)}%
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-stone-500 font-mono">
                  Aún no hay historial de decisiones en esta partida.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Panel Footer */}
        <div className="p-3 border-t border-stone-800 bg-stone-950 flex items-center justify-between text-[11px] text-stone-400">
          <span>TypeSafe AI Jev v1.0</span>
          <button
            onClick={onOpenSettings}
            className="text-cyan-400 hover:text-cyan-300 font-mono underline cursor-pointer"
          >
            Configurar API Key
          </button>
        </div>
      </div>
    </>
  );
}
