export type Suit = 'espada' | 'basto' | 'oro' | 'copa';

export type Value = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 10 | 11 | 12;

export interface Card {
  id: string;
  suit: Suit;
  value: Value;
  rank: number;
  envidoValue: number;
  name: string;
}

export type Player = 'player' | 'jev';

export type RoundWinner = 'player' | 'jev' | 'tie';

export interface TrickResult {
  trickNumber: 1 | 2 | 3;
  playerCard: Card;
  jevCard: Card;
  winner: RoundWinner;
}

export interface HandResolution {
  winner: Player | null;
  isFinished: boolean;
  reason: string;
}

export interface EnvidoResult {
  score: number;
  cardsUsed: Card[];
}

export type TrucoCall = 'truco' | 'retruco' | 'vale_cuatro';

export type EnvidoCall = 'envido' | 'real_envido' | 'falta_envido';

export type CallResponse = 'quiero' | 'no_quiero' | 'paso';

export interface HandState {
  mano: Player;
  turno: Player;
  playerCards: Card[];
  jevCards: Card[];
  playedCardsPlayer: Card[];
  playedCardsJev: Card[];
  tricks: TrickResult[];
  roundWinners: RoundWinner[];
  isFinished: boolean;
  winner: Player | null;
  currentTrick: 1 | 2 | 3;
  trucoLevel: 0 | 1 | 2 | 3;
  trucoOfferedBy: Player | null;
  trucoAccepted: boolean;
  envidoPlayed: boolean;
  envidoWinner: Player | null;
  envidoPoints: number;
}

export interface GameScore {
  player: number;
  jev: number;
  target: 15 | 30;
}

export type {
  GamePhase,
  Turn,
  TrucoBid,
  EnvidoBid,
  TableTrick,
  EnvidoState,
  TrucoState,
  GameLogEntry,
  MatchState,
} from './game-machine.ts';

