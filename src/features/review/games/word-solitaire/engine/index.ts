/**
 * @file index.ts
 * @description 단어 솔리테어 엔진 공개 API — UI·워커는 이 파일만 import 한다
 * @module features/review/games/word-solitaire/engine
 * @dependencies 동일 디렉터리 모듈들
 */
export type {
  CardKind,
  FoundationSlot,
  GeneratedDeal,
  MoveSource,
  MoveTarget,
  SolitaireCard,
  SolitaireCategoryInput,
  SolitaireContent,
  SolitaireDeck,
  SolitaireDifficulty,
  SolitaireLayout,
  SolitaireMove,
  SolitaireState,
  SolveResult,
  TableauColumn,
} from './types'

export {
  DIFFICULTY_PRESETS,
  MAX_CATEGORIES,
  MAX_FOUNDATION_SLOTS,
  MIN_FOUNDATION_SLOTS,
  REFERENCE_TURNS_PER_CARD,
  SOLITAIRE_DIFFICULTIES,
  STAR_TURN_MULTIPLIERS,
  rateTurns,
} from './constants.ts'

export { computeLayout, referenceTurnBudget } from './layout.ts'
export { deriveDealSeed, hashStringToSeed, mixSeed, mulberry32, shuffled } from './random.ts'
export {
  buildDeck,
  cardsOutsideFoundations,
  createInitialState,
  createStateFromLayout,
  hashState,
  isWon,
  totalWordCount,
} from './state.ts'
export { applyMove, describeMove, listLegalMoves } from './moves.ts'
export { heuristic, replay, solve, type SolveOptions } from './solver.ts'
export { generateDeal, generateDealFromDeck, type GenerateDealOptions } from './generate.ts'
