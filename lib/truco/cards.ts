import type { Card, Suit, Value, EnvidoResult } from './types.ts';

export const SUITS: Suit[] = ['espada', 'basto', 'oro', 'copa'];

export const VALUES: Value[] = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

/**
 * Hierarchy ranks for Argentine Truco (1 to 14):
 * 14 = 1 de espada (Ancho de espada)
 * 13 = 1 de basto (Ancho de basto)
 * 12 = 7 de espada (Siete bravo / de espada)
 * 11 = 7 de oro (Siete bravo / de oro)
 * 10 = Todos los 3s
 *  9 = Todos los 2s
 *  8 = 1 falso (oro / copa)
 *  7 = Todos los 12s (Reyes)
 *  6 = Todos los 11s (Caballos)
 *  5 = Todos los 10s (Sotas)
 *  4 = 7s falsos (copa / basto)
 *  3 = Todos los 6s
 *  2 = Todos los 5s
 *  1 = Todos los 4s
 */
export function getCardRank(value: Value, suit: Suit): number {
  if (value === 1) {
    if (suit === 'espada') return 14;
    if (suit === 'basto') return 13;
    return 8; // 1 de oro, 1 de copa (1 falso)
  }

  if (value === 7) {
    if (suit === 'espada') return 12;
    if (suit === 'oro') return 11;
    return 4; // 7 de basto, 7 de copa (7 falso)
  }

  if (value === 3) return 10;
  if (value === 2) return 9;
  if (value === 12) return 7;
  if (value === 11) return 6;
  if (value === 10) return 5;
  if (value === 6) return 3;
  if (value === 5) return 2;
  if (value === 4) return 1;

  throw new Error(`Invalid card value: ${value}`);
}

/**
 * In Truco, cards 10, 11, 12 have an envido value of 0.
 * Cards 1 to 7 have envido value equal to their nominal face value.
 */
export function getEnvidoValue(value: Value): number {
  if (value >= 10) return 0;
  return value;
}

export function createCard(value: Value, suit: Suit): Card {
  return {
    id: `${value}_${suit}`,
    suit,
    value,
    rank: getCardRank(value, suit),
    envidoValue: getEnvidoValue(value),
    name: `${value} de ${suit}`,
  };
}

/**
 * Returns a new 40-card Spanish deck.
 */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const value of VALUES) {
      deck.push(createCard(value, suit));
    }
  }
  return deck;
}

/**
 * Returns a specific card by value and suit.
 */
export function getCard(value: Value, suit: Suit): Card {
  return createCard(value, suit);
}

/**
 * Compares two cards by rank.
 * @returns 1 if cardA > cardB, -1 if cardA < cardB, 0 if tie.
 */
export function compareCards(cardA: Card, cardB: Card): number {
  if (cardA.rank > cardB.rank) return 1;
  if (cardA.rank < cardB.rank) return -1;
  return 0;
}

/**
 * Calculates Envido score according to Argentine Truco rules:
 * - Cards 10, 11, 12 count as 0.
 * - Cards with matching suits add values + 20.
 * - If 3 cards of same suit, choose top 2.
 * - If no pair of matching suit, highest single card envidoValue is taken.
 */
export function calculateEnvido(cards: Card[]): EnvidoResult {
  if (!cards || cards.length === 0) {
    return { score: 0, cardsUsed: [] };
  }

  // Group cards by suit
  const suitMap = new Map<Suit, Card[]>();
  for (const card of cards) {
    const list = suitMap.get(card.suit) || [];
    list.push(card);
    suitMap.set(card.suit, list);
  }

  let bestPairScore = -1;
  let bestPairCards: Card[] = [];

  for (const [, suitCards] of suitMap.entries()) {
    if (suitCards.length >= 2) {
      // Sort cards of the same suit by envidoValue descending
      const sorted = [...suitCards].sort((a, b) => b.envidoValue - a.envidoValue);
      // Pick top 2 cards for maximum envido
      const top2 = [sorted[0], sorted[1]];
      const pairScore = top2[0].envidoValue + top2[1].envidoValue + 20;

      if (pairScore > bestPairScore) {
        bestPairScore = pairScore;
        bestPairCards = top2;
      }
    }
  }

  // If at least one suit had >= 2 cards, return the best pair
  if (bestPairScore >= 0) {
    return {
      score: bestPairScore,
      cardsUsed: bestPairCards,
    };
  }

  // No pair of matching suits: take the single card with highest envidoValue.
  // In case of tie (e.g. multiple 7s or all 0s), take the one with highest rank.
  let bestSingleCard = cards[0];
  for (let i = 1; i < cards.length; i++) {
    const card = cards[i];
    if (card.envidoValue > bestSingleCard.envidoValue) {
      bestSingleCard = card;
    } else if (card.envidoValue === bestSingleCard.envidoValue && card.rank > bestSingleCard.rank) {
      bestSingleCard = card;
    }
  }

  return {
    score: bestSingleCard.envidoValue,
    cardsUsed: [bestSingleCard],
  };
}

/**
 * Returns a new shuffled copy of the deck using Fisher-Yates algorithm.
 */
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Deals 3 cards each to player and jev (alternating deal), and returns remaining deck.
 */
export function dealHand(deck: Card[]): {
  player: Card[];
  jev: Card[];
  remainingDeck: Card[];
} {
  if (deck.length < 6) {
    throw new Error('Deck must have at least 6 cards to deal a Truco hand');
  }

  return {
    player: [deck[0], deck[2], deck[4]],
    jev: [deck[1], deck[3], deck[5]],
    remainingDeck: deck.slice(6),
  };
}
