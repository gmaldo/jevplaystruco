'use client';

import React from 'react';
import type { Card, Suit, Value } from '../lib/truco/types.ts';

export interface CardViewProps {
  card?: Card;
  faceDown?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  isHighlighted?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// -------------------------------------------------------------
// Suit SVG Icons & Illustrations
// -------------------------------------------------------------

export function EspadaIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Blade */}
      <path
        d="M20 2 L22.5 12 L21.5 28 L18.5 28 L17.5 12 Z"
        fill="url(#espadaBlade)"
        stroke="#1e3a8a"
        strokeWidth="0.8"
      />
      {/* Fuller/Central ridge */}
      <line x1="20" y1="4" x2="20" y2="27" stroke="#93c5fd" strokeWidth="0.8" strokeLinecap="round" />
      {/* Crossguard */}
      <path
        d="M11 28 C15 28.5 17 27.5 20 28.5 C23 27.5 25 28.5 29 28 C28.5 30 26 30 20 29.5 C14 30 11.5 30 11 28 Z"
        fill="#f59e0b"
        stroke="#78350f"
        strokeWidth="0.8"
      />
      {/* Grip */}
      <rect x="18.5" y="29.5" width="3" height="6.5" rx="0.5" fill="#78350f" stroke="#451a03" strokeWidth="0.5" />
      {/* Pommel */}
      <circle cx="20" cy="37.5" r="2" fill="#fbbf24" stroke="#78350f" strokeWidth="0.8" />
      <defs>
        <linearGradient id="espadaBlade" x1="17" y1="2" x2="23" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#e2e8f0" />
          <stop offset="0.5" stopColor="#94a3b8" />
          <stop offset="1" stopColor="#64748b" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function BastoIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Wooden Knotted Club */}
      <path
        d="M17 37 C16 35 17 30 17.5 25 C16 23 15.5 19 16 14 C15.5 11 16.5 6 19 3 C22.5 3 24 7 24 12 C24.5 17 23.5 22 23 26 C23.5 31 23.5 35 22.5 37 Z"
        fill="url(#bastoWood)"
        stroke="#3f2e18"
        strokeWidth="1"
      />
      {/* Knots on wood */}
      <circle cx="18" cy="18" r="1.5" fill="#3f2e18" opacity="0.6" />
      <circle cx="21.5" cy="28" r="1.3" fill="#3f2e18" opacity="0.6" />
      <circle cx="19.5" cy="9" r="1.8" fill="#3f2e18" opacity="0.7" />
      {/* Fresh Green Sprout 1 */}
      <path
        d="M24 11 C26.5 10 28 8 28.5 5 C26 5.5 24.5 7.5 24 10 Z"
        fill="#16a34a"
        stroke="#14532d"
        strokeWidth="0.6"
      />
      {/* Fresh Green Sprout 2 */}
      <path
        d="M16 21 C13.5 21 12 19 11.5 16.5 C14 17 15.5 19 16 20 Z"
        fill="#22c55e"
        stroke="#14532d"
        strokeWidth="0.6"
      />
      <defs>
        <linearGradient id="bastoWood" x1="16" y1="3" x2="24" y2="37" gradientUnits="userSpaceOnUse">
          <stop stopColor="#854d0e" />
          <stop offset="0.5" stopColor="#713f12" />
          <stop offset="1" stopColor="#451a03" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function OroIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Outer Coin Rim */}
      <circle cx="20" cy="20" r="16.5" fill="url(#oroGrad)" stroke="#b45309" strokeWidth="1.2" />
      {/* Inner Beaded Ring */}
      <circle cx="20" cy="20" r="13.5" stroke="#fef08a" strokeWidth="0.8" strokeDasharray="1.5 1.5" />
      {/* Sun / Heraldic Motif */}
      <circle cx="20" cy="20" r="6" fill="#f59e0b" stroke="#92400e" strokeWidth="0.8" />
      {/* Radial Sun Rays */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <line
          key={angle}
          x1={20 + 7 * Math.cos((angle * Math.PI) / 180)}
          y1={20 + 7 * Math.sin((angle * Math.PI) / 180)}
          x2={20 + 11 * Math.cos((angle * Math.PI) / 180)}
          y2={20 + 11 * Math.sin((angle * Math.PI) / 180)}
          stroke="#92400e"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      ))}
      <defs>
        <radialGradient id="oroGrad" cx="30%" cy="30%" r="70%">
          <stop stopColor="#fef08a" />
          <stop offset="0.4" stopColor="#fbbf24" />
          <stop offset="0.9" stopColor="#d97706" />
          <stop offset="1" stopColor="#92400e" />
        </radialGradient>
      </defs>
    </svg>
  );
}

export function CopaIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Cup Bowl */}
      <path
        d="M12 7 C12 18 16 23 20 23 C24 23 28 18 28 7 Z"
        fill="url(#copaWine)"
        stroke="#991b1b"
        strokeWidth="1"
      />
      {/* Gold Rim */}
      <ellipse cx="20" cy="7" rx="8" ry="2.5" fill="#fcd34d" stroke="#b45309" strokeWidth="0.8" />
      {/* Wine surface inside */}
      <ellipse cx="20" cy="7.8" rx="6.5" ry="1.8" fill="#7f1d1d" />
      {/* Stem */}
      <path d="M19 23 L18.5 30 L21.5 30 L21 23 Z" fill="#d97706" stroke="#92400e" strokeWidth="0.8" />
      {/* Stem Knop */}
      <circle cx="20" cy="26" r="2.2" fill="#fbbf24" stroke="#92400e" strokeWidth="0.6" />
      {/* Base */}
      <path
        d="M13 34 C15 32 17 31 20 31 C23 31 25 32 27 34 C26.5 35 24 35.5 20 35.5 C16 35.5 13.5 35 13 34 Z"
        fill="#f59e0b"
        stroke="#92400e"
        strokeWidth="0.8"
      />
      <defs>
        <linearGradient id="copaWine" x1="12" y1="7" x2="28" y2="23" gradientUnits="userSpaceOnUse">
          <stop stopColor="#dc2626" />
          <stop offset="0.5" stopColor="#b91c1c" />
          <stop offset="1" stopColor="#7f1d1d" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function SuitIcon({ suit, className }: { suit: Suit; className?: string }) {
  switch (suit) {
    case 'espada':
      return <EspadaIcon className={className} />;
    case 'basto':
      return <BastoIcon className={className} />;
    case 'oro':
      return <OroIcon className={className} />;
    case 'copa':
      return <CopaIcon className={className} />;
  }
}

// -------------------------------------------------------------
// Card Center Layouts for Values 1 to 12
// -------------------------------------------------------------

function getSuitColor(suit: Suit): string {
  switch (suit) {
    case 'espada':
      return 'text-sky-800';
    case 'basto':
      return 'text-emerald-800';
    case 'oro':
      return 'text-amber-700';
    case 'copa':
      return 'text-rose-800';
  }
}

function getFigureTitle(value: Value): string | null {
  if (value === 10) return 'SOTA';
  if (value === 11) return 'CABALLO';
  if (value === 12) return 'REY';
  return null;
}

function CardCenter({ card, size }: { card: Card; size: 'sm' | 'md' | 'lg' }) {
  const iconSize = size === 'sm' ? 'w-5 h-5' : size === 'md' ? 'w-7 h-7' : 'w-9 h-9';
  const heroSize = size === 'sm' ? 'w-10 h-10' : size === 'md' ? 'w-14 h-14' : 'w-20 h-20';

  // Highlight special cards
  const isAnchoEspada = card.value === 1 && card.suit === 'espada';
  const isAnchoBasto = card.value === 1 && card.suit === 'basto';
  const isSieteEspada = card.value === 7 && card.suit === 'espada';
  const isSieteOro = card.value === 7 && card.suit === 'oro';

  // Figures (10, 11, 12)
  if (card.value >= 10) {
    const title = getFigureTitle(card.value);
    return (
      <div className="flex flex-col items-center justify-center p-1 text-center select-none">
        <div className="relative flex items-center justify-center rounded-full bg-amber-50 border border-amber-200 shadow-inner p-2 my-0.5">
          <SuitIcon suit={card.suit} className={heroSize} />
          {card.value === 12 && (
            <span className="absolute -top-2 text-xs sm:text-sm drop-shadow">👑</span>
          )}
          {card.value === 11 && (
            <span className="absolute -top-2 text-xs sm:text-sm drop-shadow">🏇</span>
          )}
          {card.value === 10 && (
            <span className="absolute -top-2 text-xs sm:text-sm drop-shadow">🛡️</span>
          )}
        </div>
        <span
          className={`font-serif font-black tracking-widest uppercase opacity-85 ${
            size === 'sm' ? 'text-[8px]' : size === 'md' ? 'text-[10px]' : 'text-xs'
          } ${getSuitColor(card.suit)}`}
        >
          {title}
        </span>
      </div>
    );
  }

  // Aces (1)
  if (card.value === 1) {
    return (
      <div className="flex flex-col items-center justify-center relative select-none">
        <div
          className={`flex items-center justify-center rounded-2xl transition-transform ${
            isAnchoEspada || isAnchoBasto
              ? 'p-2 bg-gradient-to-b from-amber-100/60 to-transparent'
              : 'p-1'
          }`}
        >
          <SuitIcon suit={card.suit} className={heroSize} />
        </div>
        {(isAnchoEspada || isAnchoBasto) && size !== 'sm' && (
          <span className="text-[9px] font-serif font-bold text-amber-800 tracking-wider bg-amber-200/60 px-1.5 py-0.5 rounded-full mt-1 border border-amber-300">
            {isAnchoEspada ? 'Espadilla' : 'Basto Bravo'}
          </span>
        )}
      </div>
    );
  }

  // 2s and 3s
  if (card.value === 2) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 select-none">
        <SuitIcon suit={card.suit} className={iconSize} />
        <SuitIcon suit={card.suit} className={`${iconSize} rotate-180`} />
      </div>
    );
  }

  if (card.value === 3) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 select-none">
        <SuitIcon suit={card.suit} className={iconSize} />
        <SuitIcon suit={card.suit} className={iconSize} />
        <SuitIcon suit={card.suit} className={`${iconSize} rotate-180`} />
      </div>
    );
  }

  // 4s and 5s
  if (card.value === 4) {
    return (
      <div className="grid grid-cols-2 gap-x-2 gap-y-2 place-items-center select-none">
        <SuitIcon suit={card.suit} className={iconSize} />
        <SuitIcon suit={card.suit} className={iconSize} />
        <SuitIcon suit={card.suit} className={`${iconSize} rotate-180`} />
        <SuitIcon suit={card.suit} className={`${iconSize} rotate-180`} />
      </div>
    );
  }

  if (card.value === 5) {
    return (
      <div className="relative w-full flex items-center justify-center select-none">
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 place-items-center">
          <SuitIcon suit={card.suit} className={iconSize} />
          <SuitIcon suit={card.suit} className={iconSize} />
          <SuitIcon suit={card.suit} className={`${iconSize} rotate-180`} />
          <SuitIcon suit={card.suit} className={`${iconSize} rotate-180`} />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <SuitIcon suit={card.suit} className={iconSize} />
        </div>
      </div>
    );
  }

  // 6s and 7s
  if (card.value === 6) {
    return (
      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 place-items-center select-none">
        <SuitIcon suit={card.suit} className={iconSize} />
        <SuitIcon suit={card.suit} className={iconSize} />
        <SuitIcon suit={card.suit} className={iconSize} />
        <SuitIcon suit={card.suit} className={`${iconSize} rotate-180`} />
        <SuitIcon suit={card.suit} className={`${iconSize} rotate-180`} />
        <SuitIcon suit={card.suit} className={`${iconSize} rotate-180`} />
      </div>
    );
  }

  if (card.value === 7) {
    return (
      <div className="relative flex flex-col items-center justify-center select-none">
        <div className="grid grid-cols-2 gap-x-2.5 gap-y-1 place-items-center">
          <SuitIcon suit={card.suit} className={iconSize} />
          <SuitIcon suit={card.suit} className={iconSize} />
          <SuitIcon suit={card.suit} className={iconSize} />
          <SuitIcon suit={card.suit} className={`${iconSize} rotate-180`} />
          <SuitIcon suit={card.suit} className={`${iconSize} rotate-180`} />
          <SuitIcon suit={card.suit} className={`${iconSize} rotate-180`} />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <SuitIcon
            suit={card.suit}
            className={`${iconSize} ${
              isSieteEspada || isSieteOro
                ? 'scale-125 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                : ''
            }`}
          />
        </div>
        {(isSieteEspada || isSieteOro) && size !== 'sm' && (
          <span className="absolute -bottom-2 text-[8px] font-serif font-bold text-amber-800 bg-amber-200/80 px-1 rounded-full border border-amber-400">
            Siete Bravo
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center">
      <SuitIcon suit={card.suit} className={heroSize} />
    </div>
  );
}

// -------------------------------------------------------------
// Card Back Design (Authentic Spanish Deck Lattice Pattern)
// -------------------------------------------------------------

function CardBackPattern() {
  return (
    <div className="w-full h-full relative rounded-lg overflow-hidden bg-gradient-to-br from-[#800d1c] via-[#5c0915] to-[#3a060e] flex items-center justify-center p-1.5 shadow-inner">
      {/* Outer Golden Inset Frame */}
      <div className="w-full h-full rounded border-2 border-amber-300/80 relative flex items-center justify-center overflow-hidden">
        {/* Diamond Lattice Pattern SVG */}
        <svg className="w-full h-full opacity-60" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="cardLattice" width="16" height="16" patternUnits="userSpaceOnUse">
              <path
                d="M8 0 L16 8 L8 16 L0 8 Z"
                fill="none"
                stroke="#fcd34d"
                strokeWidth="0.8"
              />
              <circle cx="8" cy="8" r="1.5" fill="#fcd34d" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#cardLattice)" />
        </svg>

        {/* Center Rosette Badge */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-amber-300 bg-gradient-to-tr from-amber-700 via-amber-500 to-amber-300 shadow-md flex items-center justify-center">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-amber-900 bg-red-950 flex items-center justify-center">
              <span className="text-[10px] sm:text-xs text-amber-200 font-serif font-black">
                JT
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Main CardView Component
// -------------------------------------------------------------

export function CardView({
  card,
  faceDown = false,
  onClick,
  disabled = false,
  isHighlighted = false,
  size = 'md',
  className = '',
}: CardViewProps) {
  // Sizing definitions
  const sizeClasses = {
    sm: 'w-14 h-20 sm:w-16 sm:h-24 text-xs',
    md: 'w-20 h-32 sm:w-24 sm:h-36 text-sm',
    lg: 'w-28 h-42 sm:w-32 sm:h-48 text-base',
  }[size];

  // If face down or no card provided, render card back
  if (faceDown || !card) {
    return (
      <div
        className={`relative select-none transition-all duration-200 rounded-xl p-[2px] bg-amber-200/40 shadow-md ${sizeClasses} ${
          onClick && !disabled ? 'cursor-pointer hover:-translate-y-1 hover:shadow-xl' : ''
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}
        onClick={!disabled ? onClick : undefined}
      >
        <CardBackPattern />
      </div>
    );
  }

  const suitColor = getSuitColor(card.suit);

  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className={`group relative select-none rounded-xl transition-all duration-200 ${sizeClasses} ${
        onClick && !disabled
          ? 'cursor-pointer hover:-translate-y-2 hover:shadow-2xl active:translate-y-0 active:scale-95'
          : ''
      } ${
        isHighlighted
          ? 'ring-4 ring-amber-400 -translate-y-2 shadow-xl shadow-amber-500/40'
          : 'shadow-md hover:shadow-lg'
      } ${
        disabled ? 'opacity-60 cursor-not-allowed hover:translate-y-0' : ''
      } ${className}`}
    >
      {/* Authentic parchment background & subtle border */}
      <div className="w-full h-full rounded-xl bg-gradient-to-b from-[#fdfbf7] via-[#faf6ed] to-[#f3ecdd] border border-[#d6c7b2] flex flex-col justify-between p-1.5 sm:p-2 overflow-hidden shadow-inner">
        {/* Subtle inner card border line */}
        <div className="absolute inset-1 rounded-lg border border-[#e2d5c2] pointer-events-none" />

        {/* Top-Left Index */}
        <div className="flex flex-col items-center w-5 self-start z-10">
          <span className={`font-serif font-black leading-none ${suitColor}`}>
            {card.value}
          </span>
          <SuitIcon suit={card.suit} className="w-3 h-3 sm:w-3.5 sm:h-3.5 mt-0.5" />
        </div>

        {/* Center Artwork */}
        <div className="flex-1 flex items-center justify-center my-auto z-10">
          <CardCenter card={card} size={size} />
        </div>

        {/* Bottom-Right Index (Upside-down) */}
        <div className="flex flex-col items-center w-5 self-end rotate-180 z-10">
          <span className={`font-serif font-black leading-none ${suitColor}`}>
            {card.value}
          </span>
          <SuitIcon suit={card.suit} className="w-3 h-3 sm:w-3.5 sm:h-3.5 mt-0.5" />
        </div>
      </div>
    </div>
  );
}
