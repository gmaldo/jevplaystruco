import type { Card, Player, RoundWinner, GameScore, TrucoCall, EnvidoCall, CallResponse } from '../truco/types.ts';

/**
 * Question primitives matching TypeSafe AI ("System One") schema
 */
export interface ChoiceQuestion {
  instructions: string;
  criteria: Record<string, string | null>;
}

export interface NoulQuestion {
  instructions: string;
}

export interface ScoreQuestion {
  instructions: string;
  scale?: { min: number; max: number };
}

/**
 * Standard System One wire-format question definition
 */
export interface SystemOneQuestion {
  type: 'choice' | 'noul' | 'score';
  instructions: string;
  criteria?: Record<string, string> | string[];
}

/**
 * Single trick representation on the table
 */
export interface TableTrick {
  trickNumber: 1 | 2 | 3;
  playerCard?: Card;
  jevCard?: Card;
  winner?: RoundWinner;
}

/**
 * Current Truco or Envido bid status
 */
export interface JevBidState {
  type: TrucoCall | EnvidoCall | CallResponse | null;
  offeredBy: Player | null;
  level?: number;
}

/**
 * Complete game state passed to Jev for evaluation
 */
export interface JevState {
  hand: Card[];
  allCardsJev?: Card[];
  round: 1 | 2 | 3;
  tableTricks: TableTrick[];
  currentBid: JevBidState | null;
  score: GameScore;
  mano: Player;
  playerCardOnTable?: Card | null;
  envidoPlayed?: boolean;
  trucoLevel?: 0 | 1 | 2 | 3;
  trucoAccepted?: boolean;
  trucoOfferedBy?: Player | null;
}

export type JevContext = 'play_card' | 'respond_envido' | 'respond_truco' | 'initiate_call';

export interface JevDecisionRequest {
  state: JevState;
  context: JevContext;
}

export interface JevChoiceResult {
  choice: string;
  confidence: number;
}

export interface JevNoulResult {
  probability: number;
}

export interface JevScoreResult {
  score: number;
}

export interface JevDecisionQuestions {
  choices?: Record<string, ChoiceQuestion>;
  nouls?: Record<string, NoulQuestion>;
  scores?: Record<string, ScoreQuestion>;
}

export interface JevDecisionResponse {
  mode: 'live_api' | 'local_simulator';
  latencyMs: number;
  choices: Record<string, JevChoiceResult>;
  nouls: Record<string, JevNoulResult>;
  scores: Record<string, JevScoreResult>;
  decisionSummary: string;
  questions?: JevDecisionQuestions;
  model?: string;
  context?: JevContext;
}
