'use client';

import React from 'react';

export interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RulesModal({ isOpen, onClose }: RulesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl max-h-[85vh] rounded-2xl bg-stone-950 border border-stone-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-stone-800 bg-stone-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📜</span>
            <h3 className="font-serif font-black text-base text-amber-200 uppercase tracking-wider">
              Reglamento del Truco Argentino
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 text-sm transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs text-stone-300">
          {/* 1. Jerarquía de Cartas */}
          <div className="space-y-2">
            <h4 className="font-serif font-bold text-sm text-amber-300 flex items-center gap-1.5">
              <span>⚔️</span>
              <span>Jerarquía de Cartas (De Mayor a Menor)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
              <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 space-y-1">
                <span className="text-amber-400 font-bold block uppercase text-[10px]">
                  Cartas Bravas (Mayores)
                </span>
                <p>1. <strong>1 de Espada</strong> (El Macho / Ancho de espada)</p>
                <p>2. <strong>1 de Basto</strong> (La Hembra / Ancho de basto)</p>
                <p>3. <strong>7 de Espada</strong> (Siete bravo)</p>
                <p>4. <strong>7 de Oro</strong> (Siete bravo)</p>
              </div>

              <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 space-y-1">
                <span className="text-stone-400 font-bold block uppercase text-[10px]">
                  Cartas Medianas y Falsas
                </span>
                <p>5. Todos los <strong>3</strong></p>
                <p>6. Todos los <strong>2</strong></p>
                <p>7. <strong>1 de Oro</strong> y <strong>1 de Copa</strong> (1 falsos)</p>
                <p>8. Todos los <strong>12</strong> (Reyes)</p>
                <p>9. Todos los <strong>11</strong> (Caballos)</p>
                <p>10. Todos los <strong>10</strong> (Sotas)</p>
                <p>11. <strong>7 de Copa</strong> y <strong>7 de Basto</strong> (7 falsos)</p>
                <p>12. Todos los <strong>6</strong></p>
                <p>13. Todos los <strong>5</strong></p>
                <p>14. Todos los <strong>4</strong> (Menor carta)</p>
              </div>
            </div>
          </div>

          <hr className="border-stone-800" />

          {/* 2. El Envido */}
          <div className="space-y-2">
            <h4 className="font-serif font-bold text-sm text-blue-300 flex items-center gap-1.5">
              <span>🌾</span>
              <span>Cálculo y Puntuación del Envido</span>
            </h4>
            <p className="leading-relaxed">
              El Envido se canta únicamente durante la primera ronda antes de jugar la segunda carta.
              &quot;El envido va primero&quot;: si te cantan Truco en primera ronda, puedes responder cantando Envido antes de definir el Truco.
            </p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>
                <strong>Dos cartas del mismo palo:</strong> suman sus valores nominales más <strong>20</strong> puntos.
              </li>
              <li>
                <strong>Figuras (10, 11 y 12):</strong> valen <strong>0</strong> puntos para el Envido (ej. 7 y 12 de Oro suman 27).
              </li>
              <li>
                <strong>Tres cartas del mismo palo:</strong> se toman las dos más altas. Máximo posible: <strong>33</strong> (7 y 6).
              </li>
              <li>
                <strong>Tres palos distintos:</strong> cuenta la carta individual más alta (ej. 7, 5, 2 sin repetir palo = 7 puntos).
              </li>
              <li>
                <strong>Empate de puntos:</strong> gana quien sea la <strong>Mano</strong>.
              </li>
            </ul>

            <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-[11px] font-mono grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <span className="text-stone-400 block">Envido</span>
                <span className="text-emerald-400 font-bold">2 pts (1 si rechaza)</span>
              </div>
              <div>
                <span className="text-stone-400 block">Real Envido</span>
                <span className="text-emerald-400 font-bold">3 pts (1 si rechaza)</span>
              </div>
              <div>
                <span className="text-stone-400 block">Envido + Real</span>
                <span className="text-emerald-400 font-bold">5 pts (2 si rechaza)</span>
              </div>
              <div>
                <span className="text-stone-400 block">Falta Envido</span>
                <span className="text-emerald-400 font-bold">Puntos restantes para ganar</span>
              </div>
            </div>
          </div>

          <hr className="border-stone-800" />

          {/* 3. El Truco */}
          <div className="space-y-2">
            <h4 className="font-serif font-bold text-sm text-amber-400 flex items-center gap-1.5">
              <span>🏆</span>
              <span>Disputa del Truco y Manos</span>
            </h4>
            <p className="leading-relaxed">
              Cada jugador recibe 3 cartas y se juegan hasta 3 rondas (manos). Quien gane 2 rondas gana la mano.
            </p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>
                <strong>Parda en primera mano:</strong> define el ganador de la segunda mano. Si la segunda también emparda, define la tercera. Si las 3 empardan, gana quien sea Mano.
              </li>
              <li>
                <strong>Parda en segunda mano:</strong> gana quien ganó la primera mano.
              </li>
              <li>
                <strong>Puntos de Truco:</strong> Sin cantar = 1 pt. <strong>Truco</strong> = 2 pts. <strong>Retruco</strong> = 3 pts. <strong>Vale Cuatro</strong> = 4 pts.
              </li>
              <li>
                Si un jugador no acepta (No Quiero), el contrincante gana los puntos de la apuesta anterior de inmediato.
              </li>
            </ul>
          </div>

          <hr className="border-stone-800" />

          {/* 4. IA Jev (TypeSafe AI) */}
          <div className="space-y-2">
            <h4 className="font-serif font-bold text-sm text-cyan-300 flex items-center gap-1.5">
              <span>🤖</span>
              <span>¿Cómo funciona el rival Jev (TypeSafe AI)?</span>
            </h4>
            <p className="leading-relaxed">
              A diferencia de los modelos LLM de chat convencionales que devuelven texto libre y tardan varios segundos,
              <strong> Jev (System One)</strong> utiliza inferencia estructurada de alta velocidad (en milisegundos) con calibración probabilística:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px] pt-1">
              <div className="p-2 rounded-lg bg-stone-900 border border-stone-800">
                <span className="text-amber-300 font-bold block mb-0.5">Choice</span>
                <span>Selección discreta de la mejor carta o respuesta táctica.</span>
              </div>
              <div className="p-2 rounded-lg bg-stone-900 border border-stone-800">
                <span className="text-rose-300 font-bold block mb-0.5">Noul</span>
                <span>Evaluación de probabilidad de farol o canto agresivo.</span>
              </div>
              <div className="p-2 rounded-lg bg-stone-900 border border-stone-800">
                <span className="text-blue-300 font-bold block mb-0.5">Score</span>
                <span>Calibración de la fuerza percibida de la mano en juego.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-800 bg-stone-900/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-serif font-bold text-xs transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
