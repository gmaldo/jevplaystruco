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

interface HistoricalChoice {
  key: string;
  label: string;
  choice: string;
  formattedChoice: string;
  confidence: number;
}

interface HistoricalDecision {
  id: string;
  timestamp: string;
  round: number;
  headline: string;
  whyExplanation: string;
  summary: string;
  explanation: string;
  latencyMs: number;
  mode: string;
  choices: HistoricalChoice[];
  confidence?: number;
  bluffProb?: number;
  handStrength?: number;
}

function formatDecisionNarrative(params: {
  summary?: string;
  choices: HistoricalChoice[];
  bluffProb?: number;
  handStrength?: number;
  latencyMs: number;
  mode: string;
  round: number;
  context?: string;
}): { headline: string; why: string } {
  const { summary = '', choices, bluffProb, handStrength, latencyMs, mode, round, context } = params;

  const cardChoice = choices.find((c) => c.key === 'card' || c.key === 'play_card');
  const actionChoice = choices.find(
    (c) => c.key === 'action' || c.key === 'envido_response' || c.key === 'truco_response'
  );
  const callChoice = choices.find(
    (c) => c.key === 'call' || c.key === 'call_truco' || c.key === 'opening_call'
  );

  const strengthPart = typeof handStrength === 'number' ? Math.round(handStrength) : 50;
  const bluffPart = typeof bluffProb === 'number' ? Math.round(bluffProb * 100) : 5;

  // 1. Escenario: JUGADA DE CARTA ("se jugó el 4 con confidencia")
  if (cardChoice && (context === 'play_card' || !actionChoice)) {
    const confPct = Math.round(cardChoice.confidence * 100);
    const cardName = cardChoice.formattedChoice;
    const callPrefix = callChoice && callChoice.choice !== 'none' ? `[Canto: ${callChoice.formattedChoice}] ` : '';
    const headline = `🃏 ${callPrefix}Se jugó el ${cardName} con ${confPct}% de confianza`;

    let why = '';
    if (summary && !summary.startsWith('Decisión Jev') && !summary.includes('live en') && summary !== 'Decisión ejecutada') {
      why = `${summary} (Fuerza de mano estimada: ${strengthPart}/100, farol: ${bluffPart}%).`;
    } else if (strengthPart >= 75) {
      why = `Jev jugó el ${cardName} para ganar y asegurar la baza con carta alta, respaldado por una fuerza de mano de ${strengthPart}/100.`;
    } else if (strengthPart <= 40) {
      why = `Jev jugó el ${cardName} como descarte o tanteo con su naipe más bajo, protegiendo bazas futuras con fuerza de mano en ${strengthPart}/100.`;
    } else {
      why = `Jev administró el ${cardName} para disputar la ronda ${round} buscando controlar el desenlace de la mano (${strengthPart}/100 de fuerza).`;
    }

    return { headline, why };
  }

  // 2. Escenario: ENVIDO ("se cantó envido y el porqué")
  const isEnvido =
    context === 'respond_envido' ||
    actionChoice?.choice === 'envido' ||
    actionChoice?.choice === 'real_envido' ||
    actionChoice?.choice === 'falta_envido' ||
    actionChoice?.choice === 'envido_envido' ||
    (summary.toLowerCase().includes('envido') && !!actionChoice);

  if (isEnvido && actionChoice) {
    const act = actionChoice.choice;
    const confPct = Math.round(actionChoice.confidence * 100);

    let headline = '';
    let why = '';

    if (act === 'no_quiero') {
      headline = `🌾 Se rechazó el Envido • Respuesta de Jev: ¡NO QUIERO! ❌ (${confPct}% confianza)`;
      why = `Jev rechazó el Envido porque evaluó que sus tantos no alcanzaban para superar al rival y prefirió no conceder puntos mayores (fuerza de tantos: ${strengthPart}/100, farol: ${bluffPart}%).`;
    } else if (act === 'quiero') {
      headline = `🌾 Se aceptó el Envido • Respuesta de Jev: ¡QUIERO! ✅ (${confPct}% confianza)`;
      why = `Jev aceptó el Envido porque calculó una combinación de tantos alta y competitiva con amplias chances de triunfo (fuerza de tantos: ${strengthPart}/100).`;
    } else if (act === 'real_envido' || act === 'falta_envido') {
      const callName = act === 'real_envido' ? '¡REAL ENVIDO! 🌾' : '¡FALTA ENVIDO! 💥';
      headline = `🌾 Se redobló el Envido • Respuesta de Jev: ${callName} (${confPct}% confianza)`;
      why = `Jev redobló la apuesta porque poseía naipes excelentes del mismo palo (fuerza: ${strengthPart}/100) para definir puntos decisivos en el Envido.`;
    } else {
      headline = `🌾 Se cantó ${actionChoice.formattedChoice} (${confPct}% confianza)`;
      why = `Jev tomó la iniciativa de cantar Envido en ronda 1 al ligar naipes favorables en su mano (fuerza: ${strengthPart}/100).`;
    }

    if (summary && !summary.startsWith('Decisión Jev') && !summary.includes('live en') && summary !== 'Decisión ejecutada') {
      why = `${summary} • ${why}`;
    }

    return { headline, why };
  }

  // 3. Escenario: TRUCO ("se rechazó el truco y la respuesta de jev")
  const isTruco =
    context === 'respond_truco' ||
    actionChoice?.choice === 'truco' ||
    actionChoice?.choice === 'retruco' ||
    actionChoice?.choice === 'vale_cuatro' ||
    summary.toLowerCase().includes('truco');

  if (isTruco && actionChoice) {
    const act = actionChoice.choice;
    const confPct = Math.round(actionChoice.confidence * 100);

    let headline = '';
    let why = '';

    if (act === 'no_quiero') {
      headline = `⚡ Se rechazó el Truco • Respuesta de Jev: ¡NO QUIERO! ❌ (${confPct}% confianza)`;
      why = `Jev se fue al mazo y rechazó el Truco porque las cartas que le quedaban eran de jerarquía débil (fuerza de mano: ${strengthPart}/100) y el riesgo de perder más puntos era inaceptable.`;
    } else if (act === 'quiero') {
      headline = `⚡ Se aceptó el Truco • Respuesta de Jev: ¡QUIERO! ✅ (${confPct}% confianza)`;
      why = `Jev aceptó el Truco porque disponía de cartas de jerarquía media/alta suficientes para disputar o rematar las bazas restantes (fuerza de mano: ${strengthPart}/100).`;
    } else if (act === 'retruco' || act === 'vale_cuatro') {
      const callName = act === 'retruco' ? '¡QUIERO RETRUCO! 🔥' : '¡VALE CUATRO! ⚡';
      if (
        context === 'initiate_call' ||
        summary.toLowerCase().includes('inicia') ||
        summary.toLowerCase().includes('canta') ||
        summary.toLowerCase().includes('iniciativa')
      ) {
        headline = `⚡ Se cantó ${callName} por iniciativa de Jev (${confPct}% confianza)`;
        why = `Jev redobló la apuesta a ${act} respaldado por cartas mayores o bravas (fuerza de mano: ${strengthPart}/100) para definir y presionar en la mano.`;
      } else {
        headline = `⚡ Se redobló el Truco • Respuesta de Jev: ${callName} (${confPct}% confianza)`;
        why = `Jev redobló la apuesta a ${act} respaldado por cartas mayores o bravas (fuerza de mano: ${strengthPart}/100) con el objetivo de maximizar puntos en la mano.`;
      }
    } else if (act === 'truco') {
      headline = `⚡ Se cantó Truco por iniciativa de Jev (${confPct}% confianza)`;
      why = `Jev cantó Truco al evaluar que sus naipes le otorgan ventaja estratégica en las bazas de la mano (fuerza: ${strengthPart}/100).`;
    } else {
      headline = `⚡ Se decidió ${actionChoice.formattedChoice}`;
      why = `Jev evaluó la apuesta de Truco con fuerza de mano en ${strengthPart}/100 y ${bluffPart}% de probabilidad de farol.`;
    }

    if (summary && !summary.startsWith('Decisión Jev') && !summary.includes('live en') && summary !== 'Decisión ejecutada') {
      why = `${summary} • ${why}`;
    }

    return { headline, why };
  }

  // Fallback
  const primary = choices[0];
  const confPct = primary ? Math.round(primary.confidence * 100) : 100;
  const headline = primary
    ? `Respuesta de Jev: ${primary.label} - ${primary.formattedChoice} (${confPct}% confianza)`
    : summary || 'Decisión ejecutada';
  const why = `Evaluación táctica en ronda ${round} con fuerza de mano en ${strengthPart}/100 (${mode === 'live_api' ? `Live API ${latencyMs}ms` : `Simulador ${latencyMs}ms`}).`;

  return { headline, why };
}

function generateDecisionExplanation(params: {
  summary?: string;
  choices: HistoricalChoice[];
  bluffProb?: number;
  handStrength?: number;
  latencyMs: number;
  mode: string;
  round: number;
}): string {
  const { summary, choices, bluffProb, handStrength, latencyMs, mode, round } = params;

  const cardChoice = choices.find((c) => c.key === 'card' || c.key === 'play_card');
  const actionChoice = choices.find(
    (c) => c.key === 'action' || c.key === 'envido_response' || c.key === 'truco_response'
  );
  const callChoice = choices.find(
    (c) => c.key === 'call' || c.key === 'call_truco' || c.key === 'opening_call'
  );

  const parts: string[] = [];

  // 1. Acciones / Naipes jugados
  if (cardChoice) {
    const conf = Math.round(cardChoice.confidence * 100);
    const callText =
      callChoice && callChoice.choice !== 'none'
        ? ` tras cantar ${callChoice.formattedChoice}`
        : '';
    parts.push(
      `Jev jugó ${cardChoice.formattedChoice}${callText} con ${conf}% de certeza en la ronda ${round}.`
    );
  } else if (actionChoice) {
    const conf = Math.round(actionChoice.confidence * 100);
    parts.push(`Jev respondió ${actionChoice.formattedChoice} (${conf}% de certeza).`);
  } else if (callChoice && callChoice.choice !== 'none') {
    parts.push(`Jev inició el canto con ${callChoice.formattedChoice}.`);
  } else if (choices.length > 0) {
    parts.push(
      `Jev ejecutó ${choices[0].formattedChoice} (${Math.round(choices[0].confidence * 100)}% certeza).`
    );
  }

  // 2. Justificación por jerarquía y fuerza de mano
  if (typeof handStrength === 'number') {
    if (handStrength >= 75) {
      parts.push(
        `Fuerza de mano alta (${Math.round(handStrength)}/100): cuenta con jerarquía de naipes suficiente para buscar ganar la baza.`
      );
    } else if (handStrength >= 45) {
      parts.push(
        `Fuerza de mano moderada (${Math.round(handStrength)}/100): administra sus cartas para el desenlace de la mano.`
      );
    } else {
      parts.push(
        `Fuerza de mano modesta (${Math.round(handStrength)}/100): prioriza descarte o tanteo con cartas bajas.`
      );
    }
  }

  // 3. Análisis de farol táctico
  if (typeof bluffProb === 'number') {
    if (bluffProb >= 0.5) {
      parts.push(
        `🎭 Farol táctico (${Math.round(bluffProb * 100)}%): jugada psicológica agresiva buscando la retirada del rival.`
      );
    } else if (bluffProb >= 0.2) {
      parts.push(`Factor de farol moderado (${Math.round(bluffProb * 100)}%).`);
    } else {
      parts.push(
        `Jugada sincera y fundamentada con apenas ${Math.round(bluffProb * 100)}% de probabilidad de engaño.`
      );
    }
  }

  // 4. Si el sumario contiene heurísticas específicas del simulador que aportan detalle, conservarlas
  if (
    summary &&
    !summary.startsWith('Decisión Jev') &&
    !summary.includes('live en') &&
    summary !== 'Decisión ejecutada'
  ) {
    if (!parts.some((p) => p.includes(summary))) {
      parts.unshift(summary);
    }
  }

  // 5. Explicación de la inferencia (latencia y conexión)
  const engineNote =
    mode === 'live_api'
      ? `Inferencia en vivo procesada en ${latencyMs}ms por el modelo Jev (System One).`
      : `Decisión simulada localmente en ${latencyMs}ms.`;
  parts.push(engineNote);

  return parts.join(' ');
}

function formatChoiceName(choiceKey: string, choiceVal: string): { label: string; text: string } {
  if (choiceKey === 'card' || choiceKey === 'play_card') {
    const match = choiceVal.match(/(?:card[-_])?(\d+)[-_](\w+)/);
    if (match) {
      const [, val, suit] = match;
      if (val === '1' && suit === 'espada') {
        return { label: 'Carta Jugada', text: 'Ancho de espada ⚔️' };
      }
      if (val === '1' && suit === 'basto') {
        return { label: 'Carta Jugada', text: 'Ancho de basto 🌿' };
      }
      const suitEmoji =
        suit === 'espada' ? '⚔️' : suit === 'basto' ? '🌿' : suit === 'oro' ? '🪙' : '🍷';
      return { label: 'Carta Jugada', text: `${val} de ${suit} ${suitEmoji}` };
    }
    return { label: 'Carta Jugada', text: choiceVal };
  }

  if (choiceKey === 'call' || choiceKey === 'call_truco' || choiceKey === 'opening_call') {
    if (choiceVal === 'truco') return { label: 'Canto', text: '¡TRUCO! 📢' };
    if (choiceVal === 'retruco') return { label: 'Canto', text: '¡QUIERO RETRUCO! 🔥' };
    if (choiceVal === 'vale_cuatro') return { label: 'Canto', text: '¡VALE CUATRO! ⚡' };
    if (choiceVal === 'envido') return { label: 'Canto', text: '¡ENVIDO! 🌾' };
    if (choiceVal === 'real_envido') return { label: 'Canto', text: '¡REAL ENVIDO! 🌾' };
    if (choiceVal === 'falta_envido') return { label: 'Canto', text: '¡FALTA ENVIDO! 💥' };
    if (choiceVal === 'none') return { label: 'Canto', text: 'Sin canto' };
    return { label: 'Canto', text: choiceVal };
  }

  if (choiceKey === 'action' || choiceKey === 'envido_response' || choiceKey === 'truco_response') {
    if (choiceVal === 'quiero') return { label: 'Respuesta', text: '¡QUIERO! ✅' };
    if (choiceVal === 'no_quiero') return { label: 'Respuesta', text: '¡NO QUIERO! ❌' };
    if (choiceVal === 'envido') return { label: 'Canto', text: '¡ENVIDO! 🌾' };
    if (choiceVal === 'real_envido') return { label: 'Respuesta', text: '¡REAL ENVIDO! 🌾' };
    if (choiceVal === 'falta_envido') return { label: 'Respuesta', text: '¡FALTA ENVIDO! 💥' };
    if (choiceVal === 'envido_envido') return { label: 'Respuesta', text: '¡ENVIDO ENVIDO! 🌾' };
    if (choiceVal === 'truco') return { label: 'Canto', text: '¡TRUCO! 📢' };
    if (choiceVal === 'retruco') return { label: 'Canto', text: '¡QUIERO RETRUCO! 🔥' };
    if (choiceVal === 'vale_cuatro') return { label: 'Canto', text: '¡VALE CUATRO! ⚡' };
    if (choiceVal === 'none') return { label: 'Acción', text: 'Pasar sin cantar ⏩' };
    return { label: 'Respuesta', text: choiceVal };
  }

  return { label: choiceKey, text: choiceVal };
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
      const rawChoices = item.choices || {};
      const chosenEntries: { key: string; val: { choice: string; confidence: number } }[] = [];

      // Check card
      if (rawChoices.card) {
        chosenEntries.push({ key: 'card', val: rawChoices.card });
      } else if (rawChoices.play_card) {
        chosenEntries.push({ key: 'card', val: rawChoices.play_card });
      }

      // Check action (respond envido, respond truco, or initiate call)
      if (rawChoices.action) {
        chosenEntries.push({ key: 'action', val: rawChoices.action });
      } else if (rawChoices.envido_response) {
        chosenEntries.push({ key: 'action', val: rawChoices.envido_response });
      } else if (rawChoices.truco_response) {
        chosenEntries.push({ key: 'action', val: rawChoices.truco_response });
      }

      // Check call (if call was truco/retruco etc., or if it's not none)
      const callVal = rawChoices.opening_call || rawChoices.call || rawChoices.call_truco;
      if (callVal && callVal.choice !== 'none' && !chosenEntries.some((e) => e.val.choice === callVal.choice)) {
        chosenEntries.push({ key: 'call', val: callVal });
      }

      // If still empty, fall back to whatever is in rawChoices (unique by choice value)
      if (chosenEntries.length === 0) {
        const seenChoices = new Set<string>();
        for (const [key, val] of Object.entries(rawChoices)) {
          if (!seenChoices.has(val.choice)) {
            seenChoices.add(val.choice);
            chosenEntries.push({ key, val });
          }
        }
      }

      const choices: HistoricalChoice[] = chosenEntries.map(({ key, val }) => {
        const formatted = formatChoiceName(key, val.choice);
        return {
          key,
          label: formatted.label,
          choice: val.choice,
          formattedChoice: formatted.text,
          confidence: val.confidence,
        };
      });

      const confidence =
        choices[0]?.confidence ??
        item.choices?.card?.confidence ??
        item.choices?.action?.confidence ??
        item.choices?.call?.confidence;

      const bluffProb =
        item.nouls?.bluffing_probability?.probability ??
        item.nouls?.bluff_call?.probability ??
        item.nouls?.should_bluff?.probability;

      const handStrength =
        item.scores?.hand_confidence?.score ??
        item.scores?.hand_strength?.score;

      const explanation = generateDecisionExplanation({
        summary: item.decisionSummary,
        choices,
        bluffProb,
        handStrength,
        latencyMs: item.latencyMs,
        mode: item.mode,
        round: state.round,
      });

      let summary = item.decisionSummary || 'Decisión ejecutada';
      if ((!item.decisionSummary || item.decisionSummary.startsWith('Decisión Jev')) && choices.length > 0) {
        const primary = choices[0];
        summary = `Jev ejecuta ${primary.label}: ${primary.formattedChoice} (${Math.round((primary.confidence || 1) * 100)}% certeza) • ${item.mode === 'live_api' ? 'Live API' : 'Simulador'}`;
      }

      const narrative = formatDecisionNarrative({
        summary: item.decisionSummary,
        choices,
        bluffProb,
        handStrength,
        latencyMs: item.latencyMs,
        mode: item.mode,
        round: state.round,
        context: item.context,
      });

      return {
        id: `hist-${index}-${item.latencyMs}`,
        timestamp: `#${index + 1}`,
        round: state.round,
        headline: narrative.headline,
        whyExplanation: narrative.why,
        summary,
        explanation,
        latencyMs: item.latencyMs,
        mode: item.mode,
        choices,
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
                  Jev AI ({decision?.model || 'jev-1.13-free'})
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
              title="Ajustes de la partida"
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
                Live API ({decision?.model || 'jev-1.13-free'})
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700/60 text-[10px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Simulador Local Jev
              </span>
            )}
          </div>

          {/* Model & Latency Badges */}
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 text-[10px] font-mono">
              {decision?.model || 'jev-1.13-free'}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-stone-400">Latencia:</span>
              <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/60 text-[10px] font-bold font-mono">
                ⚡ {decision?.latencyMs ?? 0} ms
              </span>
            </div>
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
                  <div className="rounded-xl bg-stone-900 border border-cyan-800/40 p-3.5 shadow-md space-y-2.5">
                    <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block">
                      Última Jugada de Jev
                    </span>
                    {historicalEntries[0] ? (
                      <>
                        <p className="text-sm font-serif font-bold text-amber-200 leading-snug">
                          {historicalEntries[0].headline}
                        </p>
                        <div className="p-2.5 rounded-lg bg-stone-950/80 border border-amber-900/30 text-xs text-stone-300 leading-relaxed font-sans space-y-1">
                          <span className="text-amber-300 font-semibold text-[11px] flex items-center gap-1.5">
                            <span>🔎</span> ¿Por qué?:
                          </span>
                          <p className="text-stone-300 leading-relaxed">
                            {historicalEntries[0].whyExplanation}
                          </p>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm font-serif font-bold text-stone-100">
                        &quot;{decision.decisionSummary}&quot;
                      </p>
                    )}
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
                Preguntas formuladas a Jev con esquemas estructurados:
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
                <div className="space-y-3">
                  {historicalEntries.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-stone-900/90 border border-stone-800 space-y-2 text-xs shadow-inner"
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono text-stone-400 pb-1 border-b border-stone-800/60">
                        <div className="flex items-center gap-1.5">
                          <span className="text-stone-300 font-semibold">{item.timestamp}</span>
                          <span>•</span>
                          <span className="text-amber-400/90">Ronda {item.round}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-cyan-300 font-bold">{item.latencyMs}ms</span>
                          <span className="text-stone-600">•</span>
                          <span className="text-stone-400 text-[9px] uppercase">
                            {item.mode === 'live_api' ? 'Live' : 'Simulador'}
                          </span>
                        </div>
                      </div>

                      {/* Titular directo: "Se jugó el 4 de copa con 90% de confianza", "Se rechazó el Truco", etc. */}
                      <div className="text-sm font-bold text-amber-200 leading-snug">
                        {item.headline}
                      </div>

                      {/* Cuadro destacado: El Porqué */}
                      <div className="p-2.5 rounded-lg bg-stone-950/90 border border-amber-900/40 space-y-1">
                        <span className="text-[11px] font-semibold text-amber-300 flex items-center gap-1.5">
                          <span>🔎</span> ¿Por qué?:
                        </span>
                        <p className="text-stone-300 text-xs leading-relaxed font-sans">
                          {item.whyExplanation}
                        </p>
                      </div>

                      {/* Detalle técnico de la inferencia */}
                      {item.explanation && (
                        <div className="p-2 rounded-lg bg-stone-950/40 border border-stone-800/80 text-[11px] text-stone-400 space-y-0.5 font-sans">
                          <span className="text-stone-300 font-semibold text-[10px] block">
                            💡 Detalle de inferencia:
                          </span>
                          <p className="leading-relaxed">
                            {item.explanation}
                          </p>
                        </div>
                      )}

                      {/* Respuestas de la jugada y probabilidades */}
                      {item.choices.length > 0 && (
                        <div className="space-y-1.5 pt-0.5">
                          {item.choices.map((c) => {
                            const pct = typeof c.confidence === 'number' ? Math.round(c.confidence * 100) : 100;
                            return (
                              <div
                                key={c.key}
                                className="p-2 rounded-lg bg-stone-950/90 border border-stone-800/80 space-y-1"
                              >
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-[10px] font-mono text-stone-400 uppercase shrink-0">
                                      {c.label}:
                                    </span>
                                    <span className="font-semibold text-amber-300 truncate">
                                      {c.formattedChoice}
                                    </span>
                                  </div>
                                  <span className="text-[11px] font-mono font-bold text-emerald-400 shrink-0 ml-2">
                                    {pct}% prob.
                                  </span>
                                </div>
                                <div className="w-full bg-stone-900 h-1.5 rounded-full overflow-hidden border border-stone-800/50">
                                  <div
                                    className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 h-full rounded-full transition-all duration-300"
                                    style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Métricas adicionales: Farol y Fuerza de mano */}
                      {(item.bluffProb !== undefined || item.handStrength !== undefined) && (
                        <div className="flex flex-wrap gap-2 text-[10px] font-mono pt-1">
                          {item.bluffProb !== undefined && (
                            <span className="bg-rose-950/30 text-rose-300 border border-rose-900/40 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <span>🎭 Farol:</span>
                              <span className="font-bold">{Math.round(item.bluffProb * 100)}%</span>
                            </span>
                          )}
                          {item.handStrength !== undefined && (
                            <span className="bg-cyan-950/30 text-cyan-300 border border-cyan-900/40 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <span>💪 Fuerza:</span>
                              <span className="font-bold">{Math.round(item.handStrength)}/100</span>
                            </span>
                          )}
                        </div>
                      )}
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
          <span>Jev AI • Modelo {decision?.model || 'jev-1.13-free'} (System One)</span>
          <button
            onClick={onOpenSettings}
            className="text-cyan-400 hover:text-cyan-300 font-mono underline cursor-pointer"
          >
            Ajustes
          </button>
        </div>
      </div>
    </>
  );
}
